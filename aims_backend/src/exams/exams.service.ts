import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.exam.findMany({
      where: { isPublished: true },
      orderBy: { scheduledAt: 'desc' },
      include: { batch: true }
    });
  }

  async findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: { questions: true }
    });
  }

  // --- NEW: Get Student Attempts with Analytics Data ---
  async getMyAttempts(userId: string) {
    return this.prisma.testAttempt.findMany({
      where: { 
        userId,
        status: { in: ['SUBMITTED', 'EVALUATED'] } // Only show finished exams
      },
      include: {
        exam: {
          select: { title: true, totalMarks: true } 
        },
        answers: {
          include: {
            question: {
              // CRITICAL FIX: Select all fields needed for frontend analysis
              select: { 
                  subject: true, 
                  difficulty: true,
                  questionText: true,
                  questionImage: true,
                  correctOption: true,
                  options: true 
              } 
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    });
  }

  // --- START EXAM LOGIC ---
  async startAttempt(userId: string, examId: string) {
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new BadRequestException('User profile not found.');

    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true } 
    });
    if (!exam) throw new NotFoundException('Exam not found');

    let attempt = await this.prisma.testAttempt.findFirst({
      where: { userId, examId }
    });

    if (attempt && attempt.status === 'SUBMITTED') {
       throw new BadRequestException('You have already submitted this exam.');
    }

    if (!attempt) {
      try {
        attempt = await this.prisma.testAttempt.create({
            data: {
                userId,
                examId,
                status: 'IN_PROGRESS',
                startedAt: new Date()
            }
        });
      } catch (dbError) {
          throw new InternalServerErrorException('Database failed to initialize exam session.');
      }
    }

    const sanitizedQuestions = exam.questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      questionImage: q.questionImage,
      options: q.options,
      subject: q.subject,
      marks: q.marks,
      negative: q.negative,
      tags: [] 
    }));

    return {
      attemptId: attempt.id,
      exam: { 
          title: exam.title, 
          duration: exam.durationMin, 
          totalMarks: exam.totalMarks 
      },
      questions: sanitizedQuestions,
      serverTime: new Date(),
      startedAt: attempt.startedAt
    };
  }

  // --- SUBMIT EXAM LOGIC ---
  async submitAttempt(userId: string, examId: string, answers: { questionId: string, selectedOption: string, timeTaken: number }[]) {
    const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: { questions: true }
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const attempt = await this.prisma.testAttempt.findFirst({
        where: { userId, examId, status: 'IN_PROGRESS' }
    });
    if (!attempt) throw new BadRequestException('No active attempt found to submit.');

    let totalScore = 0;
    let physics = 0, chemistry = 0, maths = 0, biology = 0;
    let correct = 0, wrong = 0, skipped = 0;

    const answerRecords: any[] = [];

    for (const q of exam.questions) {
        const userAnswer = answers.find(a => a.questionId === q.id);
        const selected = userAnswer?.selectedOption?.toLowerCase().trim() || null; 
        const timeTaken = userAnswer?.timeTaken || 0;

        let marksAwarded = 0;
        let isCorrect = false;

        if (!selected) {
            skipped++;
        } else {
            let isMatch = false;
            const dbAnswerRaw = q.correctOption.toLowerCase();
            const dbAnswerClean = dbAnswerRaw.replace(/[\[\]'"]/g, '').trim();
            const isMultiple = dbAnswerClean.includes(',');
            
            if (isMultiple) {
                const dbSet = new Set(dbAnswerClean.split(',').map(s => s.trim()));
                const userSet = new Set(selected.split(',').map(s => s.trim()));
                if (dbSet.size === userSet.size && [...dbSet].every(val => userSet.has(val))) {
                    isMatch = true;
                }
            } else {
                if (selected === dbAnswerClean) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                isCorrect = true;
                marksAwarded = q.marks;
                correct++;
            } else {
                marksAwarded = q.negative; 
                wrong++;
            }
        }

        totalScore += marksAwarded;

        const subj = q.subject?.toUpperCase() || '';
        if (subj.includes('PHYSICS')) physics += marksAwarded;
        else if (subj.includes('CHEMISTRY')) chemistry += marksAwarded;
        else if (subj.includes('MATH')) maths += marksAwarded;
        else if (subj.includes('BIO')) biology += marksAwarded;

        answerRecords.push({
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: selected,
            isCorrect,
            marksAwarded,
            timeTaken
        });
    }

    await this.prisma.$transaction([
        this.prisma.answer.createMany({ data: answerRecords }),
        this.prisma.testAttempt.update({
            where: { id: attempt.id },
            data: {
                status: 'SUBMITTED',
                submittedAt: new Date(),
                totalScore,
                physics,
                chemistry,
                maths,
                correctCount: correct,
                wrongCount: wrong,
                skippedCount: skipped
            }
        })
    ]);

    return { 
        success: true, 
        message: "Exam Submitted Successfully" 
    };
  }

  async addQuestionsToExam(examId: string, questionBankIds: string[]) {
      const sourceQuestions = await this.prisma.questionBank.findMany({
          where: { id: { in: questionBankIds } }
      });

      if (sourceQuestions.length === 0) return { count: 0 };

      const examQuestionsData = sourceQuestions.map(q => ({
          examId,
          questionBankId: q.id,
          questionText: q.questionText,
          questionImage: q.questionImage,
          solutionImage: q.solutionImage,
          options: q.options || {},
          correctOption: q.correctOption,
          subject: q.subject,
          difficulty: q.difficulty,
          marks: q.marks,
          negative: q.negative,
          expectedTime: q.expectedTime
      }));

      const result = await this.prisma.question.createMany({
          data: examQuestionsData as any 
      });

      return { count: result.count };
  }
}