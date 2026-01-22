import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  async admitStudent(data: any) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await this.prisma.$transaction(async (tx) => {
      
      // 1. Create Login Accounts
      const studentUser = await tx.user.create({
        data: { username: data.enrollmentId, password: hashedPassword, role: 'STUDENT' },
      });

      const parentUser = await tx.user.create({
        data: { username: data.parentMobile, password: hashedPassword, role: 'PARENT' },
      });

      // 2. Create Profiles
      await tx.parentProfile.create({
        data: { userId: parentUser.id, mobile: data.parentMobile },
      });

      // 3. Create Student Profile (With Name, Batch, and Total Fee)
      await tx.studentProfile.create({
        data: {
          userId: studentUser.id,
          fullName: data.fullName,      // <--- Student Name
          batchId: data.batchId,        // <--- Batch
          feeAgreed: parseFloat(data.feeAgreed), // <--- Total Fee (e.g. 50000)
        },
      });

      return { msg: "Admission Successful" };
    });
  }
}