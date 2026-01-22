import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Import Prisma

@Module({
  imports: [PrismaModule], // Add Prisma here
  controllers: [ExamsController],
  providers: [ExamsService],
})
export class ExamsModule {}