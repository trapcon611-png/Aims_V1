import { Injectable, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from '../batches/dto/create-batch.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import * as webPush from 'web-push'; 

@Injectable()
export class ErpService {
  private readonly logger = new Logger(ErpService.name);

  constructor(private prisma: PrismaService) {
      // Initialize Web Push
      webPush.setVapidDetails(
        'mailto:aimsinstituteno1@gmail.com',
        'BPIOFqW5EdW7LL-eYMHMdZ_1g0hdcgM093hpYAiqDL9jFyFoOI4gLT4Wu3zwgaVJBpZ9EufGagusvdL52CGL2lA', // Public Key
        'yqOdQrSnKGOmQLRwtJvNEm0zi1AlYByvYDUBxIslr3U' // Private Key
      );
  }

  // --- HELPER: RECURSIVE SANITIZER (Fixes 0x00 / Invalid Byte Errors) ---
  private sanitize(data: any): any {
      if (typeof data === 'string') {
          // Remove null bytes and other invisible control characters
          return data.replace(/\0/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "").trim();
      }
      if (Array.isArray(data)) {
          return data.map(item => this.sanitize(item));
      }
      if (typeof data === 'object' && data !== null) {
          const cleaned: any = {};
          for (const key in data) {
              cleaned[key] = this.sanitize(data[key]);
          }
          return cleaned;
      }
      return data;
  }

  // --- PUSH NOTIFICATION HELPER ---
  async sendPushToUsers(userIds: string[], payload: any) {
      if (userIds.length === 0) return;
      const subscriptions = await this.prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });

      subscriptions.forEach(sub => {
          const pushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
          webPush.sendNotification(pushSubscription, JSON.stringify(payload)).catch(error => {
              this.logger.error(`Error sending push to ${sub.userId}`, error);
          });
      });
  }

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
        strength: Number(data.strength) || 60,
        fee: Number(data.fee) || 0
      } as any
    });
  }

  async updateBatch(id: string, data: any) {
      return this.prisma.batch.update({
          where: { id },
          data: {
              fee: data.fee ? Number(data.fee) : undefined,
          }
      });
  }

  // --- EXAMS & IMPORT ---
  async getAllExams() { return this.prisma.exam.findMany({ orderBy: { createdAt: 'desc' } }); }
  
  async createExam(dto: any) { 
      return this.prisma.exam.create({ 
          data: { 
              title: dto.title, 
              description: dto.description || '', 
              durationMin: dto.duration || 180, 
              totalMarks: dto.totalMarks || 300, 
              scheduledAt: new Date(dto.scheduledAt || Date.now()), 
              isPublished: true 
          } 
      }); 
  }
  
  async getExamById(id: string) { return this.prisma.exam.findUnique({ where: { id }, include: { questions: true } }); }
  async deleteExam(id: string) { return this.prisma.exam.delete({ where: { id } }); }

  async importQuestionsToExam(examId: string, questions: any[]) {
      const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) throw new NotFoundException('Exam not found');

      return this.prisma.$transaction(async (tx) => {
          let count = 0;
          for (const [index, q] of questions.entries()) {
              
              // Validate and Sanitize Image URL
              let qImage: string | null = null;
              if (q.questionImage && typeof q.questionImage === 'string' && q.questionImage.length > 5) {
                  qImage = this.sanitize(q.questionImage);
              }

              // Sanitize Options Object Recursively
              const safeOptions = this.sanitize(q.options || {});

              await tx.question.create({
                  data: {
                      examId,
                      questionText: this.sanitize(q.questionText) || "Question Text Missing",
                      options: safeOptions, 
                      correctOption: this.sanitize(String(q.correctOption || '')),
                      subject: this.sanitize(q.subject || 'General'),
                      topic: this.sanitize(q.topic || 'General'),
                      difficulty: this.sanitize(q.difficulty || 'MEDIUM'),
                      marks: Number(q.marks) || 4,
                      negative: Number(q.negative) || -1,
                      questionImage: qImage,
                      solutionImage: null,
                      orderIndex: index + 1,
                      type: this.sanitize(q.type || 'MCQ')
                  }
              });
              count++;
          }

          // Update Exam Totals
          const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 4), 0);
          await tx.exam.update({
              where: { id: examId },
              data: { isPublished: true, totalMarks }
          });

          return { count, message: "Questions imported successfully" };
      }, { timeout: 20000 }); // Increase timeout for large imports
  }

  // --- QUESTION BANK ---
  async createQuestionInBank(dto: any) { 
    let teacherId = '';
    const teacher = await this.prisma.teacherProfile.findFirst(); 
    
    if (teacher) {
        teacherId = teacher.id;
    } else {
         const director = await this.prisma.user.findUnique({ where: { username: 'director' }, include: { teacherProfile: true } });
         if (director && director.teacherProfile) {
             teacherId = director.teacherProfile.id;
         } else {
             const adminUser = await this.prisma.user.findFirst({ where: { role: Role.SUPER_ADMIN } });
             if (adminUser) {
                 const existingProfile = await this.prisma.teacherProfile.findUnique({ where: { userId: adminUser.id }});
                 if (existingProfile) teacherId = existingProfile.id;
                 else {
                     const profile = await this.prisma.teacherProfile.create({
                         data: { userId: adminUser.id, fullName: 'System Admin', qualification: 'System' }
                     });
                     teacherId = profile.id;
                 }
             } else {
                 const salt = 10;
                 const hashedPassword = await bcrypt.hash('admin123', salt);
                 const sysAdmin = await this.prisma.user.create({
                     data: { username: `sysadmin_${Date.now()}`, password: hashedPassword, role: Role.SUPER_ADMIN, isActive: true }
                 });
                 const newProfile = await this.prisma.teacherProfile.create({
                     data: { userId: sysAdmin.id, fullName: 'System Auto Admin', qualification: 'System' }
                 });
                 teacherId = newProfile.id;
             }
         }
    }

    if(!teacherId) throw new BadRequestException("No Teacher/Admin profile found. Seed DB first.");

    // Validate and Sanitize Image URL
    let qImage: string | null = null;
    if (dto.questionImage && typeof dto.questionImage === 'string' && dto.questionImage.length > 5) {
        qImage = this.sanitize(dto.questionImage);
    }

    return this.prisma.questionBank.create({ 
        data: { 
            questionText: this.sanitize(dto.questionText), 
            options: this.sanitize(dto.options || {}), 
            correctOption: this.sanitize(dto.correctOption), 
            subject: this.sanitize(dto.subject), 
            topic: this.sanitize(dto.topic || 'General'), 
            tags: dto.tags || [], 
            difficulty: this.sanitize(dto.difficulty), 
            createdById: teacherId, 
            questionImage: qImage, 
            solutionImage: dto.solutionImage || null 
        } 
    }); 
  }

  async getQuestionBank() { return this.prisma.questionBank.findMany({ orderBy: { createdAt: 'desc' } }); }

  // --- FINANCE (EXPENSES & FEES) ---
  async getExpenses() { return this.prisma.expense.findMany({ orderBy: { date: 'desc' } }); }
  async getAllExpenses() { return this.getExpenses(); }
  
  async createExpense(dto: any) { 
      return this.prisma.expense.create({ 
          data: { 
              title: dto.title, 
              amount: Number(dto.amount), 
              category: dto.category, 
              date: new Date() 
          } 
      }); 
  }
  
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

  // --- FEE HISTORY ---
  async getAllFeeRecords() {
    const records = await this.prisma.feeRecord.findMany({
      include: {
        student: {
          include: {
            user: true,
            batch: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    return records.map(r => ({
      id: r.id,
      studentId: r.studentId, 
      displayId: r.student.user.username, 
      studentName: r.student.fullName,
      amount: r.amount,
      date: r.date,
      remarks: r.remarks,
      paymentMode: r.paymentMode,
      transactionId: r.transactionId,
      batch: r.student.batch?.name || 'Unassigned'
    }));
  }

  // --- CONTENT (NOTICES & RESOURCES) ---
  
  async getNotices() { return this.prisma.notice.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  
  // Create Notice with Push Notification Logic
  async createNotice(data: any) { 
    let parentId: string | null = null;
    let studentId: string | null = null;
    let batchId: string | null = null;
    let targetUserIds: string[] = [];

    // 1. Resolve Targets
    if (data.target === 'BATCH') {
        batchId = data.batchId;
        const students = await this.prisma.studentProfile.findMany({
            where: { batchId },
            select: { userId: true }
        });
        targetUserIds = students.map(s => s.userId);
    } else if (data.target === 'STUDENT') {
        studentId = data.studentId;
        // Check if studentId is valid before querying
        if (studentId) {
            const student = await this.prisma.studentProfile.findUnique({
                where: { id: studentId },
                select: { userId: true }
            });
            if (student) targetUserIds.push(student.userId);
        }
    } else if (data.target === 'PARENT' && data.studentId) {
        if (data.studentId) {
            const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } });
            if (student && student.parentId) {
                parentId = student.parentId;
                const parent = await this.prisma.parentProfile.findUnique({
                    where: { id: parentId },
                    select: { userId: true }
                });
                if (parent) targetUserIds.push(parent.userId);
            }
        }
    } else {
        // Global
        const allUsers = await this.prisma.user.findMany({ 
            where: { role: 'STUDENT', isActive: true }, 
            select: { id: true } 
        });
        targetUserIds = allUsers.map(u => u.id);
    }

    // 2. Save DB Record
    // Cast to 'any' to avoid schema mismatch if Prisma Client isn't regenerated yet
    const notice = await this.prisma.notice.create({ 
        data: { 
            title: data.title, 
            content: data.content, 
            batchId: batchId || null,
            studentId: studentId || null,
            parentId: parentId || null
        } as any 
    });

    // 3. Send Push
    this.sendPushToUsers(targetUserIds, {
        title: `📢 AIMS: ${data.title}`,
        body: data.content,
        url: '/student' 
    });

    return notice;
  }

  async deleteNotice(id: string) { return this.prisma.notice.delete({ where: { id } }); }
  async getResources() { return this.prisma.resource.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  async createResource(data: any) { return this.prisma.resource.create({ data: { title: data.title, url: data.url, type: data.type, batchId: data.batchId || null } }); }
  async deleteResource(id: string) { return this.prisma.resource.delete({ where: { id } }); }

  // --- SECURITY PANEL ---
  async createSystemAdmin(dto: { username: string; password: string; role: 'SUPER_ADMIN' | 'TEACHER' }) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('Username already exists');
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { username: dto.username, password: hashedPassword, visiblePassword: dto.password, role: dto.role === 'SUPER_ADMIN' ? Role.SUPER_ADMIN : Role.TEACHER, isActive: true }
    });
    if (dto.role === 'TEACHER') { await this.prisma.teacherProfile.create({ data: { userId: user.id, fullName: dto.username, qualification: 'Admin Staff' } }); }
    return user;
  }
  async getSystemAdmins() { return this.prisma.user.findMany({ where: { role: { in: [Role.SUPER_ADMIN, Role.TEACHER, Role.SECURITY_ADMIN] } }, select: { id: true, username: true, role: true, visiblePassword: true, isActive: true } }); }
  async getSecurityDirectory() { const parents = await this.prisma.parentProfile.findMany({ include: { user: true, children: true } }); return parents.map(p => ({ id: p.id, parentId: p.user.username, mobile: p.mobile, isVisible: p.isMobileVisible, childrenCount: p.children.length })); }
  async toggleMobileVisibility(parentId: string, isVisible: boolean) { return this.prisma.parentProfile.update({ where: { id: parentId }, data: { isMobileVisible: isVisible } }); }
  async toggleAllMobileVisibility(isVisible: boolean) { return this.prisma.parentProfile.updateMany({ data: { isMobileVisible: isVisible } }); }

  // --- STUDENT DIRECTORY ---
  async getStudentDirectory() {
    const students = await this.prisma.studentProfile.findMany({ include: { user: true, batch: true, parent: { include: { user: true } }, feesPaid: true }, orderBy: { fullName: 'asc' } });
    return students.map((s: any) => {
      const paid = s.feesPaid ? s.feesPaid.reduce((sum: number, r: any) => sum + r.amount, 0) : 0;
      const effectiveTotal = Math.max(0, (s.feeAgreed || 0) - (s.waiveOff || 0));
      return { id: s.id, name: s.fullName, studentId: s.user?.username || 'N/A', studentPassword: s.user?.visiblePassword || '******', parentId: s.parent?.user?.username || 'N/A', parentPassword: s.parent?.user?.visiblePassword || '******', parentMobile: s.parent?.mobile || 'N/A', isMobileMasked: !(s.parent?.isMobileVisible), batch: s.batch?.name || 'Unassigned', address: s.address, feeTotal: s.feeAgreed, feePaid: paid, feeRemaining: Math.max(0, effectiveTotal - paid), installments: s.installmentSchedule, joinedAt: s.user?.createdAt || new Date() };
    });
  }
  
  async getStudents() { return this.getStudentDirectory(); }

  async registerStudent(dto: any) {
    const input = dto; 
    const existingStudent = await this.prisma.user.findUnique({ where: { username: input.studentId } });
    if (existingStudent) return null; 
    const salt = 10;
    const hashedStudentPass = await bcrypt.hash(input.studentPassword || '123', salt);
    const hashedParentPass = await bcrypt.hash(input.parentPassword || '123', salt);
    return this.prisma.$transaction(async (tx) => {
      let parentProfileId = '';
      const existingParentUser = await tx.user.findUnique({ where: { username: input.parentId } });
      if (existingParentUser) {
        const parentProfile = await tx.parentProfile.findUnique({ where: { userId: existingParentUser.id } });
        parentProfileId = parentProfile ? parentProfile.id : (await tx.parentProfile.create({ data: { userId: existingParentUser.id, mobile: input.parentPhone || '000' } })).id;
      } else {
        const newParent = await tx.user.create({ data: { username: input.parentId, password: hashedParentPass, visiblePassword: input.parentPassword, role: Role.PARENT, parentProfile: { create: { mobile: input.parentPhone || '000' } } }, include: { parentProfile: true } });
        parentProfileId = newParent.parentProfile!.id;
      }
      return await tx.user.create({
        data: { username: input.studentId, password: hashedStudentPass, visiblePassword: input.studentPassword, role: Role.STUDENT, studentProfile: { create: { fullName: input.studentName, mobile: input.studentPhone, address: input.address, batchId: input.batchId, parentId: parentProfileId, feeAgreed: Number(input.fees)||0, waiveOff: Number(input.waiveOff)||0, latePenalty: Number(input.penalty)||0, installments: Number(input.installments)||1, nextPaymentDate: input.installmentDate ? new Date(input.installmentDate) : null, feeAgreementDate: input.agreedDate ? new Date(input.agreedDate) : new Date(), installmentSchedule: input.installmentSchedule ? JSON.parse(JSON.stringify(input.installmentSchedule)) : [] } as any } }
      });
    });
  }

  // --- ACADEMICS ---
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
      const exists = await this.prisma.attendance.findFirst({ where: { date: dateObj, studentId: String(studentId) } }); 
      if (exists) { results.push(await this.prisma.attendance.update({ where: { id: exists.id }, data: { isPresent: Boolean(isPresent) } })); } 
      else { results.push(await this.prisma.attendance.create({ data: { date: dateObj, batchId: data.batchId, studentId: String(studentId), isPresent: Boolean(isPresent), subject: 'General', time: 'N/A' } })); } 
    } 
    return { count: results.length }; 
  }

  async getStudentAttempts(username: string) { const user = await this.prisma.user.findUnique({ where: { username } }); if (!user) return []; return this.prisma.testAttempt.findMany({ where: { userId: user.id }, include: { exam: true }, orderBy: { startedAt: 'desc' } }); }
  async getAttendanceHistory(username: string) { const student = await this.prisma.studentProfile.findFirst({ where: { user: { username } } }); if (!student) return { percentage: 0, present: 0, total: 0, history: [] }; const records = await this.prisma.attendance.findMany({ where: { studentId: student.id }, orderBy: { date: 'desc' } }); const total = records.length; const present = records.filter(r => r.isPresent).length; return { percentage: total > 0 ? Math.round((present / total) * 100) : 0, present, total, history: records }; }

  // --- CRM ---
  async getEnquiries() { return this.prisma.enquiry.findMany({ orderBy: { createdAt: 'desc' } }); }
  async createEnquiry(data: any) { return this.prisma.enquiry.create({ data: { studentName: data.studentName, mobile: data.mobile, course: data.course, allotedTo: data.allotedTo, remarks: data.remarks, status: 'PENDING' } as any }); }
  async updateEnquiryStatus(id: string, status: any, followUpCount?: number) { return this.prisma.enquiry.update({ where: { id }, data: { status, followUpCount: followUpCount !== undefined ? Number(followUpCount) : undefined } }); }

  async seedSystem() { return { message: "Seed disabled." }; }
}