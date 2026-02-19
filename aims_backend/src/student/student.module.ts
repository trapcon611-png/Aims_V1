import { Module } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // Give access to DB
  controllers: [StudentController],
  providers: [StudentService],
})
export class StudentModule {}