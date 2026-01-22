import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from '../batches/dto/create-batch.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';

@Injectable()
export class ErpService {
  constructor(private prisma: PrismaService) {}

  // --- BATCH MANAGEMENT ---
  async getBatches() {
    return this.prisma.batch.findMany({ orderBy: { name: 'asc' } });
  }
  async getAllBatches() { return this.getBatches(); }

  async createBatch(dto: CreateBatchDto) {
    const data = dto as any; 
    return this.prisma.batch.create({
      data: {
        name: data.name,
        startYear: data.startYear,
        strength: Number(data.strength),
        fee: Number(data.fee) || 0
      } as any
    });
  }

  // --- SECURITY PANEL: USER MANAGEMENT ---
  async createSystemAdmin(dto: { username: string; password: string; role: 'SUPER_ADMIN' | 'TEACHER' }) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    
    // Create User with Visible Password for Security Audit
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        visiblePassword: dto.password, 
        role: dto.role === 'SUPER_ADMIN' ? Role.SUPER_ADMIN : Role.TEACHER,
        isActive: true
      }
    });

    if (dto.role === 'TEACHER') {
      await this.prisma.teacherProfile.create({
        data: {
          userId: user.id,
          fullName: dto.username, 
          qualification: 'Admin Staff'
        }
      });
    }

    return user;
  }

  async getSystemAdmins() {
    return this.prisma.user.findMany({
      where: {
        role: { in: [Role.SUPER_ADMIN, Role.TEACHER, Role.SECURITY_ADMIN] }
      },
      select: {
        id: true,
        username: true,
        role: true,
        visiblePassword: true, 
        isActive: true
      }
    });
  }

  async getSecurityDirectory() {
    const parents = await this.prisma.parentProfile.findMany({
      include: { user: true, children: true }
    });
    return parents.map(p => ({
      id: p.id,
      parentId: p.user.username,
      mobile: p.mobile,
      isVisible: p.isMobileVisible,
      childrenCount: p.children.length
    }));
  }

  async toggleMobileVisibility(parentId: string, isVisible: boolean) {
    return this.prisma.parentProfile.update({
      where: { id: parentId },
      data: { isMobileVisible: isVisible }
    });
  }

  async toggleAllMobileVisibility(isVisible: boolean) {
    return this.prisma.parentProfile.updateMany({
      data: { isMobileVisible: isVisible }
    });
  }

  // --- STUDENT DIRECTORY ---
  async getStudents() {
    const students = await this.prisma.studentProfile.findMany({
      include: {
        user: true, 
        batch: true,
        parent: {
          include: { user: true } 
        },
        feesPaid: true
      },
      orderBy: { fullName: 'asc' }
    });

    return students.map((s: any) => {
      const paid = s.feesPaid ? s.feesPaid.reduce((sum: number, r: any) => sum + r.amount, 0) : 0;
      const effectiveTotal = Math.max(0, (s.feeAgreed || 0) - (s.waiveOff || 0));
      const remaining = Math.max(0, effectiveTotal - paid);
      
      let parentMobile = s.parent?.mobile || 'N/A';
      const isVisible = s.parent?.isMobileVisible || false;
      
      if (!isVisible && parentMobile !== 'N/A' && parentMobile.length > 4) {
         const visiblePart = parentMobile.slice(0, 3);
         parentMobile = `${visiblePart}*******`;
      }
      
      return {
        id: s.id,
        name: s.fullName,
        studentId: s.user?.username || 'N/A',
        studentPassword: s.user?.visiblePassword || '******',
        parentId: s.parent?.user?.username || 'N/A',
        parentPassword: s.parent?.user?.visiblePassword || '******',
        parentMobile: parentMobile,
        isMobileMasked: !isVisible,
        batch: s.batch?.name || 'Unassigned',
        address: s.address,
        feeTotal: s.feeAgreed,
        feePaid: paid,
        feeRemaining: remaining,
        installments: s.installmentSchedule
      };
    });
  }

  async getStudentDirectory() { return this.getStudents(); }

  // --- ADMISSION ---
  async registerStudent(dto: any) {
    const input = dto; 
    const existingStudent = await this.prisma.user.findUnique({ where: { username: input.studentId } });
    if (existingStudent) throw new ConflictException('Student ID already exists');

    const salt = 10;
    const rawStudentPass = input.studentPassword || 'student123';
    const rawParentPass = input.parentPassword || 'parent123';
    const parentMobile = input.parentPhone || `0000000000`; 

    const hashedStudentPass = await bcrypt.hash(rawStudentPass, salt);
    const hashedParentPass = await bcrypt.hash(rawParentPass, salt);

    return this.prisma.$transaction(async (tx) => {
      let parentProfileId = '';
      const existingParentUser = await tx.user.findUnique({ where: { username: input.parentId } });
      
      if (existingParentUser) {
        const parentProfile = await tx.parentProfile.findUnique({ where: { userId: existingParentUser.id } });
        if (!parentProfile) {
           const newProfile = await tx.parentProfile.create({
             data: { userId: existingParentUser.id, mobile: parentMobile }
           });
           parentProfileId = newProfile.id;
        } else {
           parentProfileId = parentProfile.id;
        }
      } else {
        const newParent = await tx.user.create({
          data: {
            username: input.parentId,
            password: hashedParentPass,
            visiblePassword: rawParentPass, 
            role: Role.PARENT,
            parentProfile: { create: { mobile: parentMobile } }
          },
          include: { parentProfile: true }
        });
        if (!newParent.parentProfile) throw new BadRequestException("Failed to create parent");
        parentProfileId = newParent.parentProfile.id;
      }

      const scheduleJson = input.installmentSchedule ? JSON.parse(JSON.stringify(input.installmentSchedule)) : [];
      const agreementDate = input.agreedDate ? new Date(input.agreedDate) : new Date();
      const nextPayDate = input.installmentDate ? new Date(input.installmentDate) : null;

      const newStudent = await tx.user.create({
        data: {
          username: input.studentId,
          password: hashedStudentPass,
          visiblePassword: rawStudentPass, 
          role: Role.STUDENT,
          studentProfile: {
            create: {
              fullName: input.studentName,
              mobile: input.studentPhone,
              address: input.address,
              batchId: input.batchId,
              parentId: parentProfileId,
              feeAgreed: Number(input.fees) || 0,
              waiveOff: Number(input.waiveOff) || 0,
              latePenalty: Number(input.penalty) || 0,
              installments: Number(input.installments) || 1,
              nextPaymentDate: nextPayDate,
              feeAgreementDate: agreementDate,
              installmentSchedule: scheduleJson
            } as any
          }
        }
      });
      return newStudent;
    });
  }

  // --- EXPENSES ---
  async getExpenses() { return this.prisma.expense.findMany({ orderBy: { date: 'desc' } }); }
  async getAllExpenses() { return this.getExpenses(); }
  async createExpense(dto: any) { return this.prisma.expense.create({ data: { title: dto.title, amount: Number(dto.amount), category: dto.category, date: new Date() } }); }
  async deleteExpense(id: string) { return this.prisma.expense.delete({ where: { id } }); }
  
  async getSummary() { 
    const fees = await this.prisma.feeRecord.aggregate({ _sum: { amount: true } }); 
    const expenses = await this.prisma.expense.aggregate({ _sum: { amount: true } }); 
    const rev = fees._sum.amount || 0; 
    const exp = expenses._sum.amount || 0; 
    return { revenue: rev, expenses: exp, profit: rev - exp }; 
  }
  async getFinancialSummary() { return this.getSummary(); }

  async collectFee(data: { studentId: string; amount: number; remarks?: string; paymentMode?: string; transactionId?: string }) { 
    const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } }); 
    if (!student) throw new BadRequestException("Student not found"); 
    return this.prisma.feeRecord.create({ 
      data: { 
        studentId: data.studentId, 
        amount: Number(data.amount), 
        remarks: data.remarks || "Fee Payment", 
        paymentMode: data.paymentMode || "CASH", 
        transactionId: data.transactionId || `TXN-${Date.now()}`, 
        date: new Date() 
      } 
    }); 
  }

  // --- ENQUIRIES ---
  async getEnquiries() { return this.prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } }); }
  
  async createEnquiry(data: any) {
    return this.prisma.enquiry.create({
      data: {
        studentName: data.studentName,
        mobile: data.mobile,
        course: data.course, 
        allotedTo: data.allotedTo, 
        remarks: data.remarks,
        status: 'PENDING'
      } as any 
    });
  }

  async updateEnquiryStatus(id: string, status: any, followUpCount?: number, allotedTo?: string) {
    const updateData: any = {};
    if (status) updateData.status = status;
    if (followUpCount !== undefined) updateData.followUpCount = Number(followUpCount);
    if (allotedTo !== undefined) updateData.allotedTo = allotedTo;
    
    return this.prisma.enquiry.update({ where: { id }, data: updateData });
  }

  // --- RESOURCES & NOTICES ---
  async getResources() { return this.prisma.resource.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  async createResource(data: any) { return this.prisma.resource.create({ data: { title: data.title, url: data.url, type: data.type, batchId: data.batchId || null } }); }
  async deleteResource(id: string) { return this.prisma.resource.delete({ where: { id } }); }
  async getNotices() { return this.prisma.notice.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  async createNotice(data: any) { return this.prisma.notice.create({ data: { title: data.title, content: data.content, batchId: data.batchId || null } }); }
  async deleteNotice(id: string) { return this.prisma.notice.delete({ where: { id } }); }
  
  // --- EXAMS & ACADEMICS ---
  async getExams() { return this.prisma.exam.findMany({ orderBy: { createdAt: 'desc' } }); }
  async getAllExams() { return this.getExams(); }
  async getExamById(id: string) { return this.prisma.exam.findUnique({ where: { id }, include: { questions: true } }); }
  async createExam(dto: any) { return this.prisma.exam.create({ data: { title: dto.title, description: dto.description || '', durationMin: dto.duration || 180, totalMarks: dto.totalMarks || 300, scheduledAt: new Date(dto.scheduledAt || Date.now()), isPublished: true } }); }
  
  async updateMarks(data: any) { 
    const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } }); 
    if (!student) throw new BadRequestException('Student not found'); 
    const total = (Number(data.physics)||0) + (Number(data.chemistry)||0) + (Number(data.maths)||0); 
    const existing = await this.prisma.testAttempt.findFirst({ where: { userId: student.userId, examId: data.examId } }); 
    if (existing) { return this.prisma.testAttempt.update({ where: { id: existing.id }, data: { physics: Number(data.physics), chemistry: Number(data.chemistry), maths: Number(data.maths), totalScore: total, status: 'EVALUATED' } }); } 
    return this.prisma.testAttempt.create({ data: { userId: student.userId, examId: data.examId, physics: Number(data.physics), chemistry: Number(data.chemistry), maths: Number(data.maths), totalScore: total, status: 'EVALUATED' } }); 
  }
  
  async saveAttendance(data: any) { 
    const results: any[] = []; 
    const dateObj = new Date(data.date); 
    for (const [studentId, isPresent] of Object.entries(data.records)) { 
      const exists = await this.prisma.attendance.findFirst({ where: { date: dateObj, studentId: studentId, } }); 
      if (exists) { results.push(await this.prisma.attendance.update({ where: { id: exists.id }, data: { isPresent: Boolean(isPresent) } })); } 
      else { results.push(await this.prisma.attendance.create({ data: { date: dateObj, batchId: data.batchId, studentId: studentId, isPresent: Boolean(isPresent), subject: 'General' } })); } 
    } 
    return { count: results.length }; 
  }
  
  async getExamResults(examId: string, batchId?: string) { 
    const whereClause: any = { examId }; 
    if (batchId) { 
      const students = await this.prisma.studentProfile.findMany({ where: { batchId }, select: { userId: true } }); 
      const userIds = students.map(s => s.userId); 
      whereClause.userId = { in: userIds }; 
    } 
    const attempts = await this.prisma.testAttempt.findMany({ where: whereClause, include: { user: { include: { studentProfile: true } } }, orderBy: { totalScore: 'desc' } }); 
    return attempts.map((a, index) => ({ id: a.id, rank: index + 1, studentName: a.user.studentProfile?.fullName || a.user.username, physics: a.physics, chemistry: a.chemistry, maths: a.maths, total: a.totalScore })); 
  }
  
  async getAttendanceStats(batchId: string) { 
    if (!batchId) return []; 
    const students = await this.prisma.studentProfile.findMany({ where: { batchId }, include: { attendance: true } }); 
    return students.map((s: any) => { 
      const total = s.attendance ? s.attendance.length : 0; 
      const present = s.attendance ? s.attendance.filter((a: any) => a.isPresent).length : 0; 
      return { id: s.id, name: s.fullName, present, total, percentage: total > 0 ? Math.round((present/total)*100) : 0 }; 
    }); 
  }
  
  async createQuestionInBank(dto: any) { 
    const teacher = await this.prisma.teacherProfile.findFirst(); 
    if (!teacher) throw new BadRequestException('No Teacher/Admin profile found.'); 
    return this.prisma.questionBank.create({ data: { questionText: dto.questionText, options: dto.options, correctOption: dto.correctOption, subject: dto.subject, difficulty: dto.difficulty, createdById: teacher.id } }); 
  }
  
  async getQuestionBank() { return this.prisma.questionBank.findMany({ orderBy: { createdAt: 'desc' } }); }
  async getStudentAttempts(username: string) { const user = await this.prisma.user.findUnique({ where: { username } }); if (!user) return []; return this.prisma.testAttempt.findMany({ where: { userId: user.id }, include: { exam: true }, orderBy: { startedAt: 'desc' } }); }
  async getAttendanceHistory(username: string) { const student = await this.prisma.studentProfile.findFirst({ where: { user: { username } } }); if (!student) return { percentage: 0, present: 0, total: 0, history: [] }; const records = await this.prisma.attendance.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' } }); const total = records.length; const present = records.filter(r => r.isPresent).length; return { percentage: total > 0 ? Math.round((present / total) * 100) : 0, present, total, history: records }; }
  
  // --- UPDATED SYSTEM SEED ---
  async seedSystem() { 
    const salt = 10;
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, salt);

    await this.prisma.user.upsert({
      where: { username: 'director' },
      update: {
        password: hashedPassword,
        visiblePassword: password, // Store Visible Password
        role: Role.SUPER_ADMIN,
        isActive: true
      },
      create: {
        username: 'director',
        password: hashedPassword,
        visiblePassword: password, // Store Visible Password
        role: Role.SUPER_ADMIN,
        isActive: true,
        teacherProfile: {
          create: {
            fullName: 'Institute Director',
            qualification: 'Administrator'
          }
        }
      }
    });

    return { message: "System Integrity Check Complete. Director credentials refreshed and visible." }; 
  }
}