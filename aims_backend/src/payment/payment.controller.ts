import { Controller, Post, Body } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Endpoint: POST /payment/create-order
  @Post('create-order')
  async createOrder(@Body() body: { amount: number; receiptId: string }) {
    return this.paymentService.createOrder(body.amount, body.receiptId);
  }

  // Endpoint: POST /payment/verify
  @Post('verify')
  async verifyPayment(
    @Body() body: { razorpayOrderId: string; razorpayPaymentId: string; signature: string }
  ) {
    return this.paymentService.verifyPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.signature
    );
  }
}