import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Only return exams that are published
    return this.prisma.exam.findMany({
      where: { isPublished: true },
      orderBy: { scheduledAt: 'desc' },
      include: { batch: true } // Include batch name for UI
    });
  }

  async findOne(id: string) {
    return this.prisma.exam.findUnique({
      where: { id },
      include: { questions: true }
    });
  }

  // --- START EXAM LOGIC ---
  async startAttempt(userId: string, examId: string) {
    // 1. Verify User Exists
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new BadRequestException('User profile not found.');

    // 2. Verify Exam
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: true } // Fetch questions to send to client
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // 3. Check for existing attempt
    let attempt = await this.prisma.testAttempt.findFirst({
      where: { userId, examId }
    });

    // If already submitted, block re-entry
    if (attempt && attempt.status === 'SUBMITTED') {
       throw new BadRequestException('You have already submitted this exam.');
    }

    // 4. Create Attempt if new (Start Timer)
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

    // 5. Sanitize Questions (CRITICAL SECURITY STEP)
    // We map over questions and REMOVE 'correctOption' so students can't inspect element to cheat
    const sanitizedQuestions = exam.questions.map(q => ({
      id: q.id,
      questionText: q.questionText,
      questionImage: q.questionImage, // Include Image if present
      options: q.options, // This is the JSON object {a:..., b:...}
      subject: q.subject,
      marks: q.marks,
      negative: q.negative,
      // topic: q.topic // Removed as it might not exist on Question model
      tags: [] // If tags are added to Question model later, pass them here
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

  // --- SUBMIT EXAM LOGIC (UPDATED FOR MULTI/INTEGER) ---
  async submitAttempt(userId: string, examId: string, answers: { questionId: string, selectedOption: string, timeTaken: number }[]) {
    // 1. Fetch Exam with Answer Key
    const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        include: { questions: true }
    });
    if (!exam) throw new NotFoundException('Exam not found');

    // 2. Validate Attempt
    const attempt = await this.prisma.testAttempt.findFirst({
        where: { userId, examId, status: 'IN_PROGRESS' }
    });
    if (!attempt) throw new BadRequestException('No active attempt found to submit.');

    // 3. Calculate Score
    let totalScore = 0;
    let physics = 0, chemistry = 0, maths = 0, biology = 0; // Added biology support
    let correct = 0, wrong = 0, skipped = 0;

    // Explicitly typed as any[] to avoid 'never[]' error
    const answerRecords: any[] = [];

    // Loop through every question in the exam
    for (const q of exam.questions) {
        const userAnswer = answers.find(a => a.questionId === q.id);
        const selected = userAnswer?.selectedOption?.toLowerCase().trim() || null; // Normalize
        const timeTaken = userAnswer?.timeTaken || 0;

        let marksAwarded = 0;
        let isCorrect = false;

        if (!selected) {
            skipped++;
        } else {
            // --- GRADING LOGIC START ---
            let isMatch = false;
            
            // Clean DB Answer: Remove brackets [], quotes '', spaces
            // E.g., "[A, B]" -> "a,b"
            const dbAnswerRaw = q.correctOption.toLowerCase();
            const dbAnswerClean = dbAnswerRaw.replace(/[\[\]'"]/g, '').trim();

            // Determine Type based on DB Answer format
            // If it has comma, treat as Multiple Choice Set comparison
            const isMultiple = dbAnswerClean.includes(',');
            
            if (isMultiple) {
                // MULTIPLE CORRECT: Sort and Compare arrays
                const dbSet = new Set(dbAnswerClean.split(',').map(s => s.trim()));
                const userSet = new Set(selected.split(',').map(s => s.trim()));
                
                // Exact Match logic (Partial marking can be added here if needed)
                if (dbSet.size === userSet.size && [...dbSet].every(val => userSet.has(val))) {
                    isMatch = true;
                }
            } else {
                // SINGLE or INTEGER
                // For Integer "[4]", dbAnswerClean is "4". User sends "4".
                // For Single "[A]", dbAnswerClean is "a". User sends "a".
                if (selected === dbAnswerClean) {
                    isMatch = true;
                }
            }
            // --- GRADING LOGIC END ---

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

        // Subject-wise Aggregation
        const subj = q.subject?.toUpperCase() || '';
        if (subj.includes('PHYSICS')) physics += marksAwarded;
        else if (subj.includes('CHEMISTRY')) chemistry += marksAwarded;
        else if (subj.includes('MATH')) maths += marksAwarded;
        else if (subj.includes('BIO')) biology += marksAwarded;

        // Prepare Answer Record
        answerRecords.push({
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: selected,
            isCorrect,
            marksAwarded,
            timeTaken
        });
    }

    // 4. Transaction: Save Answers & Update Attempt
    await this.prisma.$transaction([
        // 1. Bulk insert detailed answers
        this.prisma.answer.createMany({ data: answerRecords }),
        
        // 2. Update the attempt with final score
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
        message: "Exam Submitted Successfully",
        score: totalScore, 
        correct,
        wrong 
    };
  }

  // --- ADMIN: COPY QUESTIONS TO EXAM ---
  async addQuestionsToExam(examId: string, questionBankIds: string[]) {
      // 1. Fetch the source questions from QuestionBank
      const sourceQuestions = await this.prisma.questionBank.findMany({
          where: { id: { in: questionBankIds } }
      });

      if (sourceQuestions.length === 0) return { count: 0 };

      // 2. Transform them into Exam Questions
      // We assume the schema has separate 'Question' table for exams distinct from 'QuestionBank'
      const examQuestionsData = sourceQuestions.map(q => ({
          examId,
          questionBankId: q.id,
          questionText: q.questionText,
          questionImage: q.questionImage, // Copy Image URL
          solutionImage: q.solutionImage, // Copy Solution URL
          options: q.options || {}, // JSON copy
          correctOption: q.correctOption,
          subject: q.subject,
          difficulty: q.difficulty,
          marks: q.marks,
          negative: q.negative,
          expectedTime: q.expectedTime
      }));

      // 3. Bulk Insert
      const result = await this.prisma.question.createMany({
          data: examQuestionsData as any // Type assertion for Prisma compatibility
      });

      return { count: result.count };
  }
}