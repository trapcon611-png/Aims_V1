import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

const Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private razorpay;
  private readonly logger = new Logger(PaymentService.name);

  constructor(private prisma: PrismaService) {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(amount: number, receiptId: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), 
        currency: 'INR',
        receipt: receiptId,
      };
      
      const order = await this.razorpay.orders.create(options);
      return order; 
    } catch (error) {
      this.logger.error("❌ Razorpay Order Error:", error);
      throw new InternalServerErrorException('Failed to create payment order with Razorpay');
    }
  }

  // UPDATED: Now securely records data to DB upon verification
  async verifyPayment(orderId: string, paymentId: string, signature: string, studentId: string, amount: number) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    const generatedSignature = crypto
      .createHmac('sha256', secret || '')
      .update(orderId + '|' + paymentId)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new BadRequestException('🚨 ALERT: Invalid payment signature detected!');
    }

    // --- SECURE DB RECORDING ---
    // Because the signature matched, we know 100% this payment is real.
    // We record it here on the backend so the frontend can't fake it.
    try {
      const feeRecord = await this.prisma.feeRecord.create({
        data: {
          studentId: studentId,
          amount: Number(amount),
          paymentMode: 'RAZORPAY',
          transactionId: paymentId, // Save the actual Razorpay ID for auditing
          date: new Date(),
          remarks: 'Paid via Parent Portal (Razorpay)',
        }
      });

      this.logger.log(`✅ Payment Verified & Recorded for Student: ${studentId}, Amount: ${amount}`);
      return { success: true, message: 'Payment verified and recorded!', record: feeRecord };
    } catch (dbError) {
      this.logger.error("❌ DB Recording Error:", dbError);
      throw new InternalServerErrorException('Payment successful, but failed to record in database. Please contact admin.');
    }
  }
}