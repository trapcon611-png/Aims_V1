import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  create(data: any) {
    return this.prisma.resource.create({ data });
  }

  // Fetch resources for a specific batch (or global ones)
  findByBatch(batchId: string) {
    return this.prisma.resource.findMany({
      where: { OR: [{ batchId: batchId }, { batchId: null }] },
      orderBy: { createdAt: 'desc' }
    });
  }
}