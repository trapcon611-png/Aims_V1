import { Controller, Post, Body, UseGuards, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // Secure this route for logged-in users only
  @UseGuards(AuthGuard('jwt'))
  @Post('create-order')
  async createOrder(@Body() body: { amount: number; receiptId: string; studentId?: string }) {
    return this.paymentService.createOrder(body.amount, body.receiptId, body.studentId);
  }

  // Secure this route for logged-in users only
  @UseGuards(AuthGuard('jwt'))
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

  // 🚨 PUBLIC ROUTE: Razorpay Webhook (No JWT Guard here!)
  // Secured via the cryptographic signature sent in the headers
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() body: any, 
    @Headers('x-razorpay-signature') signature: string
  ) {
    await this.paymentService.processWebhook(body, signature);
    return { status: 'ok' };
  }
}