import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // <-- CRITICAL: Allows DB Access
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService], 
})
export class PaymentModule {}