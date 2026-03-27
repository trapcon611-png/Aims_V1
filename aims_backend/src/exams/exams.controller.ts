import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, InternalServerErrorException, Query, Delete } from '@nestjs/common';
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

  @Get('my-attempts')
  @UseGuards(AuthGuard('jwt'))
  getMyAttempts(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) throw new BadRequestException('User identification failed.');
    return this.examsService.getMyAttempts(userId);
  }

  @Get('student-attempts')
  @UseGuards(AuthGuard('jwt'))
  getStudentAttempts(@Query('studentId') studentId: string) {
    if (!studentId) throw new BadRequestException('Student ID is required.');
    return this.examsService.getMyAttempts(studentId);
  }

  @Get(':id/analytics')
  @UseGuards(AuthGuard('jwt'))
  getExamAnalytics(@Param('id') id: string) {
    return this.examsService.getExamAnalytics(id);
  }

  @Post('questions')
  @UseGuards(AuthGuard('jwt'))
  addQuestionsToExam(@Body() body: { examId: string; questionIds: string[] }) {
    return this.examsService.addQuestionsToExam(body.examId, body.questionIds);
  }

  // --- QUESTION BANK API ROUTES ---

  @Get('pending-topics')
  getPendingTopics(@Query('examType') examType: string, @Query('subject') subject: string) {
      return this.examsService.getPendingTopics(examType, subject);
  }

  @Get('available-topics')
  getAvailableTopics(@Query('examType') examType: string) {
      return this.examsService.getAvailableTopics(examType);
  }

  @Get('pending-questions')
  getPendingQuestions(
      @Query('examType') examType: string,
      @Query('subject') subject: string,
      @Query('topic') topic: string,
      @Query('searchQuery') searchQuery: string,
      @Query('showOnlyWithSolutions') showOnlyWithSolutions: string,
      @Query('page') page: string,
  ) {
      const take = 5; 
      const skip = (Number(page || 1) - 1) * take;
      return this.examsService.getPendingQuestions({ 
          examType, subject, topic, searchQuery, showOnlyWithSolutions, skip, take 
      });
  }

  // ✨ NEW: FETCH APPROVED QUESTIONS (Paginated for Manual Editor)
  @Get('approved-questions')
  getApprovedQuestions(
      @Query('examType') examType: string,
      @Query('subject') subject: string,
      @Query('topic') topic: string,
      @Query('searchQuery') searchQuery: string,
      @Query('page') page: string,
  ) {
      const take = 20; // 20 items per page for faster manual selection
      const skip = (Number(page || 1) - 1) * take;
      return this.examsService.getApprovedQuestions({ 
          examType, subject, topic, searchQuery, skip, take 
      });
  }

  @Post('review-questions')
  reviewQuestions(@Body() body: { questions: any[] }) {
    if (!body.questions || !Array.isArray(body.questions)) {
      throw new BadRequestException('A valid questions array is required');
    }
    return this.examsService.reviewQuestions(body.questions);
  }

  @Post('create-question')
  createQuestion(@Body() body: any) {
    if (!body || !body.questionText) {
      throw new BadRequestException('Invalid question payload');
    }
    return this.examsService.createQuestionFromAdmin(body);
  }

  @Delete('pending-questions/:id')
  deletePendingQuestion(@Param('id') id: string) {
      return this.examsService.deletePendingQuestion(id);
  }

  @Post('auto-build-db')
  autoBuildFromDb(@Body() body: any) {
      return this.examsService.autoBuildFromDb(body);
  }

  // --- GENERIC ROUTES (MUST BE AT THE BOTTOM) ---

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
    } catch (error: any) {
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