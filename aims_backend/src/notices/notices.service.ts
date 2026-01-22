import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.notice.create({ data });
  }

  findAll() {
    return this.prisma.notice.findMany({ orderBy: { createdAt: 'desc' } });
  }
}