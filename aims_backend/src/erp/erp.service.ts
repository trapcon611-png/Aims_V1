import { Injectable, ConflictException, BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBatchDto } from '../batches/dto/create-batch.dto';
import * as bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import * as webPush from 'web-push'; 

@Injectable()
export class ErpService {
    private readonly logger = new Logger(ErpService.name);
    private isPoolLocked = true;

  constructor(private prisma: PrismaService) {
      webPush.setVapidDetails(
        'mailto:aimsinstituteno1@gmail.com',
        'BPIOFqW5EdW7LL-eYMHMdZ_1g0hdcgM093hpYAiqDL9jFyFoOI4gLT4Wu3zwgaVJBpZ9EufGagusvdL52CGL2lA', 
        'yqOdQrSnKGOmQLRwtJvNEm0zi1AlYByvYDUBxIslr3U' 
      );
  }
  
  async getPoolStatus() { 
      return { isUnlocked: !this.isPoolLocked }; 
  }

  async setPoolStatus(status: boolean) { 
      this.isPoolLocked = !status; 
      return { isUnlocked: status }; 
  }

  private sanitize(data: any): any {
      if (typeof data === 'string') {
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

  // --- BRANCH MANAGEMENT ---
  async getBranches() {
      return this.prisma.branch.findMany({ orderBy: { name: 'asc' } });
  }

  async createBranch(data: any) {
      return this.prisma.branch.create({
          data: {
              name: data.name,
              city: data.city || null,
              address: data.address || null,
              phone: data.phone || null // ✨ NEW: Now saves the phone number to the DB
          }
      });
  }

  // ✨ NEW: Created function to handle updating branch details (like the phone number)
  async updateBranch(id: string, data: any) {
      return this.prisma.branch.update({
          where: { id },
          data: {
              name: data.name !== undefined ? data.name : undefined,
              city: data.city !== undefined ? data.city : undefined,
              address: data.address !== undefined ? data.address : undefined,
              phone: data.phone !== undefined ? data.phone : undefined
          }
      });
  }

  async deleteBranch(id: string) {
      const activeBatches = await this.prisma.batch.count({ where: { branchId: id } });
      if (activeBatches > 0) {
          throw new ConflictException(`Cannot delete branch. It still has ${activeBatches} active batches assigned to it.`);
      }
      return this.prisma.branch.delete({ where: { id } });
  }

  // --- BATCH MANAGEMENT ---
  async getBatches() {
    return this.prisma.batch.findMany({ 
        include: { branch: true }, 
        orderBy: { name: 'asc' } 
    });
  }
  async getAllBatches() { return this.getBatches(); }

  async createBatch(dto: CreateBatchDto) {
    const data = dto as any; 
    return this.prisma.batch.create({
      data: {
        name: data.name,
        startYear: data.startYear,
        strength: Number(data.strength) || 60,
        fee: Number(data.fee) || 0,
        branchId: data.branchId && data.branchId !== '' ? data.branchId : null 
      } as any
    });
  }

  async updateBatch(id: string, data: any) {
      return this.prisma.batch.update({
          where: { id },
          data: { 
              fee: data.fee !== undefined ? Number(data.fee) : undefined,
              // ✨ Now accepts branch changes from the frontend
              branchId: data.branchId !== undefined ? (data.branchId === '' ? null : data.branchId) : undefined 
          }
      });
  }

  async deleteBatch(id: string) {
      return this.prisma.batch.delete({ where: { id } });
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
              let qImage: string | null = null;
              if (q.questionImage && typeof q.questionImage === 'string' && q.questionImage.length > 5) {
                  qImage = this.sanitize(q.questionImage);
              }
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

          const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 4), 0);
          await tx.exam.update({
              where: { id: examId },
              data: { isPublished: true, totalMarks }
          });

          return { count, message: "Questions imported successfully" };
      }, { timeout: 20000 }); 
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

  // ✨ UPDATED: Accept manual date for Fee Collection
  async collectFee(data: { studentId: string; amount: number; remarks?: string; paymentMode?: string; transactionId?: string; date?: string }) { 
    const student = await this.prisma.studentProfile.findUnique({ where: { id: data.studentId } }); 
    if (!student) throw new BadRequestException("Student not found"); 
    
    const paymentDate = data.date ? new Date(data.date) : new Date();

    return this.prisma.feeRecord.create({ 
      data: { 
        studentId: data.studentId, 
        amount: Number(data.amount), 
        remarks: data.remarks || "Fee Payment", 
        paymentMode: data.paymentMode || "CASH", 
        transactionId: data.transactionId || `TXN-${Date.now()}`, 
        date: paymentDate 
      } 
    }); 
  }

  // ✨ UPDATED: Include Deep Branch details for Fee Receipt Address
  async getAllFeeRecords() {
    const records = await this.prisma.feeRecord.findMany({
      include: {
        student: {
          include: {
            user: true,
            batch: {
                include: {
                    branch: true
                }
            }
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
      batch: r.student.batch?.name || 'Unassigned',
      branchName: r.student.batch?.branch?.name || null,
      branchAddress: r.student.batch?.branch?.address || null,
      branchCity: r.student.batch?.branch?.city || null
    }));
  }

// ✨ NEW: Feature 3 Request Admin Edit
  async requestFeeEdit(feeId: string, actor: string) {
    const record = await this.prisma.feeRecord.findUnique({ where: { id: feeId } });
    if (!record) throw new NotFoundException('Fee record not found');

    const updated = await this.prisma.feeRecord.update({
      where: { id: feeId },
      data: { editStatus: 'PENDING', editRequestDate: new Date() }
    });

    // Directly access securityLog here
    await this.prisma.securityLog.create({
      data: {
        actorId: actor,
        role: 'ACCOUNTS',
        action: 'FEE_EDIT_REQUESTED',
        details: { feeId: feeId, amount: record.amount } as any
      }
    });

    return updated;
  }

  async updateFeeRecord(id: string, data: any) {
      return this.prisma.feeRecord.update({
          where: { id },
          data: {
              amount: Number(data.amount),
              paymentMode: data.paymentMode,
              transactionId: data.transactionId,
              bankName: data.bankName,
              remarks: data.remarks,
              editStatus: 'NONE' // Re-locks the receipt after editing
          }
      });
  }

  // --- CONTENT (NOTICES & RESOURCES) ---
  async getNotices() { return this.prisma.notice.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  
  async createNotice(data: any) { 
    let parentId: string | null = null;
    let studentId: string | null = null;
    let batchId: string | null = null;
    let targetUserIds: string[] = [];

    if (data.target === 'BATCH') {
        batchId = data.batchId;
        const students = await this.prisma.studentProfile.findMany({
            where: { batchId },
            select: { userId: true }
        });
        targetUserIds = students.map(s => s.userId);
    } else if (data.target === 'STUDENT') {
        studentId = data.studentId;
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
        const allUsers = await this.prisma.user.findMany({ 
            where: { role: 'STUDENT', isActive: true }, 
            select: { id: true } 
        });
        targetUserIds = allUsers.map(u => u.id);
    }

    const notice = await this.prisma.notice.create({ 
        data: { 
            title: data.title, 
            content: data.content, 
            batchId: batchId || null,
            studentId: studentId || null,
            parentId: parentId || null
        } as any 
    });

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

  async getSecurityLogs(limit: number = 100) {
      return this.prisma.securityLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: limit
      });
  }

  // ✨ NEW: Feature 3 Fetch Pending Requests
  async getFeeEditRequests() {
    const records = await this.prisma.feeRecord.findMany({
      where: { editStatus: 'PENDING' },
      include: { student: { include: { user: true } } },
      orderBy: { editRequestDate: 'desc' }
    });

    return records.map(r => ({
      id: r.id,
      studentName: r.student.fullName,
      displayId: r.student.user.username,
      amount: r.amount,
      date: r.date,
      paymentMode: r.paymentMode,
      transactionId: r.transactionId,
      editRequestDate: r.editRequestDate
    }));
  }

  // ✨ NEW: Feature 3 Resolve the Request and Log it!
  async resolveFeeEditRequest(feeId: string, status: 'APPROVED' | 'REJECTED', actor: string) {
    const record = await this.prisma.feeRecord.findUnique({ where: { id: feeId } });
    if (!record) throw new NotFoundException('Fee record not found');

    const updated = await this.prisma.feeRecord.update({
      where: { id: feeId },
      data: { editStatus: status }
    });

    // Directly access securityLog here
    await this.prisma.securityLog.create({
      data: {
        actorId: actor,
        role: 'SECURITY_DIRECTOR',
        action: `FEE_EDIT_${status}`,
        details: { feeId: feeId, amount: record.amount } as any
      }
    });

    return updated;
  }

  // --- STUDENT DIRECTORY ---
  async getStudentDirectory(page: number = 1, limit: number = 20, search: string = '', batchFilter: string = '') {
    const whereClause: any = {};

    if (search) {
        whereClause.OR = [
            { fullName: { contains: search, mode: 'insensitive' } },
            { user: { username: { contains: search, mode: 'insensitive' } } },
            { parent: { user: { username: { contains: search, mode: 'insensitive' } } } },
            { parent: { AND: [ { mobile: { contains: search } }, { isMobileVisible: true } ] } }
        ];
    }

    if (batchFilter) {
        whereClause.batch = { name: batchFilter };
    }

    const totalRecords = await this.prisma.studentProfile.count({ where: whereClause });

    const students = await this.prisma.studentProfile.findMany({ 
        where: whereClause,
        include: { 
            user: true, 
            batch: { include: { branch: true } }, 
            parent: { include: { user: true } }, 
            feesPaid: true 
        }, 
        orderBy: { fullName: 'asc' },
        skip: (page - 1) * limit,
        take: limit
    });

    const formattedStudents = students.map((s: any) => {
      const paid = s.feesPaid ? s.feesPaid.reduce((sum: number, r: any) => sum + r.amount, 0) : 0;
      const effectiveTotal = Math.max(0, (s.feeAgreed || 0) - (s.waiveOff || 0));
      return { 
          id: s.id, 
          name: s.fullName, 
          studentId: s.user?.username || 'N/A', 
          studentPassword: s.user?.visiblePassword || '******', 
          parentId: s.parent?.user?.username || 'N/A', 
          parentPassword: s.parent?.user?.visiblePassword || '******', 
          parentMobile: s.parent?.mobile || 'N/A', 
          
          // ✨ Expanded Parent Details
          fatherName: s.parent?.fatherName || null,
          motherName: s.parent?.motherName || null,
          parentEmail: s.parent?.email || null,

          isMobileMasked: !(s.parent?.isMobileVisible), 
          batch: s.batch?.name || 'Unassigned', 
          branch: s.batch?.branch?.name || null,
          address: s.address, 
          feeTotal: s.feeAgreed, 
          feePaid: paid, 
          feeRemaining: Math.max(0, effectiveTotal - paid), 
          installments: s.installmentSchedule, 
          joinedAt: s.user?.createdAt || new Date(),
          
          dob: s.dob,
          photoUrl: s.photoUrl,
          remarks: s.remarks,

          // ✨ Expanded Academic Details
          lastSchool: s.lastSchool || null,
          lastPercentage: s.lastPercentage || null
      };
    });

    return {
        data: formattedStudents,
        meta: {
            total: totalRecords,
            page: page,
            limit: limit,
            totalPages: Math.ceil(totalRecords / limit)
        }
    };
  }
  
  async getStudents() { return this.getStudentDirectory(); }

  // 🚨 CASCADE DELETE STUDENT
  async deleteStudent(studentProfileId: string) {
      const student = await this.prisma.studentProfile.findUnique({ 
          where: { id: studentProfileId },
          select: { userId: true }
      });
      
      if (!student) throw new NotFoundException('Student not found');
      
      const userId = student.userId;

      await this.prisma.$transaction(async (tx) => {
          const attempts = await tx.testAttempt.findMany({ where: { userId }, select: { id: true } });
          const attemptIds = attempts.map(a => a.id);
          if (attemptIds.length > 0) {
              await tx.answer.deleteMany({ where: { attemptId: { in: attemptIds } } });
          }

          await tx.testAttempt.deleteMany({ where: { userId } });
          await tx.feeRecord.deleteMany({ where: { studentId: studentProfileId } });
          await tx.attendance.deleteMany({ where: { studentId: studentProfileId } });
          await tx.pushSubscription.deleteMany({ where: { userId } });
          await tx.studentProfile.delete({ where: { id: studentProfileId } });
          await tx.user.delete({ where: { id: userId } });
      });

      return { success: true, message: 'Student and all related records successfully deleted' };
  }

  // ✨ FULL SIS UPDATE METHOD (Updated with new fields)
  async updateStudent(studentProfileId: string, data: any) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { id: studentProfileId },
      include: { user: true, parent: { include: { user: true } } }
    });

    if (!student) throw new NotFoundException('Student not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Student Password
      if (data.studentPassword && data.studentPassword !== student.user.visiblePassword) {
        const hashedPass = await bcrypt.hash(data.studentPassword, 10);
        await tx.user.update({
          where: { id: student.userId },
          data: { password: hashedPass, visiblePassword: data.studentPassword }
        });
      }

      // 2. Update Parent Password & Details
      if (student.parentId) {
          if (data.parentPassword && student.parent?.userId && data.parentPassword !== student.parent.user.visiblePassword) {
            const hashedParentPass = await bcrypt.hash(data.parentPassword, 10);
            await tx.user.update({
              where: { id: student.parent.userId },
              data: { password: hashedParentPass, visiblePassword: data.parentPassword }
            });
          }

          await tx.parentProfile.update({
            where: { id: student.parentId },
            data: { 
                mobile: data.parentMobile !== undefined ? data.parentMobile : student.parent?.mobile,
                fatherName: data.fatherName !== undefined ? data.fatherName : student.parent?.fatherName,
                motherName: data.motherName !== undefined ? data.motherName : student.parent?.motherName,
                email: data.parentEmail !== undefined ? data.parentEmail : student.parent?.email
            }
          });
      }

      // 3. Resolve Batch ID if Name was passed from frontend Dropdown
      let targetBatchId = student.batchId;
      if (data.batch) {
          const batchRecord = await tx.batch.findFirst({ where: { name: data.batch } });
          if (batchRecord) targetBatchId = batchRecord.id;
      }

      // 4. Update the Core Profile Data
      const updatedProfile = await tx.studentProfile.update({
        where: { id: studentProfileId },
        data: {
          fullName: data.name || student.fullName,
          address: data.address !== undefined ? data.address : student.address,
          dob: data.dob ? new Date(data.dob) : student.dob,
          photoUrl: data.photoUrl !== undefined ? data.photoUrl : student.photoUrl,
          remarks: data.remarks !== undefined ? data.remarks : student.remarks,
          lastSchool: data.lastSchool !== undefined ? data.lastSchool : student.lastSchool,
          lastPercentage: data.lastPercentage !== undefined ? data.lastPercentage : student.lastPercentage,
          batchId: targetBatchId,
        }
      });

      return { success: true, message: 'Student updated successfully', profile: updatedProfile };
    });
  }

  // ✨ UPDATED ADMISSION ROUTE (Captures all new fields)
  async registerStudent(dto: any) {
    const input = dto; 
    
    const existingStudent = await this.prisma.user.findUnique({ where: { username: input.studentId } });
    if (existingStudent) {
        throw new ConflictException(`Student ID '${input.studentId}' is already registered! Please assign a unique ID.`);
    }
    
    const existingParentUser = await this.prisma.user.findUnique({ where: { username: input.parentId } });
    if (existingParentUser && existingParentUser.role !== Role.PARENT) {
        throw new ConflictException(`The ID '${input.parentId}' is already in use by a Non-Parent account!`);
    }

    const totalFee = Number(input.fees) || 0;
    const schedule = input.installmentSchedule || [];
    
    if (schedule.length > 0) {
        const sumOfInstallments = schedule.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
        if (sumOfInstallments !== totalFee) {
            throw new BadRequestException(`Financial Tampering Detected: Installments sum (₹${sumOfInstallments}) does not match the Total Fee (₹${totalFee}).`);
        }
    }

    const salt = 10;
    const hashedStudentPass = await bcrypt.hash(input.studentPassword || '123', salt);
    const hashedParentPass = await bcrypt.hash(input.parentPassword || '123', salt);
    
    return this.prisma.$transaction(async (tx) => {
      let parentProfileId = '';
      
      if (existingParentUser) {
        const parentProfile = await tx.parentProfile.findUnique({ where: { userId: existingParentUser.id } });
        if (parentProfile) {
            parentProfileId = parentProfile.id;
        } else {
            const newProfile = await tx.parentProfile.create({ 
                data: { 
                    userId: existingParentUser.id, 
                    mobile: input.parentPhone || '000',
                    fatherName: input.fatherName || null,
                    motherName: input.motherName || null,
                    email: input.parentEmail || null
                } 
            });
            parentProfileId = newProfile.id;
        }
      } else {
        const newParent = await tx.user.create({ 
            data: { 
                username: input.parentId, 
                password: hashedParentPass, 
                visiblePassword: input.parentPassword, 
                role: Role.PARENT, 
                parentProfile: { 
                    create: { 
                        mobile: input.parentPhone || '000',
                        fatherName: input.fatherName || null,
                        motherName: input.motherName || null,
                        email: input.parentEmail || null
                    } 
                } 
            }, 
            include: { parentProfile: true } 
        });
        parentProfileId = newParent.parentProfile!.id;
      }
      
      return await tx.user.create({
        data: { 
            username: input.studentId, 
            password: hashedStudentPass, 
            visiblePassword: input.studentPassword, 
            role: Role.STUDENT, 
            createdAt: input.joinedAt ? new Date(input.joinedAt) : undefined,
            studentProfile: { 
                create: { 
                    fullName: input.studentName, 
                    mobile: input.studentPhone, 
                    address: input.address, 
                    batchId: input.batchId, 
                    parentId: parentProfileId, 
                    feeAgreed: totalFee, 
                    waiveOff: Number(input.waiveOff)||0, 
                    latePenalty: Number(input.penalty)||0, 
                    installments: Number(input.installments)||1, 
                    nextPaymentDate: input.installmentDate ? new Date(input.installmentDate) : null, 
                    feeAgreementDate: input.agreedDate ? new Date(input.agreedDate) : new Date(), 
                    installmentSchedule: JSON.parse(JSON.stringify(schedule)),
                    dob: input.dob ? new Date(input.dob) : null,
                    photoUrl: input.photoUrl || null,
                    remarks: input.remarks || null,
                    lastSchool: input.lastSchool || null,
                    lastPercentage: input.lastPercentage || null
                } as any 
            } 
        }
      });
    });
  }

  // --- ACADEMICS ---
  async getExamResults(examId: string, batchId?: string) { 
    const whereClause: any = { examId, status: 'EVALUATED' }; 
    
    if (batchId) { 
      const students = await this.prisma.studentProfile.findMany({ where: { batchId }, select: { userId: true } }); 
      const userIds = students.map(s => s.userId); 
      whereClause.userId = { in: userIds }; 
    } 
    
    const attempts = await this.prisma.testAttempt.findMany({ 
        where: whereClause, 
        include: { user: { include: { studentProfile: true } } }, 
        orderBy: { totalScore: 'desc' }
    }); 

    let currentRank = 1;
    let previousScore: number | null = null;

    return attempts.map((a, index) => { 
        if (previousScore !== null && a.totalScore < previousScore) {
            currentRank = index + 1;
        }
        previousScore = a.totalScore;

        return { 
            id: a.id, 
            rank: currentRank, 
            studentName: a.user.studentProfile?.fullName || a.user.username, 
            physics: a.physics, 
            chemistry: a.chemistry, 
            maths: a.maths, 
            total: a.totalScore 
        };
    }); 
  }
  
  // ✨ UPDATED: Supports Monthly Reports
  async getAttendanceStats(batchId: string, month?: number, year?: number) { 
    if (!batchId) return []; 
    
    const whereClause: any = { batchId };
    if (month && year) {
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59); // Last day of month
        whereClause.date = { gte: start, lte: end };
    }

    const students = await this.prisma.studentProfile.findMany({ 
        where: { batchId }, 
        include: { 
            attendance: {
                where: whereClause.date ? { date: whereClause.date } : undefined
            } 
        } 
    }); 
    
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
  
  async createEnquiry(data: any) { 
      return this.prisma.enquiry.create({ 
          data: { 
              studentName: data.studentName, 
              mobile: data.mobile, 
              course: data.course, 
              allotedTo: data.allotedTo, 
              remarks: data.remarks, 
              status: 'PENDING',
              branchId: data.branchId && data.branchId !== '' ? data.branchId : null 
          } as any 
      }); 
  }
  
  // ✨ UPDATED: Enquiry Log tracking
  async updateEnquiryStatus(id: string, status: any, followUpCount?: number, newRemark?: string) { 
      const enquiry = await this.prisma.enquiry.findUnique({ where: { id }});
      if (!enquiry) throw new NotFoundException('Enquiry not found');

      let logs: any[] = [];
      if (enquiry.followUpLogs && Array.isArray(enquiry.followUpLogs)) {
          logs = [...enquiry.followUpLogs];
      }
      
      if (newRemark || status !== enquiry.status) {
          logs.push({
              date: new Date().toISOString(),
              status: status,
              remark: newRemark || `Status updated to ${status}`
          });
      }

      return this.prisma.enquiry.update({ 
          where: { id }, 
          data: { 
              status, 
              followUpCount: followUpCount !== undefined ? Number(followUpCount) : undefined,
              followUpLogs: logs,
              remarks: newRemark ? newRemark : enquiry.remarks
          } 
      }); 
  }

  async deleteEnquiry(id: string) {
      return this.prisma.enquiry.delete({ where: { id } });
  }

  async seedSystem() { return { message: "Seed disabled." }; }
}