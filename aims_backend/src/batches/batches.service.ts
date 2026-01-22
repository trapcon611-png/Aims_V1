import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  create(name: string) {
    return this.prisma.batch.create({ data: { name } });
  }

  findAll() {
    return this.prisma.batch.findMany({ include: { students: true } });
  }
}