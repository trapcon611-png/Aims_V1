import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  
  // 🚀 THE FIX: Pointing exactly to the Docker container name 'aims_whatsapp_service'
  private readonly openWaApiUrl = process.env.OPENWA_API_URL || 'http://aims_whatsapp_service:2785/api';

  constructor(private prisma: PrismaService) {}

  // ✨ NEW: Automatically check/create the session when the backend boots up
  async onModuleInit() {
      this.logger.log(`[WA-INIT] Initializing WhatsApp module. Target API: ${this.openWaApiUrl}`);
      await this.ensureSessionExists('aims-finance');
  }

  // ✨ HELPER: Inject API keys securely into every request
  private getHeaders() {
      return {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.OPENWA_API_KEY || ''
      };
  }

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
  
  @Cron(CronExpression.EVERY_MINUTE)
  async dynamicFeeReminders() {
      const rules = await this.getAutomationRules();
      
      // Force the server to calculate the exact current time in IST (India)
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      
      const currentHours = String(today.getHours()).padStart(2, '0');
      const currentMinutes = String(today.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHours}:${currentMinutes}`;

      // If it is NOT the exact minute the Director requested, sleep.
      if (currentTime !== rules.dispatchTime) return;

      this.logger.log(`[AUTOMATION] Executing WhatsApp Protocol at scheduled time: ${currentTime} IST`);

      // Define target dates based on Director's Rules
      const datesToTarget: string[] = [];

      // Rule 1: First Warning
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

      // Scan the database for pending dues
      const students = await this.prisma.studentProfile.findMany({
          where: { feeAgreed: { gt: 0 } },
          include: { parent: true, feesPaid: true, batch: true }
      });

      // Calculate and Dispatch
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

  // --- 3. SESSION MONITORING & QR ---

  // ✨ HELPER: Ensures session exists on the microservice before querying it
  private async ensureSessionExists(sessionId: string) {
      try {
          const res = await fetch(`${this.openWaApiUrl}/sessions/${sessionId}`, {
              headers: this.getHeaders()
          });
          if (res.status === 404) {
              this.logger.log(`[WA-INIT] Session '${sessionId}' missing in OpenWA. Creating it now...`);
              await fetch(`${this.openWaApiUrl}/sessions`, {
                  method: 'POST',
                  headers: this.getHeaders(),
                  body: JSON.stringify({ sessionId })
              });
              await this.sleep(2000); // Give it time to spin up
          }
      } catch (err) {
          this.logger.error('[WA-INIT] Failed to ensure session exists. Is the container running?', err);
      }
  }

  async getSessionStatus(fallbackSessionId: string = 'aims-finance') {
      try {
          const activeId = await this.getActiveSessionId() || fallbackSessionId;
          await this.ensureSessionExists(activeId); // Pre-flight check
          
          const response = await fetch(`${this.openWaApiUrl}/sessions/${activeId}`, {
              headers: this.getHeaders()
          });
          
          if (!response.ok) {
              this.logger.warn(`[WA-STATUS] OpenWA returned ${response.status}. Check API Key or Network!`);
              return { status: 'disconnected' };
          }
          
          const data = await response.json();
          return { status: data.status || data.state || 'disconnected', data };
      } catch (err) {
          this.logger.error('[WA-STATUS] Error fetching session status', err);
          return { status: 'failed' };
      }
  }

  async getSessionQr(fallbackSessionId: string = 'aims-finance') {
      try {
          const activeId = await this.getActiveSessionId() || fallbackSessionId;
          const response = await fetch(`${this.openWaApiUrl}/sessions/${activeId}/qr`, {
              headers: this.getHeaders()
          });
          
          if (!response.ok) return null;
          
          const data = await response.json();
          return data.qr || data.qrcode || data.data?.qr || null;
      } catch (err) {
          this.logger.error('[WA-QR] Error fetching session QR', err);
          return null;
      }
  }

  // ✨ NEW: Hard-reset the session to generate a fresh QR or force logout
  async resetSession(fallbackSessionId: string = 'aims-finance') {
      try {
          const activeId = await this.getActiveSessionId() || fallbackSessionId;
          this.logger.log(`[WA-RESET] Terminating session: ${activeId}`);

          // 1. Force logout and delete the current session state
          await fetch(`${this.openWaApiUrl}/sessions/${activeId}`, {
              method: 'DELETE',
              headers: this.getHeaders()
          });

          // Wait a moment for the microservice to clear the file system caches
          await this.sleep(2000); 

          // 2. Re-initialize a brand new session
          this.logger.log(`[WA-RESET] Booting fresh session: ${fallbackSessionId}`);
          await fetch(`${this.openWaApiUrl}/sessions`, {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify({ sessionId: fallbackSessionId })
          });

          return { success: true, message: 'Session reset. Fresh QR incoming.' };
      } catch (err) {
          this.logger.error('[WA-RESET] Error resetting session', err);
          throw new Error('Failed to reset WhatsApp session');
      }
  }

  // --- 4. CORE DISPATCHERS ---

  // Dynamically fetches the active session ID from OpenWA
  private async getActiveSessionId(): Promise<string | null> {
      try {
          const res = await fetch(`${this.openWaApiUrl}/sessions`, {
              headers: this.getHeaders()
          });
          
          if (!res.ok) return null;
          
          const data = await res.json();
          const sessions = Array.isArray(data) ? data : (data.data || []);
          
          // Find the session that is actively connected to a phone
          const active = sessions.find((s: any) => s.status === 'READY' || s.status === 'CONNECTED');
          if (active) return active.id || active.sessionId || active.name;
          
          // Fallback: If none say READY, just grab the first one that exists
          if (sessions.length > 0) return sessions[0].id || sessions[0].sessionId || sessions[0].name;
          
          return null;
      } catch (err) {
          this.logger.error('[WA-ERROR] Failed to fetch active sessions from OpenWA', err);
          return null;
      }
  }

  async dispatchOpenWAMessage(mobile: string | undefined, text: string) {
      if (!mobile) return false;
      
      const cleanMobile = mobile.replace(/[^0-9]/g, '').replace(/^91/, '');
      const chatId = `91${cleanMobile}@c.us`; 
      
      try {
          const sessionId = await this.getActiveSessionId();
          
          if (!sessionId) {
              this.logger.error(`[WA-DISPATCH] Aborted! No active OpenWA session found.`);
              return false;
          }

          this.logger.log(`[WA-DISPATCH] Auto-detected Active Session: ${sessionId} | Sending to ${chatId}`);
          
          const response = await fetch(`${this.openWaApiUrl}/sessions/${sessionId}/messages/send-text`, {
              method: 'POST',
              headers: this.getHeaders(),
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