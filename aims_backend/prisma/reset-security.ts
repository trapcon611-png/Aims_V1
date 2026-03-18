import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const newPassword = 'Anand'; // <-- Change this to your desired password
  const targetUsername = 'Anand';          // <-- Change if your admin username is different

  const salt = 10;
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.upsert({
    where: { username: targetUsername },
    update: { 
      password: hashedPassword, 
      visiblePassword: newPassword 
    },
    create: {
      username: targetUsername,
      password: hashedPassword,
      visiblePassword: newPassword,
      role: 'SUPER_ADMIN',
      isActive: true
    }
  });

  console.log(`✅ Success! User '${targetUsername}' has been reset with the new password.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });