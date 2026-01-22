import { prisma } from './src/prisma/prisma-client';
import prompts from 'prompts';

async function main() {
  console.log('=== Add New Student ===\n');

  const userResponse = await prompts([
    {
      type: 'text',
      name: 'username',
      message: 'Enter username (enrollment ID):',
      validate: (value) => value.length > 0 ? true : 'Username is required',
    },
    {
      type: 'password',
      name: 'password',
      message: 'Enter password:',
      validate: (value) => value.length >= 6 ? true : 'Password must be at least 6 characters',
    },
    {
      type: 'text',
      name: 'fullName',
      message: 'Enter full name:',
      validate: (value) => value.length > 0 ? true : 'Full name is required',
    },
    {
      type: 'text',
      name: 'mobile',
      message: 'Enter mobile number (optional):',
    },
  ]);

  if (!userResponse.username) {
    console.log('Operation cancelled.');
    return;
  }

  try {
    // Create user and student profile in a transaction
    const result = await prisma.user.create({
      data: {
        username: userResponse.username,
        password: userResponse.password, // In production, hash this!
        role: 'STUDENT',
        studentProfile: {
          create: {
            fullName: userResponse.fullName,
            mobile: userResponse.mobile || null,
          },
        },
      },
      include: {
        studentProfile: true,
      },
    });

    console.log('\n✅ Student created successfully!');
    console.log(`ID: ${result.id}`);
    console.log(`Username: ${result.username}`);
    console.log(`Full Name: ${result.studentProfile?.fullName}`);
  } catch (error: any) {
    console.error('\n❌ Error creating student:');
    if (error.code === 'P2002') {
      console.error('Username already exists. Please choose a different username.');
    } else {
      console.error(error.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
