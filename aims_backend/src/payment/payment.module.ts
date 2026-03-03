import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';

@Module({
  providers: [PaymentService],
  controllers: [PaymentController],
  exports: [PaymentService], // Exported in case other backend modules need to process payments
})
export class PaymentModule {}