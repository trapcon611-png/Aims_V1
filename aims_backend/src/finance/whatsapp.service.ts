import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  
  // Connects to your OpenWA microservice
  // Overriding any wrong .env variable to force the correct Docker network port
  private readonly openWaApiUrl = 'http://aims_whatsapp_service:2785/api';

  constructor(private prisma: PrismaService) {}
  
  // HELPER: Simulates human typing delay
  private sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // HELPER: Generates a random delay between min and max seconds
  private getRandomDelay(minSeconds: number, maxSeconds: number) {
      const ms = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
      return ms;
  }

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
  
  // --- 2. DYNAMIC AUTOMATION ENGINE (Runs every 60 seconds) ---
  
  @Cron(CronExpression.EVERY_MINUTE)
  async dynamicFeeReminders() {
      const rules = await this.getAutomationRules();
      
      // ✨ THE FIX: Force the server to calculate the exact current time in IST (India)
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      
      const currentHours = String(today.getHours()).padStart(2, '0');
      const currentMinutes = String(today.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      // 2. If it is NOT the exact minute the Director requested, sleep.
      if (currentTime !== rules.dispatchTime) return;

      this.logger.log(`[AUTOMATION] Executing WhatsApp Protocol at scheduled time: ${currentTime} IST`);

      // 3. Define target dates based on Director's Rules
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

  // --- 3. CORE DISPATCHERS ---
  
  
  // --- 3. CORE DISPATCHERS ---

  // ✨ NEW HELPER: Dynamically fetches the active session ID from OpenWA
  private async getActiveSessionId(): Promise<string | null> {
      try {
          const res = await fetch(`${this.openWaApiUrl}/sessions`, {
              headers: { 'X-API-Key': process.env.OPENWA_API_KEY || '' }
          });
          
          if (!res.ok) return null;
          
          const data = await res.json();
          // OpenWA might return an array directly, or wrap it in { data: [...] }
          const sessions = Array.isArray(data) ? data : (data.data || []);
          
          // Find the session that is actively connected to a phone
          const active = sessions.find((s: any) => s.status === 'READY' || s.status === 'CONNECTED');
          
          if (active) {
              return active.id || active.sessionId || active.name;
          }
          
          // Fallback: If none say READY, just grab the first one that exists
          if (sessions.length > 0) {
              return sessions[0].id || sessions[0].sessionId || sessions[0].name;
          }
          
          return null;
      } catch (err) {
          this.logger.error('[WA-ERROR] Failed to fetch active sessions from OpenWA', err);
          return null;
      }
  }

  // UPDATED DISPATCHER: Now 100% Dynamic!
  async dispatchOpenWAMessage(mobile: string | undefined, text: string) {
      if (!mobile) return false;
      
      const cleanMobile = mobile.replace(/[^0-9]/g, '').replace(/^91/, '');
      const chatId = `91${cleanMobile}@c.us`; 
      
      try {
          // ✨ STEP 1: Ask OpenWA for the current active Session ID
          const sessionId = await this.getActiveSessionId();
          
          if (!sessionId) {
              this.logger.error(`[WA-DISPATCH] Aborted! No active OpenWA session found.`);
              return false;
          }

          this.logger.log(`[WA-DISPATCH] Auto-detected Active Session: ${sessionId}`);
          this.logger.log(`[WA-DISPATCH] Sending to ${chatId}`);
          
          // ✨ STEP 2: Send the message using the dynamic ID
          const response = await fetch(`${this.openWaApiUrl}/sessions/${sessionId}/messages/send-text`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'X-API-Key': process.env.OPENWA_API_KEY || '' 
              },
              body: JSON.stringify({
                  chatId: chatId,
                  text: text
              })
          });

          if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              this.logger.warn(`[WA-WARNING] OpenWA returned status ${response.status}`);
              this.logger.warn(`[WA-WARNING] OpenWA raw error: ${JSON.stringify(errData)}`);
              return false; 
          }

          this.logger.log(`[WA-DISPATCH] Successfully sent to ${chatId}`);
          return true; 
          
      } catch (error) {
          this.logger.error(`Failed to reach OpenWA for ${mobile}`, error);
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
            
            // ✨ We now wait to see if it actually returned true or false!
            const isSuccess = await this.dispatchOpenWAMessage(target.mobile, message);
            
            if (isSuccess) {
                successCount++;
            } else {
                failCount++;
            }

            // STEALTH MODE: Only pause if it actually sent successfully and there are more to send
            if (isSuccess && (successCount + failCount) < targets.length) {
                const delay = this.getRandomDelay(4, 9);
                this.logger.log(`[STEALTH] Waiting ${delay / 1000} seconds before next message...`);
                await this.sleep(delay);
            }
        }

        // Return the REAL numbers to your frontend
        return { 
            success: failCount === 0, 
            dispatched: successCount,
            failed: failCount 
        };
    }
}