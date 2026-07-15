import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  
  // Replace with actual OpenWA container URL once deployed
  private readonly openWaApiUrl = process.env.OPENWA_API_URL || 'http://openwa:3000/api';

  constructor(private prisma: PrismaService) {}

  /**
   * DRY-RUN: Automatically runs every morning at 9:00 AM
   * Scans for installments due in exactly 3 days and dispatches messages.
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async automatedFeeReminders() {
    this.logger.log('Starting automated WhatsApp fee reminder scan...');
    
    // 1. Fetch all students with pending fees
    const students = await this.prisma.studentProfile.findMany({
      where: { feeAgreed: { gt: 0 } },
      include: { parent: true, feesPaid: true, batch: true }
    });

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const targetDateStr = threeDaysFromNow.toISOString().split('T')[0];

    // 2. Map and identify due targets
    for (const s of students) {
        const totalPaid = s.feesPaid.reduce((acc, curr) => acc + curr.amount, 0);
        let cumulativeInst = 0;
        
        // ✨ FIX: Tell TypeScript this is specifically an array of objects
        const schedule = s.installmentSchedule as any; 

        if (schedule && Array.isArray(schedule)) {
            for (const inst of schedule) {
                cumulativeInst += inst.amount;
                
                // If this installment is not fully paid yet
                if (cumulativeInst > totalPaid) {
                    const instDateStr = new Date(inst.dueDate).toISOString().split('T')[0];
                    
                    // If due date is exactly 3 days away
                    if (instDateStr === targetDateStr) {
                        const amountDue = cumulativeInst - Math.max(totalPaid, cumulativeInst - inst.amount);
                        
                        const message = `*AIMS Institute Update*\n\nDear Parent,\nThis is a gentle reminder that an installment of *₹${amountDue}* for ${s.fullName} (${s.batch?.name}) is due on *${new Date(inst.dueDate).toLocaleDateString()}*.\n\nPlease ensure timely payment to avoid late penalties.\n\nRegards,\nAIMS Administration`;
                        
                        // DRY RUN: Fire to OpenWA
                        await this.dispatchOpenWAMessage(s.parent?.mobile, message);
                    }
                }
            }
        }
    }
  }

  /**
   * Core dispatcher to OpenWA API
   */
  async dispatchOpenWAMessage(mobile: string | undefined, text: string) {
    if (!mobile) return;
    
    // OpenWA requires numbers in the format 919876543210@c.us
    const chatId = `91${mobile}@c.us`;
    
    try {
        this.logger.log(`[DRY-RUN] Sending WA to ${chatId}: ${text.substring(0, 30)}...`);
        
         
        await fetch(`${this.openWaApiUrl}/sendText`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENWA_API_KEY}`
            },
            body: JSON.stringify({
                chatId: chatId,
                text: text,
                session: "aims-finance" // Your session name in OpenWA
            })
        });
        
    } catch (error) {
        this.logger.error(`Failed to send WA message to ${mobile}`, error);
    }
  }
  async automatedFeeRemindersManual(targets: any[]) {
      for (const target of targets) {
          const message = `*AIMS Institute Reminder*\n\nDear Parent of ${target.name},\nThis is a reminder for your pending installment of ₹${target.amount} due on ${new Date(target.date).toLocaleDateString()}.\n\nRegards,\nAIMS Admin`;
          await this.dispatchOpenWAMessage(target.mobile, message);
      }
      return { success: true, dispatched: targets.length };
  }
}
