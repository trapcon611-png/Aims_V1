import { Module } from '@nestjs/common';
import { ErpService } from './erp.service';
import { ErpController } from './erp.controller';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path if needed

@Module({
  controllers: [ErpController],
  providers: [ErpService, PrismaService],
})
export class ErpModule {}