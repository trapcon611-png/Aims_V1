import { Injectable, ForbiddenException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentService {
  private readonly logger = new Logger(ParentService.name);

  constructor(private prisma: PrismaService) {}

  async getParentSummary(userId: string) {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: { 
        children: {
           include: {
              user: true, 
              batch: true,
              feesPaid: { orderBy: { date: 'desc' } }
           }
        }
      }
    });

    if (!parent) {
        this.logger.warn(`Parent profile not found for UserID: ${userId}`);
        return [];
    }

    return parent.children.map(child => {
        if (!child.user) return null;

        const paid = child.feesPaid ? child.feesPaid.reduce((sum, f) => sum + f.amount, 0) : 0;
        const effectiveTotal = Math.max(0, (child.feeAgreed || 0) - (child.waiveOff || 0));
        
        let installments: any[] = [];
        try {
            if(child.installmentSchedule) {
                installments = typeof child.installmentSchedule === 'string' 
                    ? JSON.parse(child.installmentSchedule) 
                    : child.installmentSchedule;
                if (!Array.isArray(installments)) installments = [];
            }
        } catch(e) { }

        return {
            studentId: child.user.username || 'Unknown', 
            userId: child.user.id,
            name: child.fullName || 'Unknown Student',
            batch: child.batch?.name || 'Unassigned',
            totalFees: effectiveTotal,
            paidFees: paid,
            pendingFees: Math.max(0, effectiveTotal - paid),
            history: (child.feesPaid || []).map(f => ({
                id: f.id,
                amount: f.amount,
                date: f.date,
                remarks: f.remarks,
                paymentMode: f.paymentMode,
                transactionId: f.transactionId
            })),
            installments: installments
        };
    }).filter(Boolean);
  }

  async getStudentAttempts(parentUserId: string, studentUserId: string) {
      const parent = await this.prisma.parentProfile.findUnique({
          where: { userId: parentUserId },
          include: { children: { include: { user: true } } }
      });

      if (!parent) return [];

      const isMyChild = parent.children.some(c => c.user?.id === studentUserId);
      if (!isMyChild) {
          throw new ForbiddenException("You can only view your own children's results.");
      }

      return this.prisma.testAttempt.findMany({
          where: { userId: studentUserId, status: { in: ['SUBMITTED', 'EVALUATED'] } },
          include: { exam: true },
          orderBy: { submittedAt: 'desc' }
      });
  }

  async getNotices(userId: string) {
    const parent = await this.prisma.parentProfile.findUnique({
        where: { userId },
        include: { children: true }
    });

    if (!parent) return [];

    const batchIds = parent.children
        .map(c => c.batchId)
        .filter(Boolean) as string[];

    return this.prisma.notice.findMany({
        where: {
            OR: [
                { batchId: null, studentId: null, parentId: null },
                { batchId: { in: batchIds } },
                { parentId: parent.id }
            ]
        } as any,
        orderBy: { createdAt: 'desc' },
        include: { batch: true }
    });
  }

  // --- NEW: PARENT PUSH SUBSCRIPTION ---
  async subscribeToPush(userId: string, subscription: any) {
      if (!subscription || !subscription.endpoint || !subscription.keys) {
          throw new BadRequestException("Invalid subscription object");
      }

      const existing = await this.prisma.pushSubscription.findUnique({
          where: { endpoint: subscription.endpoint }
      });

      if (existing) {
          if (existing.userId !== userId) {
              return this.prisma.pushSubscription.update({
                  where: { id: existing.id },
                  data: { userId }
              });
          }
          return existing;
      }

      return this.prisma.pushSubscription.create({
          data: {
              userId,
              endpoint: subscription.endpoint,
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
          }
      });
  }
}