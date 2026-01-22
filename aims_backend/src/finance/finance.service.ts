import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CollectFeeDto } from './dto/collect-fee.dto';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // --- 1. PARENT / STUDENT FEATURES ---

  async getParentFinancials(userId: string) {
    // Find the parent profile associated with the logged-in user
    const parent = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        children: {
          include: {
            feesPaid: {
              orderBy: { date: 'desc' }
            },
            batch: true
          }
        }
      }
    });

    if (!parent) {
      return []; 
    }

    // Map data to a clean format for the frontend dashboard
    return parent.children.map((child: any) => {
      // Using 'any' cast to ensure access to new schema fields like installmentSchedule
      const totalAgreed = child.feeAgreed || 0;
      const totalPaid = child.feesPaid.reduce((sum: number, record: any) => sum + record.amount, 0);
      
      // Calculate Pending: (Agreed - WaiveOff) - Paid
      const netFee = Math.max(0, (child.feeAgreed || 0) - (child.waiveOff || 0));
      const pending = Math.max(0, netFee - totalPaid);

      return {
        studentId: child.id,
        name: child.fullName,
        batch: child.batch?.name || "Unassigned",
        totalFees: child.feeAgreed,
        paidFees: totalPaid,
        pendingFees: pending,
        history: child.feesPaid,
        // MAP THE SCHEDULE: Pass the JSON from DB to the frontend
        // Ensure we return an empty array if null
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
    return this.prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
  }

  async getSummary() {
    const fees = await this.prisma.feeRecord.aggregate({
      _sum: { amount: true }
    });
    
    const expenses = await this.prisma.expense.aggregate({
      _sum: { amount: true }
    });

    return {
      totalCollected: fees._sum.amount || 0,
      totalSpent: expenses._sum.amount || 0,
      netProfit: (fees._sum.amount || 0) - (expenses._sum.amount || 0)
    };
  }

  // --- 3. FEE COLLECTION (ADMIN) ---

  async checkFeeStatus(studentId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: { feesPaid: true }
    });

    if (!student) return { error: "Student not found" };

    // Cast to any to access new fields
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
    return this.prisma.feeRecord.create({
      data: {
        studentId: data.studentId,
        amount: Number(data.amount),
        remarks: data.remarks || "Office Payment",
        date: new Date()
      }
    });
  }
}