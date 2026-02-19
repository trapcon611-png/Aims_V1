import { Controller, Get, Post, Body, Param, UseGuards, Request, BadRequestException, Logger } from '@nestjs/common';
import { StudentService } from './student.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('student')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('STUDENT') 
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(private readonly studentService: StudentService) {}

  private getUserId(req: any): string {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    if (!userId) {
        this.logger.error('User ID missing in request', req.user);
        throw new BadRequestException('User identification failed.');
    }
    return userId;
  }

  @Get('dashboard')
  getDashboard(@Request() req) {
    return this.studentService.getStudentDashboard(this.getUserId(req));
  }

  @Get('exams')
  getAvailableExams() {
    return this.studentService.getAvailableExams();
  }

  @Post('exam/:id/attempt')
  startAttempt(@Request() req, @Param('id') examId: string) {
    return this.studentService.startAttempt(this.getUserId(req), examId);
  }

  @Post('exam/:id/submit')
  submitExam(@Request() req, @Param('id') examId: string, @Body() body: { answers: any[] }) {
    return this.studentService.submitExam(this.getUserId(req), examId, body.answers);
  }

  @Get('results')
  getResults(@Request() req) {
    return this.studentService.getStudentResults(this.getUserId(req));
  }

  @Get('resources')
  getResources() {
    return this.studentService.getResources();
  }

  @Get('notices')
  getNotices() {
    return this.studentService.getNotices();
  }
  
  @Post('subscribe')
  subscribe(@Request() req, @Body() body: any) {
    return this.studentService.subscribeToPush(this.getUserId(req), body);
  }
}