import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Database Seed...');

  // --- 1. Create Default Director (Super Admin) ---
  const adminPassword = await bcrypt.hash('admin123', 10);

  // We use 'upsert' to prevent "Unique Constraint" errors if the user already exists
  const director = await prisma.user.upsert({
    where: { username: 'director' },
    update: {}, // If user exists, do nothing
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
    },
  });

  console.log('✅ Director Account Ready');
  console.log('   Username: director');
  console.log('   Password: admin123');

  // --- 2. Create a Dummy Student (Optional) ---
  const studentPass = await bcrypt.hash('student123', 10);
  
  const student = await prisma.user.upsert({
    where: { username: 'STU-2026-001' },
    update: {},
    create: {
      username: 'STU-2026-001',
      password: studentPass,
      role: Role.STUDENT,
      studentProfile: {
        create: {
          fullName: 'Rahul Sharma',
          mobile: '9876500001',
          feeAgreed: 50000,
          batch: {
             create: {
               name: 'JEE-11-A',
               startYear: '2026'
             }
          }
        }
      }
    }
  });
  console.log('✅ Dummy Student Ready: STU-2026-001 / student123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });