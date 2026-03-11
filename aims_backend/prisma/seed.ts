import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Hardcoded Master IDs for consistent Security Panel access
const MASTER_IDS = {
  SECURITY_ADMIN: '00000000-0000-0000-0000-000000000001',
  DIRECTOR: '00000000-0000-0000-0000-000000000002',
  TEACHER: '00000000-0000-0000-0000-000000000003',
};

async function main() {
  console.log('⚠️  STARTING DATABASE INITIALIZATION / RECOVERY...');

  // --- 1. CHECK IF DATABASE IS EMPTY ---
  let isDatabaseEmpty = true;
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      isDatabaseEmpty = false;
    }
  } catch (e) {
    isDatabaseEmpty = true;
  }

  let backupRestored = false;

  // --- 2. DATA RECOVERY LOGIC (ONLY RUNS IF DB IS EMPTY) ---
  if (isDatabaseEmpty) {
    const backupDir = '/app/backups';
    console.log(`🔍 Checking for backups inside container at: ${backupDir}`);

    if (fs.existsSync(backupDir)) {
      const allFiles = fs.readdirSync(backupDir);
      const files = allFiles
        .filter(file => file.endsWith('.sql.gz') || file.endsWith('.sql'))
        .map(file => ({ name: file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 0) {
        const mostRecentBackup = files[0].name;
        console.log(`📦 Selecting the most recent backup: ${mostRecentBackup}. Injecting data...`);
        try {
          const rawUrl = process.env.DATABASE_URL || '';
          const cleanDbUrl = rawUrl.split('?')[0]; 
          const fullPath = path.join(backupDir, mostRecentBackup);

          if (mostRecentBackup.endsWith('.gz')) {
              execSync(`gunzip -c "${fullPath}" | psql "${cleanDbUrl}" -q`, { stdio: 'inherit' });
          } else {
              execSync(`psql "${cleanDbUrl}" -q < "${fullPath}"`, { stdio: 'inherit' });
          }
          console.log('\n✅ Database data restored from backup successfully.');
          backupRestored = true;
        } catch (error: any) {
          console.error('\n❌ Failed to inject backup. Error Details:', error.message);
        }
      } else {
        console.log('ℹ️ No valid backup files found.');
      }
    } else {
      console.log(`ℹ️ Backup directory ${backupDir} does not exist.`);
    }

    // --- 3. SEED DUMMY DATA (ONLY IF DB WAS EMPTY AND NO BACKUP WAS FOUND) ---
    if (!backupRestored) {
      console.log('🌱 No backup restored. Generating dummy data...');
      
      const commonPassword = await bcrypt.hash('password123', 10);
      
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

      console.log('🌱 Seeding Student...');
      if (parentUser.parentProfile) {
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
    }
  } else {
    console.log('\n======================================================');
    console.log('🛑 WARNING: Tables already exist and contain data!');
    console.log('🛑 Backup restore stopped to prevent overwriting your live database.');
    console.log('======================================================\n');
  }

  // --- 4. ENSURE MASTER ACCOUNTS ALWAYS EXIST (RUNS EVERY TIME) ---
  console.log('\n🔐 Ensuring all Master Admin accounts are active...');
  console.log('ℹ️  If a backup was restored or data exists, existing IDs are kept. Otherwise, default IDs are injected.');
  
  const commonPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);
  const securityPassword = await bcrypt.hash('secure_master_key', 10);

  // 1. The Super Secret Backdoor (Used for the Security Panel)
  await prisma.user.upsert({
    where: { username: 'security_admin' },
    update: { password: securityPassword, role: Role.SUPER_ADMIN, isActive: true },
    create: {
      id: MASTER_IDS.SECURITY_ADMIN,
      username: 'security_admin',
      password: securityPassword,
      visiblePassword: 'secure_master_key',
      role: Role.SUPER_ADMIN,
      isActive: true,
    }
  });

  // 2. The Director Account
  await prisma.user.upsert({
    where: { username: 'director' },
    update: { password: adminPassword, role: Role.SUPER_ADMIN, isActive: true },
    create: {
      id: MASTER_IDS.DIRECTOR,
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

  // 3. The Academic Admin Account
  await prisma.user.upsert({
    where: { username: 'teacher' },
    update: { password: commonPassword, role: Role.TEACHER, isActive: true },
    create: {
      id: MASTER_IDS.TEACHER,
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

  console.log('\n✅ SYSTEM READY');
  console.log('------------------------------------------------');
  console.log('🛡️  Master Security: security_admin / secure_master_key');
  console.log('👉 Director: director / admin123');
  console.log('👉 Teacher:  teacher / password123');
  if (isDatabaseEmpty && !backupRestored) {
    console.log('👉 Student:  student01 / password123');
    console.log('👉 Parent:   parent01 / password123');
  }
  console.log('------------------------------------------------\n');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });