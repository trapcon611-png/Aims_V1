import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  STARTING DATABASE RESET...');

  // --- 1. CLEANUP (Delete in order to avoid Foreign Key errors) ---
  
  // Transactional Data
  await prisma.feeRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.testAttempt.deleteMany();
  
  // Academic Structure
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.notice.deleteMany();
  
  // Profiles (Students first, then Parents/Teachers)
  await prisma.studentProfile.deleteMany();
  await prisma.parentProfile.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.teacherProfile.deleteMany();

  // Master Data
  await prisma.batch.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.expense.deleteMany();

  // Users (Delete ALL to ensure clean state)
  await prisma.user.deleteMany();

  console.log('🗑️  All previous data deleted.');

  // --- 2. RE-CREATE DIRECTOR ---
  
  console.log('🌱 Seeding Director Account...');
  const adminPassword = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
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
    },
  });

  console.log('✅ SYSTEM RESET COMPLETE');
  console.log('👉 Username: director');
  console.log('👉 Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Reset Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });