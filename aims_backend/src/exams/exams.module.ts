import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService], // Export service for use in other modules
})
export class ExamsModule {}