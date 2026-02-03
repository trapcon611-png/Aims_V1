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

  // --- 2. HASH PASSWORDS ---
  const commonPassword = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // --- 3. RE-CREATE DIRECTOR ---
  console.log('🌱 Seeding Director Account...');
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

  // --- 4. CREATE ACADEMIC ADMIN (TEACHER) ---
  console.log('🌱 Seeding Academic Admin...');
  await prisma.user.create({
    data: {
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

  // --- 5. CREATE BATCH ---
  console.log('🌱 Seeding Batch...');
  const batch = await prisma.batch.create({
    data: {
      name: 'JEE Droppers 2026',
      startYear: '2025',
      strength: 60,
      fee: 150000
    }
  });

  // --- 6. CREATE PARENT ---
  console.log('🌱 Seeding Parent...');
  const parentUser = await prisma.user.create({
    data: {
      username: 'parent01',
      password: commonPassword,
      visiblePassword: 'password123',
      role: Role.PARENT,
      isActive: true,
      parentProfile: {
        create: {
          mobile: '9000012345',
          isMobileVisible: true
        }
      }
    },
    include: { // <--- Added this to return the profile
      parentProfile: true
    }
  });

  if (!parentUser.parentProfile) {
      throw new Error("Failed to create parent profile");
  }

  // --- 7. CREATE STUDENT ---
  console.log('🌱 Seeding Student...');
  await prisma.user.create({
    data: {
      username: 'student01',
      password: commonPassword,
      visiblePassword: 'password123',
      role: Role.STUDENT,
      isActive: true,
      studentProfile: {
        create: {
          fullName: 'Arjun Sharma',
          mobile: '7000012345',
          address: '123, Gandhi Nagar, Mumbai',
          batchId: batch.id,
          parentId: parentUser.parentProfile.id, 
          // Fee Details
          feeAgreed: 150000,
          installments: 3,
          installmentSchedule: [
            { id: 1, amount: 50000, dueDate: new Date().toISOString().split('T')[0] },
            { id: 2, amount: 50000, dueDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0] }, // +30 days
            { id: 3, amount: 50000, dueDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0] }  // +60 days
          ]
        }
      }
    }
  });

  console.log('✅ SYSTEM RESET & POPULATION COMPLETE');
  console.log('------------------------------------------------');
  console.log('👉 Director: director / admin123');
  console.log('👉 Teacher:  teacher / password123');
  console.log('👉 Student:  student01 / password123');
  console.log('👉 Parent:   parent01 / password123');
  console.log('------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Reset Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });