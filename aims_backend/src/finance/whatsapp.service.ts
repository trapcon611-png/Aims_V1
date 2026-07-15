import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  
  // Connects to your OpenWA microservice
  private readonly openWaApiUrl = process.env.OPENWA_API_URL || 'http://openwa:2785/api';

  constructor(private prisma: PrismaService) {}

  // --- 1. AUTOMATION RULE MANAGEMENT ---
  
  async getAutomationRules() {
      let rules = await this.prisma.automationSettings.findUnique({ where: { id: 'whatsapp_rules' } });
      if (!rules) {
          // Fallback to safe defaults if the database is empty
          rules = await this.prisma.automationSettings.create({ 
              data: { id: 'whatsapp_rules', dispatchTime: "09:00", daysBefore: 3, maxFollowUps: 2 } 
          });
      }
      return rules;
  }

  async updateAutomationRules(data: { time: string, daysBefore: number, maxFollowUps: number }) {
      return this.prisma.automationSettings.upsert({
          where: { id: 'whatsapp_rules' },
          update: { dispatchTime: data.time, daysBefore: data.daysBefore, maxFollowUps: data.maxFollowUps },
          create: { id: 'whatsapp_rules', dispatchTime: data.time, daysBefore: data.daysBefore, maxFollowUps: data.maxFollowUps }
      });
  }

  // --- 2. DYNAMIC AUTOMATION ENGINE (Runs every 60 seconds) ---
  
  @Cron(CronExpression.EVERY_MINUTE)
  async dynamicFeeReminders() {
      const rules = await this.getAutomationRules();
      
      // 1. Get current server time in HH:MM format
      const now = new Date();
      const currentHours = String(now.getHours()).padStart(2, '0');
      const currentMinutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      // 2. If it is NOT the exact minute the Director requested, sleep.
      if (currentTime !== rules.dispatchTime) return;

      this.logger.log(`[AUTOMATION] Executing WhatsApp Protocol at scheduled time: ${currentTime}`);

      // 3. Define target dates based on Director's Rules
      const today = new Date();
      const datesToTarget: string[] = [];

      // Rule 1: First Warning (e.g., 3 days from now)
      const warningDate = new Date(today);
      warningDate.setDate(warningDate.getDate() + rules.daysBefore);
      datesToTarget.push(warningDate.toISOString().split('T')[0]);

      // Rule 2: Follow Up (On the actual Due Date)
      if (rules.maxFollowUps >= 2) {
          datesToTarget.push(today.toISOString().split('T')[0]);
      }

      // Rule 3: Escalation (1 Day Overdue/Late)
      if (rules.maxFollowUps >= 3) {
          const lateDate = new Date(today);
          lateDate.setDate(lateDate.getDate() - 1);
          datesToTarget.push(lateDate.toISOString().split('T')[0]);
      }

      // 4. Scan the database for pending dues
      const students = await this.prisma.studentProfile.findMany({
          where: { feeAgreed: { gt: 0 } },
          include: { parent: true, feesPaid: true, batch: true }
      });

      // 5. Calculate and Dispatch
      for (const s of students) {
          const totalPaid = s.feesPaid.reduce((acc, curr) => acc + curr.amount, 0);
          let cumulativeInst = 0;
          const schedule = s.installmentSchedule as any; 

          if (schedule && Array.isArray(schedule)) {
              for (const inst of schedule) {
                  cumulativeInst += inst.amount;
                  
                  // If this installment is not fully paid
                  if (cumulativeInst > totalPaid) {
                      const instDateStr = new Date(inst.dueDate).toISOString().split('T')[0];
                      
                      // If this installment's due date matches ANY of our active target rules
                      if (datesToTarget.includes(instDateStr)) {
                          const amountDue = cumulativeInst - Math.max(totalPaid, cumulativeInst - inst.amount);
                          
                          let urgency = "Update";
                          if (instDateStr === today.toISOString().split('T')[0]) urgency = "URGENT";
                          else if (instDateStr < today.toISOString().split('T')[0]) urgency = "OVERDUE";

                          const message = `*AIMS Institute ${urgency}*\n\nDear Parent,\nThis is an automated reminder that an installment of *₹${amountDue}* for ${s.fullName} (${s.batch?.name || 'Assigned Batch'}) is due on *${new Date(inst.dueDate).toLocaleDateString()}*.\n\nPlease ensure timely payment to avoid late penalties.\n\nRegards,\nAIMS Administration`;
                          
                          await this.dispatchOpenWAMessage(s.parent?.mobile, message);
                      }
                  }
              }
          }
      }
  }

  // --- 3. CORE DISPATCHERS ---
  
  async dispatchOpenWAMessage(mobile: string | undefined, text: string) {
      if (!mobile) return;
      
      // OpenWA format requirement
      const chatId = `91${mobile}@c.us`;
      
      try {
          this.logger.log(`[WA-DISPATCH] Sending to ${chatId}`);
          await fetch(`${this.openWaApiUrl}/sendText`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENWA_API_KEY}`
              },
              body: JSON.stringify({
                  chatId: chatId,
                  text: text,
                  session: "aims-finance" 
              })
          });
      } catch (error) {
          this.logger.error(`Failed to send WA message to ${mobile}`, error);
      }
  }

  async automatedFeeRemindersManual(targets: any[], customText?: string) {
      for (const target of targets) {
          const message = customText 
              ? customText 
              : `*AIMS Institute Reminder*\n\nDear Parent of ${target.name},\nThis is a reminder for your pending installment of ₹${target.amount} due on ${new Date(target.date).toLocaleDateString()}.\n\nRegards,\nAIMS Admin`;
          
          await this.dispatchOpenWAMessage(target.mobile, message);
      }
      return { success: true, dispatched: targets.length };
  }
}