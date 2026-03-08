import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  STARTING DATABASE INITIALIZATION / RECOVERY...');

  // --- 1. SAFETY CHECK: DOES DATA ALREADY EXIST? ---
  try {
    // We check if the User table has any records. If it does, the DB is populated.
    const userCount = await prisma.user.count();
    
    if (userCount > 0) {
      console.log('\n======================================================');
      console.log('🛑 WARNING: Tables already exist and contain data!');
      console.log('🛑 Backup restore stopped to prevent overwriting your live database.');
      console.log('======================================================\n');
      return; // Stops the script completely so no data is harmed
    }
  } catch (e) {
    console.log('ℹ️  Database appears to be completely empty. Proceeding...');
  }

  // --- 2. DATA RECOVERY LOGIC (ONLY RUNS IF DB IS EMPTY) ---
  const backupDir = '/app/backups';
  let backupRestored = false;

  console.log(`🔍 Checking for backups inside container at: ${backupDir}`);

  if (fs.existsSync(backupDir)) {
    const allFiles = fs.readdirSync(backupDir);

    // Filter for valid sql files, get their modification times, and sort newest to oldest
    const files = allFiles
      .filter(file => file.endsWith('.sql.gz') || file.endsWith('.sql'))
      .map(file => ({ name: file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // b - a ensures the Newest file is at index 0

    if (files.length > 0) {
      // Because we sorted b.time - a.time, index [0] is ALWAYS the most recent backup
      const mostRecentBackup = files[0].name;
      console.log(`📦 Found backups! Selecting the most recent one: ${mostRecentBackup}. Injecting data...`);
      
      try {
        const rawUrl = process.env.DATABASE_URL || '';
        // CRITICAL FIX: psql crashes if '?schema=public' is attached. We MUST strip it.
        const cleanDbUrl = rawUrl.split('?')[0]; 
        const fullPath = path.join(backupDir, mostRecentBackup);

        console.log(`⏳ Running restoration command...`);
        
        // Added -q to suppress noisy logs, but will still throw actual fatal errors
        if (mostRecentBackup.endsWith('.gz')) {
            execSync(`gunzip -c "${fullPath}" | psql "${cleanDbUrl}" -q`, { stdio: 'inherit' });
        } else {
            execSync(`psql "${cleanDbUrl}" -q < "${fullPath}"`, { stdio: 'inherit' });
        }
        
        console.log('\n✅ Database data restored from backup successfully.');
        backupRestored = true;
      } catch (error: any) {
        console.error('\n❌ Failed to inject backup. Error Details:');
        console.error(error.message);
        console.log('Proceeding with normal dummy seed...');
      }
    } else {
      console.log('ℹ️ No valid .sql or .sql.gz backup files found in the directory.');
    }
  } else {
    console.log(`ℹ️ Backup directory ${backupDir} does not exist inside the container.`);
  }

  // --- 3. SEED DUMMY DATA (ONLY IF DB WAS EMPTY AND NO BACKUP WAS FOUND) ---
  if (!backupRestored) {
    console.log('🌱 No backup restored. Generating dummy data...');
    
    const commonPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('admin123', 10);

    console.log('🌱 Verifying/Seeding Director Account...');
    await prisma.user.upsert({
      where: { username: 'director' },
      update: { password: adminPassword },
      create: {
        username: 'director',
        password: adminPassword,
        role: Role.SUPER_ADMIN,
        isActive: true,
        teacherProfile: {
          create: {
            fullName: 'Institute Director',
            email: 'director@aims.edu',
            mobile: '9999999999',
            qualification: 'Administrator',
            subject: 'Management'
          }
        }
      }
    });

    console.log('🌱 Verifying/Seeding Academic Admin...');
    await prisma.user.upsert({
      where: { username: 'teacher' },
      update: { password: commonPassword },
      create: {
        username: 'teacher',
        password: commonPassword,
        role: Role.TEACHER,
        isActive: true,
        teacherProfile: {
          create: {
            fullName: 'Rahul Sir (Physics)',
            email: 'rahul@aims.edu',
            mobile: '9876543210',
            qualification: 'M.Sc Physics',
            subject: 'PHYSICS'
          }
        }
      }
    });

    console.log('🌱 Seeding Batch...');
    const batch = await prisma.batch.create({
      data: { name: 'JEE Droppers 2026', startYear: '2025', strength: 60, fee: 150000 }
    });

    console.log('🌱 Seeding Parent...');
    const parentUser = await prisma.user.create({
      data: {
        username: 'parent01', password: commonPassword, visiblePassword: 'password123',
        role: Role.PARENT, isActive: true,
        parentProfile: { create: { mobile: '9000012345', isMobileVisible: true } }
      },
      include: { parentProfile: true }
    });

    if (!parentUser.parentProfile) throw new Error("Failed to create parent profile");

    console.log('🌱 Seeding Student...');
    await prisma.user.create({
      data: {
        username: 'student01', password: commonPassword, visiblePassword: 'password123',
        role: Role.STUDENT, isActive: true,
        studentProfile: {
          create: {
            fullName: 'Arjun Sharma', mobile: '7000012345', address: '123, Gandhi Nagar, Mumbai',
            batchId: batch.id, parentId: parentUser.parentProfile.id, 
            feeAgreed: 150000, installments: 3,
            installmentSchedule: [
              { id: 1, amount: 50000, dueDate: new Date().toISOString().split('T')[0] },
              { id: 2, amount: 50000, dueDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0] },
              { id: 3, amount: 50000, dueDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0] }
            ]
          }
        }
      }
    });
  }

  console.log('\n✅ SYSTEM READY');
  console.log('------------------------------------------------');
  if (!backupRestored) {
    console.log('👉 Director: director / admin123');
    console.log('👉 Teacher:  teacher / password123');
    console.log('👉 Student:  student01 / password123');
    console.log('👉 Parent:   parent01 / password123');
  } else {
    console.log('👉 Backup successfully restored!');
    console.log('👉 Use your real, live account credentials to log in.');
  }
  console.log('------------------------------------------------');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });