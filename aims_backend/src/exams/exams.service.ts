import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.exam.findMany({
      orderBy: { scheduledAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: { questions: true },
    });
  }
}