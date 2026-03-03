import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

// We use require for Razorpay to ensure strict compatibility with NestJS
const Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private razorpay;

  constructor() {
    // Initialize Razorpay with your Test Keys from the .env file
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  // 1. CREATE ORDER: Tells Razorpay "Expect a payment of ₹X"
  async createOrder(amount: number, receiptId: string) {
    try {
      const options = {
        amount: Math.round(amount * 100), // Razorpay strictly requires amounts in paise (multiply by 100)
        currency: 'INR',
        receipt: receiptId,
      };
      
      const order = await this.razorpay.orders.create(options);
      return order; // Returns { id: "order_...", amount: ... } to the frontend
    } catch (error) {
      console.error("❌ Razorpay Order Error:", error);
      throw new InternalServerErrorException('Failed to create payment order with Razorpay');
    }
  }

  // 2. VERIFY PAYMENT: Cryptographically checks if the payment was actually successful and not hacked
  async verifyPayment(orderId: string, paymentId: string, signature: string) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    
    // Hash the order ID and payment ID using your secret key
    const generatedSignature = crypto
      .createHmac('sha256', secret || '')
      .update(orderId + '|' + paymentId)
      .digest('hex');

    // If our hash matches Razorpay's hash, the payment is 100% authentic!
    if (generatedSignature !== signature) {
      throw new BadRequestException('🚨 ALERT: Invalid payment signature detected!');
    }

    return { success: true, message: 'Payment cryptographically verified!' };
  }
}