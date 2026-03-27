import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'AIMS Institute API is running smoothly!';
  }

  // --- CAROUSEL LOGIC ---
  async getCarouselImages() {
    return this.prisma.carouselImage.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async addCarouselImage(data: { imageUrl: string; aspectRatio: string }) {
    return this.prisma.carouselImage.create({
      data: {
        imageUrl: data.imageUrl,
        aspectRatio: data.aspectRatio,
        isActive: true,
      }
    });
  }

  async deleteCarouselImage(id: string) {
    return this.prisma.carouselImage.delete({
      where: { id }
    });
  }
}