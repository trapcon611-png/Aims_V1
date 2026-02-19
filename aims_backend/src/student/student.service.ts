import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(private prisma: PrismaService) {}

  async getStudentDashboard(userId: string) {
    return { message: "Dashboard data" };
  }

  async getAvailableExams() {
    return this.prisma.exam.findMany({
      where: { isPublished: true },
      orderBy: { scheduledAt: 'desc' },
      select: {
        id: true, title: true, durationMin: true, totalMarks: true, 
        scheduledAt: true
      }
    });
  }

  // --- CORE EXAM LOGIC ---
  async startAttempt(userId: string, examId: string) {
    if (!userId) throw new BadRequestException("User ID is required to start attempt");

    // 1. Check if exam exists
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true }
    });

    if (!exam) throw new NotFoundException("Exam not found.");
    if (!exam.isPublished) throw new BadRequestException("Exam is not active.");

    if (!exam.questions || exam.questions.length === 0) {
        throw new BadRequestException("This exam has no questions configured.");
    }

    // 2. Check/Create Attempt
    let attempt = await this.prisma.testAttempt.findFirst({
        where: { userId, examId, status: 'IN_PROGRESS' }
    });

    if (!attempt) {
        // Check if already submitted
        const submitted = await this.prisma.testAttempt.findFirst({
            where: { userId, examId, status: { in: ['SUBMITTED', 'EVALUATED'] } }
        });
        if (submitted) throw new BadRequestException("You have already submitted this exam.");

        // Create new attempt
        attempt = await this.prisma.testAttempt.create({
            data: { 
                userId: userId, 
                examId: examId,
                status: 'IN_PROGRESS' 
            }
        });
    }

    // 3. Return Secure Questions (No Answers)
    const secureQuestions = exam.questions.map(q => {
        let parsedOptions = q.options;
        if (typeof q.options === 'string') {
            try { parsedOptions = JSON.parse(q.options); } catch(e) {}
        }

        return {
            id: q.id,
            questionText: q.questionText,
            questionImage: q.questionImage,
            options: parsedOptions,
            subject: q.subject,
            topic: q.topic,
            type: q.type,
            marks: q.marks,
            negative: q.negative,
            // SECURITY: Do NOT include correctOption
        };
    });

    return {
        attemptId: attempt.id,
        exam: {
            title: exam.title,
            duration: exam.durationMin,
            totalMarks: exam.totalMarks
        },
        questions: secureQuestions,
        serverTime: new Date()
    };
  }

  async submitExam(userId: string, examId: string, answers: any[]) {
      const attempt = await this.prisma.testAttempt.findFirst({
          where: { userId, examId, status: 'IN_PROGRESS' }
      });
      if (!attempt) throw new BadRequestException("No active attempt found.");

      const examQuestions = await this.prisma.question.findMany({
          where: { examId }
      });

      let totalScore = 0;
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      let physicsScore = 0;
      let chemistryScore = 0;
      let mathsScore = 0;

      const processedAnswers = answers.map(ans => {
          const question = examQuestions.find(q => q.id === ans.questionId);
          if (!question) return null;

          const isCorrect = String(ans.selectedOption).toLowerCase() === String(question.correctOption).toLowerCase();
          
          let marks = 0;
          if (ans.selectedOption) {
              if (isCorrect) {
                  marks = question.marks;
                  correctCount++;
              } else {
                  marks = question.negative;
                  wrongCount++;
              }
          } else {
              skippedCount++;
          }

          totalScore += marks;

          const sub = (question.subject || '').toLowerCase();
          if (sub.includes('phys')) physicsScore += marks;
          else if (sub.includes('chem')) chemistryScore += marks;
          else if (sub.includes('math')) mathsScore += marks;

          return {
              attemptId: attempt.id,
              questionId: question.id,
              selectedOption: String(ans.selectedOption),
              isCorrect,
              marksAwarded: marks,
              timeTaken: Number(ans.timeTaken) || 0
          };
      }).filter(Boolean);

      // Save Answers
      await this.prisma.answer.createMany({ 
          data: processedAnswers as any 
      });

      // Update Attempt
      await this.prisma.testAttempt.update({
          where: { id: attempt.id },
          data: {
              status: 'SUBMITTED',
              totalScore,
              physics: physicsScore,
              chemistry: chemistryScore,
              maths: mathsScore,
              correctCount,
              wrongCount,
              skippedCount,
              submittedAt: new Date()
          }
      });

      return { success: true, score: totalScore };
  }

  // --- HISTORY & RESULTS ---
  async getStudentResults(userId: string) {
      return this.prisma.testAttempt.findMany({
          where: { userId, status: { in: ['SUBMITTED', 'EVALUATED'] } },
          include: { 
              // CRITICAL FIX: We MUST include questions inside the exam
              exam: {
                  include: { 
                      questions: true 
                  }
              },
              answers: true 
          },
          orderBy: { submittedAt: 'desc' }
      });
  }

  // --- CONTENT ---
  async getResources() { return this.prisma.resource.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  async getNotices() { return this.prisma.notice.findMany({ include: { batch: true }, orderBy: { createdAt: 'desc' } }); }
  
  // --- PUSH NOTIFICATIONS ---
  async subscribeToPush(userId: string, subscription: any) {
     if (!subscription || !subscription.endpoint) return; 
     try {
         const existing = await this.prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint } });
         if(existing) {
             if(existing.userId !== userId) await this.prisma.pushSubscription.update({ where: { id: existing.id }, data: { userId } });
             return existing;
         }
         return this.prisma.pushSubscription.create({
             data: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }
         });
     } catch(e) { this.logger.error("Push Sub Error", e); }
  }
}