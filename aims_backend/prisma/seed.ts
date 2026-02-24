import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  STARTING DATABASE INITIALIZATION / RECOVERY...');

  // --- 1. DATA RECOVERY LOGIC ---
  const backupDir = '/app/backups';
  let backupRestored = false;

  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sql.gz'))
      .map(file => ({ name: file, time: fs.statSync(path.join(backupDir, file)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time); // Gets newest backup first

    if (files.length > 0) {
      const latestBackup = files[0].name;
      console.log(`📦 Found recent backup: ${latestBackup}. Injecting data...`);
      try {
        const dbUrl = process.env.DATABASE_URL || '';
        execSync(`gunzip -c ${path.join(backupDir, latestBackup)} | psql "${dbUrl}"`);
        console.log('✅ Database data restored from backup successfully.');
        backupRestored = true;
      } catch (error) {
        console.error('❌ Failed to inject backup. Proceeding with normal seed.');
      }
    } else {
      console.log('ℹ️ No backup files found. Proceeding with normal seed.');
    }
  }

  // --- 2. CLEANUP (ONLY IF NO BACKUP WAS RESTORED) ---
  if (!backupRestored) {
    console.log('🧹 No backup found. Wiping database for fresh seed...');
    await prisma.feeRecord.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.answer.deleteMany();
    await prisma.testAttempt.deleteMany();
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.notice.deleteMany();
    await prisma.studentProfile.deleteMany();
    await prisma.parentProfile.deleteMany();
    await prisma.questionBank.deleteMany();
    await prisma.teacherProfile.deleteMany();
    await prisma.batch.deleteMany();
    await prisma.enquiry.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.user.deleteMany();
    console.log('🗑️  All previous data deleted.');
  } else {
    console.log('🛡️  Backup restored: Skipping database wipe to protect your data.');
  }

  // --- 3. HASH PASSWORDS ---
  const commonPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // --- 4. ENSURE ADMIN ACCOUNTS ALWAYS EXIST ---
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

  // --- 5. SEED DUMMY DATA (ONLY IF NO BACKUP WAS RESTORED) ---
  if (!backupRestored) {
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

  console.log('✅ SYSTEM READY');
  console.log('------------------------------------------------');
  console.log('👉 Director: director / admin123');
  console.log('👉 Teacher:  teacher / password123');
  if (!backupRestored) {
    console.log('👉 Student:  student01 / password123');
    console.log('👉 Parent:   parent01 / password123');
  }
  console.log('------------------------------------------------');
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });