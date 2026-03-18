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

  async createOrder(amount: number, receiptId: string, studentId?: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), 
        currency: 'INR',
        receipt: receiptId,
        notes: {
          // 🚨 Attach studentId so the Webhook knows who to credit later!
          studentId: studentId || receiptId 
        }
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
    try {
      // Prevent double-recording if the Webhook already caught it
      const existing = await this.prisma.feeRecord.findFirst({ where: { transactionId: paymentId } });
      if (existing) {
         return { success: true, message: 'Payment already recorded by webhook!', record: existing };
      }

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

  // 🚨 NEW: Webhook Background Verification (Ghost Payment Protection)
  async processWebhook(body: any, signature: string) {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        this.logger.warn('Webhook secret is not defined in .env file! Ignoring webhook.');
        return;
    }

    // Verify it actually came from Razorpay
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(body)).digest('hex');

    if (expectedSignature !== signature) {
      this.logger.error('🚨 Invalid Webhook Signature - Possible unauthorized ping.');
      throw new BadRequestException('Invalid signature');
    }

    // If it's a successful payment...
    if (body.event === 'payment.captured') {
      const payment = body.payload.payment.entity;
      const studentId = payment.notes?.studentId; // Read the ID we injected during createOrder
      const amount = payment.amount / 100; // Convert from paise back to INR

      if (studentId) {
        // Check if the browser already recorded it
        const existing = await this.prisma.feeRecord.findFirst({ where: { transactionId: payment.id } });
        
        if (!existing) {
          await this.prisma.feeRecord.create({
            data: {
              studentId: studentId,
              amount: amount,
              paymentMode: 'RAZORPAY_WEBHOOK',
              transactionId: payment.id,
              remarks: 'Online Payment (Auto-captured via Webhook)',
              date: new Date()
            }
          });
          this.logger.log(`✅ Webhook: Fee of ₹${amount} securely recorded for student ${studentId}`);
        } else {
          this.logger.log(`ℹ️ Webhook: Fee already recorded by browser for ${payment.id}. Skipping duplicate.`);
        }
      } else {
          this.logger.warn(`⚠️ Webhook: Payment ${payment.id} captured, but no studentId found in notes!`);
      }
    }
  }
}