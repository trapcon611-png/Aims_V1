import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.examsService.findAll();
  }

  // --- CRITICAL FIX: Explicit route for adding questions ---
  @Post('questions')
  @UseGuards(AuthGuard('jwt'))
  addQuestionsToExam(@Body() body: { examId: string; questionIds: string[] }) {
    console.log('API HIT: /exams/questions with body:', body);
    return this.examsService.addQuestionsToExam(body.examId, body.questionIds);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  // --- START EXAM WITH SAFETY CHECKS ---
  @Post(':id/attempt')
  @UseGuards(AuthGuard('jwt'))
  async startAttempt(@Request() req, @Param('id') examId: string) {
    // 1. Safe User ID Extraction
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub;

    console.log(`[ExamsController] Start Attempt Request | User: ${userId} | Exam: ${examId}`);

    if (!userId) {
      console.error('[ExamsController] Failed to extract User ID from token:', user);
      throw new BadRequestException('User identification failed. Please re-login.');
    }

    try {
      return await this.examsService.startAttempt(userId, examId);
    } catch (error) {
      console.error('[ExamsController] Error starting attempt:', error);
      // Re-throw appropriate exceptions or default to 500 with message
      if (error.status && error.status !== 500) throw error;
      throw new InternalServerErrorException(error.message || 'Failed to start exam session');
    }
  }

  @Post(':id/submit')
  @UseGuards(AuthGuard('jwt'))
  submitAttempt(
    @Request() req, 
    @Param('id') examId: string, 
    @Body() body: { answers: { questionId: string; selectedOption: string; timeTaken: number }[] }
  ) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!body.answers || !Array.isArray(body.answers)) {
       throw new BadRequestException('Invalid answer format');
    }
    return this.examsService.submitAttempt(userId, examId, body.answers);
  }
}