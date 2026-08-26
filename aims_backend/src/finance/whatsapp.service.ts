import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  
  // Native WhatsApp Engine State
  private client: Client;
  private waStatus: string = 'checking...';
  private currentQrData: string | null = null;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
      this.logger.log(`[WA-NATIVE] Booting built-in WhatsApp Engine...`);
      await this.initializeWhatsappClient();
  }

  // ✨ THE NEW NATIVE ENGINE INITIALIZER
  private async initializeWhatsappClient() {
      this.client = new Client({
          // This saves the session to the volume we mapped in docker-compose
          authStrategy: new LocalAuth({ dataPath: './whatsapp_auth' }), 
          puppeteer: {
              executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
              args: [
                  '--no-sandbox',
                  '--disable-setuid-sandbox',
                  '--disable-dev-shm-usage',
                  '--disable-accelerated-2d-canvas',
                  '--no-first-run',
                  '--no-zygote'
              ]
          }
      });

      this.client.on('qr', async (qr) => {
          this.logger.log('[WA-NATIVE] New QR Code generated. Awaiting scan...');
          // Convert the raw text QR into a base64 image string for the frontend
          this.currentQrData = await qrcode.toDataURL(qr);
          this.waStatus = 'QR_READY';
      });

      this.client.on('ready', () => {
          this.logger.log('[WA-NATIVE] WhatsApp is CONNECTED and READY!');
          this.currentQrData = null; // Clear QR
          this.waStatus = 'CONNECTED';
      });

      this.client.on('authenticated', () => {
          this.logger.log('[WA-NATIVE] Authentication successful.');
          this.waStatus = 'CONNECTED';
      });

      this.client.on('auth_failure', (msg) => {
          this.logger.error('[WA-NATIVE] Authentication failed', msg);
          this.waStatus = 'DISCONNECTED';
      });

      this.client.on('disconnected', (reason) => {
          this.logger.warn('[WA-NATIVE] Client was logged out or disconnected', reason);
          this.waStatus = 'DISCONNECTED';
          this.currentQrData = null;
      });

      // Start the engine
      this.client.initialize().catch(err => {
          this.logger.error('[WA-NATIVE] Failed to initialize client', err);
          this.waStatus = 'DISCONNECTED';
      });
  }

  private sleep(ms: number) { return new Promise(resolve => setTimeout(resolve, ms)); }
  
  private getRandomDelay(minSeconds: number, maxSeconds: number) {
      return Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
  }

  // --- 1. UI CONNECTION ENDPOINTS ---

  async getSessionStatus() {
      return { status: this.waStatus };
  }

  async getSessionQr() {
      return this.currentQrData;
  }

  // Handles the "Generate New QR" button from the frontend
  async resetSession() {
      this.logger.log(`[WA-RESET] Hard resetting WhatsApp native session...`);
      this.waStatus = 'checking...';
      this.currentQrData = null;
      
      try {
          // Destroy current browser instance
          await this.client.destroy();
          await this.sleep(2000);
          
          // Note: In a true production app, you might use fs.rmdirSync to delete 
          // the ./whatsapp_auth folder here to force a clean slate, but destroy() often suffices.
          
          // Reboot
          this.initializeWhatsappClient();
          return { success: true, message: 'Session reset initiated.' };
      } catch (err) {
          this.logger.error('[WA-RESET] Error resetting session', err);
          throw new Error('Failed to reset WhatsApp session');
      }
  }

  // --- 2. AUTOMATION & DISPATCH LOGIC ---

  async getAutomationRules() {
      let rules = await this.prisma.automationSettings.findUnique({ where: { id: 'whatsapp_rules' } });
      if (!rules) {
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

  async dispatchOpenWAMessage(mobile: string | undefined, text: string) {
      if (!mobile) return false;
      
      if (this.waStatus !== 'CONNECTED') {
          this.logger.error(`[WA-DISPATCH] Aborted! Engine is not connected.`);
          return false;
      }

      const cleanMobile = mobile.replace(/[^0-9]/g, '').replace(/^91/, '');
      const chatId = `91${cleanMobile}@c.us`; 
      
      try {
          this.logger.log(`[WA-DISPATCH] Native send to ${chatId}`);
          await this.client.sendMessage(chatId, text);
          return true; 
      } catch (error) {
          this.logger.error(`Failed to send native message to ${mobile}`, error);
          return false;
      }
  }

  async automatedFeeRemindersManual(targets: any[], customText?: string) {
        let successCount = 0;
        let failCount = 0;

        for (const target of targets) {
            const message = customText 
                ? customText 
                : `*AIMS Institute Reminder*\n\nDear Parent of ${target.name},\nThis is a reminder for your pending installment of ₹${target.amount} due on ${new Date(target.date).toLocaleDateString()}.\n\nRegards,\nAIMS Admin`;
            
            const isSuccess = await this.dispatchOpenWAMessage(target.mobile, message);
            
            if (isSuccess) successCount++;
            else failCount++;

            if (isSuccess && (successCount + failCount) < targets.length) {
                const delay = this.getRandomDelay(4, 9);
                this.logger.log(`[STEALTH] Waiting ${delay / 1000} seconds before next message...`);
                await this.sleep(delay);
            }
        }

        return { success: failCount === 0, dispatched: successCount, failed: failCount };
    }

  // --- Cron Scheduler ---
  @Cron(CronExpression.EVERY_MINUTE)
  async dynamicFeeReminders() {
      // (This contains the exact same automated time-checking logic you already had)
      const rules = await this.getAutomationRules();
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      
      const currentHours = String(today.getHours()).padStart(2, '0');
      const currentMinutes = String(today.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      if (currentTime !== rules.dispatchTime) return;
      if (this.waStatus !== 'CONNECTED') return;

      this.logger.log(`[AUTOMATION] Executing Native Protocol at ${currentTime} IST`);

      const datesToTarget: string[] = [];
      const warningDate = new Date(today);
      warningDate.setDate(warningDate.getDate() + rules.daysBefore);
      datesToTarget.push(warningDate.toISOString().split('T')[0]);

      if (rules.maxFollowUps >= 2) datesToTarget.push(today.toISOString().split('T')[0]);
      if (rules.maxFollowUps >= 3) {
          const lateDate = new Date(today);
          lateDate.setDate(lateDate.getDate() - 1);
          datesToTarget.push(lateDate.toISOString().split('T')[0]);
      }

      const students = await this.prisma.studentProfile.findMany({
          where: { feeAgreed: { gt: 0 } },
          include: { parent: true, feesPaid: true, batch: true }
      });

      for (const s of students) {
          const totalPaid = s.feesPaid.reduce((acc, curr) => acc + curr.amount, 0);
          let cumulativeInst = 0;
          const schedule = s.installmentSchedule as any; 

          if (schedule && Array.isArray(schedule)) {
              for (const inst of schedule) {
                  cumulativeInst += inst.amount;
                  if (cumulativeInst > totalPaid) {
                      const instDateStr = new Date(inst.dueDate).toISOString().split('T')[0];
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
}