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

  // --- NEW: Fetch Student's Past Attempts for Dashboard ---
  @Get('my-attempts')
  @UseGuards(AuthGuard('jwt'))
  getMyAttempts(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) throw new BadRequestException('User identification failed.');
    return this.examsService.getMyAttempts(userId);
  }

  @Post('questions')
  @UseGuards(AuthGuard('jwt'))
  addQuestionsToExam(@Body() body: { examId: string; questionIds: string[] }) {
    return this.examsService.addQuestionsToExam(body.examId, body.questionIds);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Post(':id/attempt')
  @UseGuards(AuthGuard('jwt'))
  async startAttempt(@Request() req, @Param('id') examId: string) {
    const user = req.user;
    const userId = user?.userId || user?.id || user?.sub;

    if (!userId) {
      throw new BadRequestException('User identification failed. Please re-login.');
    }

    try {
      return await this.examsService.startAttempt(userId, examId);
    } catch (error) {
      console.error('[ExamsController] Error starting attempt:', error);
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