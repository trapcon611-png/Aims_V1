import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('exams')
export class ExamsController {
  private readonly logger = new Logger(ExamsController.name);

  constructor(private readonly examsService: ExamsService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll() {
    return this.examsService.findAll();
  }

  // --- CRITICAL FIX: Endpoint for adding questions to an exam ---
  @Post('questions')
  @UseGuards(AuthGuard('jwt'))
  addQuestionsToExam(@Body() body: { examId: string; questionIds: string[] }) {
    this.logger.log(`API HIT: Add questions to exam ${body.examId}`);
    return this.examsService.addQuestionsToExam(body.examId, body.questionIds);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  // --- START EXAM ---
  @Post(':id/attempt')
  @UseGuards(AuthGuard('jwt'))
  async startAttempt(@Request() req, @Param('id') examId: string) {
    // 1. Safe User ID Extraction (handles different JWT payloads)
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub;

    this.logger.log(`API HIT: Start Attempt | User: ${userId} | Exam: ${examId}`);

    if (!userId) {
      this.logger.error('User ID missing from token');
      throw new BadRequestException('User identification failed. Please re-login.');
    }

    try {
      return await this.examsService.startAttempt(userId, examId);
    } catch (error) {
      this.logger.error(`Error in startAttempt: ${error.message}`);
      // Pass through specific HTTP exceptions, wrap others in 500
      if (error.status && error.status !== 500) throw error;
      throw new InternalServerErrorException(error.message || 'Failed to start exam session');
    }
  }

  // --- SUBMIT EXAM ---
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