import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CollectFeeDto } from './dto/collect-fee.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // --- 1. PARENT / STUDENT FEATURES ---

  async getParentFinancials(userId: string) {
    const parent = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        children: {
          include: {
            feesPaid: { orderBy: { date: 'desc' } },
            batch: true
          }
        }
      }
    });

    if (!parent) return []; 

    return parent.children.map((child: any) => {
      const totalPaid = child.feesPaid.reduce((sum: number, record: any) => sum + record.amount, 0);
      const netFee = Math.max(0, (child.feeAgreed || 0) - (child.waiveOff || 0));
      const pending = Math.max(0, netFee - totalPaid);

      return {
        studentId: child.id,     // Used for Fees
        userId: child.userId,    // <--- NEW: Used for Exam Results
        name: child.fullName,
        batch: child.batch?.name || "Unassigned",
        totalFees: child.feeAgreed,
        paidFees: totalPaid,
        pendingFees: pending,
        history: child.feesPaid,
        installments: child.installmentSchedule || []
      };
    });
  }

  // --- 2. EXPENSE MANAGEMENT ---
  async createExpense(data: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        title: data.title,
        category: data.category,
        amount: Number(data.amount),
        vendor: data.vendor,
        description: data.description,
        date: new Date()
      }
    });
  }

  async findAllExpenses() {
    return this.prisma.expense.findMany({ orderBy: { date: 'desc' } });
  }

  async getSummary() {
    const fees = await this.prisma.feeRecord.aggregate({ _sum: { amount: true } });
    const expenses = await this.prisma.expense.aggregate({ _sum: { amount: true } });

    return {
      totalCollected: fees._sum.amount || 0,
      totalSpent: expenses._sum.amount || 0,
      netProfit: (fees._sum.amount || 0) - (expenses._sum.amount || 0)
    };
  }

  // --- 3. FEE COLLECTION ---
  async checkFeeStatus(studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { feesPaid: true }
    });

    if (!student) return { error: "Student not found" };
    const s = student as any;
    const paid = s.feesPaid.reduce((acc: number, curr: any) => acc + curr.amount, 0);
    const netFee = Math.max(0, (s.feeAgreed || 0) - (s.waiveOff || 0));

    return {
      studentName: s.fullName,
      totalAgreed: s.feeAgreed,
      paid: paid,
      pending: Math.max(0, netFee - paid)
    };
  }

  async collectFee(data: CollectFeeDto) {
    // Verify student exists first
    const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } });
    if (!student) throw new BadRequestException("Student not found");

    return this.prisma.feeRecord.create({
      data: {
        studentId: data.studentId,
        amount: Number(data.amount),
        remarks: data.remarks || "Office Payment",
        paymentMode: data.paymentMode || "CASH",
        transactionId: data.transactionId || `TXN-${Date.now()}`,
        date: new Date()
      }
    });
  }

  // --- NEW: GET ALL TRANSACTIONS FOR DIRECTOR ---
  async getAllTransactions() {
    const records = await this.prisma.feeRecord.findMany({
      include: {
        student: {
          include: {
            batch: true,
            parent: {
              include: { user: true }
            },
            user: true // To get student ID (username)
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return records.map(r => ({
      id: r.id,
      studentId: r.studentId, // Keep internal UUID for matching
      displayId: r.student.user.username, // Show STU-001
      studentName: r.student.fullName,
      parentId: r.student.parent?.user.username || 'N/A',
      batch: r.student.batch?.name || 'Unassigned',
      amount: r.amount,
      date: r.date,
      remarks: r.remarks,
      paymentMode: r.paymentMode,
      transactionId: r.transactionId
    }));
  }
}