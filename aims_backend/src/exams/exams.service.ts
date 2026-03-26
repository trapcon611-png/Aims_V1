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

  async getMyAttempts(userId: string) {
    return this.prisma.testAttempt.findMany({
      where: { 
        userId,
        status: { in: ['SUBMITTED', 'EVALUATED'] } 
      },
      include: {
        exam: {
          select: { title: true, totalMarks: true } 
        },
        answers: {
          include: {
            question: {
              select: { 
                  subject: true, 
                  difficulty: true,
                  questionText: true,
                  questionImage: true,
                  solutionImage: true,
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

  // --- ADMIN: ANALYTICS LOGIC ---
  async getExamAnalytics(examId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { examId, status: { in: ['SUBMITTED', 'EVALUATED'] } },
      include: { user: { include: { studentProfile: true } } },
      orderBy: { totalScore: 'desc' }
    });

    return attempts.map((attempt, index) => ({
      studentId: attempt.userId,
      studentName: attempt.user.studentProfile?.fullName || attempt.user.username,
      score: attempt.totalScore,
      rank: index + 1,
      attempted: attempt.correctCount + attempt.wrongCount,
      correct: attempt.correctCount,
      wrong: attempt.wrongCount,
      accuracy: (attempt.correctCount + attempt.wrongCount) > 0 
        ? Math.round((attempt.correctCount / (attempt.correctCount + attempt.wrongCount)) * 100) 
        : 0
    }));
  }

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

  // --- NEW: SERVER-SIDE FILTERING & PAGINATION LOGIC ---

  async getPendingTopics(examType: string, subject: string) {
      const dbSourceExam = examType === 'NEET' ? 'MHT-CET' : examType;
      const topics = await this.prisma.questionBank.groupBy({
          by: ['topic'],
          where: { 
              difficulty: 'pending', 
              examType: dbSourceExam, 
              subject: { equals: subject, mode: 'insensitive' } 
          },
          _count: { id: true }
      });
      
      return topics
          .map(t => ({ name: t.topic || 'Uncategorized', count: t._count.id }))
          .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPendingQuestions(filters: any) {
      const { examType, subject, topic, searchQuery, showOnlyWithSolutions, skip = 0, take = 5 } = filters;
      
      const whereClause: any = { difficulty: 'pending' };
      
      // Map NEET to MHT-CET for DB source just like the frontend did
      if (examType) whereClause.examType = examType === 'NEET' ? 'MHT-CET' : examType;
      if (subject) whereClause.subject = { equals: subject, mode: 'insensitive' };
      if (topic) whereClause.topic = topic;
      if (searchQuery) whereClause.questionText = { contains: searchQuery, mode: 'insensitive' };
      
      if (showOnlyWithSolutions === 'true') {
           whereClause.OR = [
               { explanation: { not: null, notIn: ['', 'NaN'] } },
               { solutionImage: { not: null, notIn: ['null', 'NaN'] } }
           ];
      }

      const [questions, total] = await Promise.all([
          this.prisma.questionBank.findMany({
              where: whereClause,
              skip: Number(skip),
              take: Number(take),
              orderBy: { createdAt: 'asc' }
          }),
          this.prisma.questionBank.count({ where: whereClause })
      ]);

      return { questions, total };
  }

  async reviewQuestions(questions: any[]) {
    // Transaction ensures all checked-off questions update safely at the exact same time
    const updates = questions.map(q => this.prisma.questionBank.update({
      where: { id: q.id },
      data: {
        questionText: q.questionText,
        questionImage: q.questionImage, // Saved to DB
        solutionImage: q.solutionImage, // Saved to DB
        explanation: q.explanation,     // Saved to DB
        options: q.options,
        correctOption: q.correctOption,
        difficulty: q.difficulty,
        topic: q.topic,                 // Saved to DB
        type: q.type
      }
    }));
    
    await this.prisma.$transaction(updates);
    
    return { 
      success: true, 
      count: updates.length,
      message: `Successfully reviewed ${updates.length} questions.`
    };
  }

  async createQuestionFromAdmin(data: any) {
    // Automatically attribute it to the System Admin
    const systemTeacher = await this.prisma.teacherProfile.findFirst({
        where: { user: { username: 'system_admin' } }
    });

    if (!systemTeacher) throw new InternalServerErrorException('System Teacher profile not found');

    return this.prisma.questionBank.create({
        data: {
            ...data,
            createdById: systemTeacher.id,
            isActive: true,
            expectedTime: 60,
            marks: 4,
            negative: -1
        }
    });
  }

  async deletePendingQuestion(id: string) {
      return this.prisma.questionBank.delete({
          where: { id }
      });
  }
}