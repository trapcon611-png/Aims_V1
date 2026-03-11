import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payment')
@UseGuards(AuthGuard('jwt')) // Secures the endpoints
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  async createOrder(@Body() body: { amount: number; receiptId: string }) {
    return this.paymentService.createOrder(body.amount, body.receiptId);
  }

  @Post('verify')
  async verifyPayment(
    @Body() body: { 
      razorpayOrderId: string; 
      razorpayPaymentId: string; 
      signature: string;
      studentId: string; // Needed to record the fee
      amount: number;    // Needed to record the fee
    }
  ) {
    return this.paymentService.verifyPayment(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.signature,
      body.studentId,
      body.amount
    );
  }
}