import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { ErpService } from './erp.service';
import { CreateQuestionDto } from './dto/create-question.dto'; 
import { CreateBatchDto } from '../batches/dto/create-batch.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('erp')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ErpController {
  constructor(private readonly erpService: ErpService) {}

  // --- BATCH MANAGEMENT ---
  @Get('batches')
  @Roles('SUPER_ADMIN', 'TEACHER')
  findAllBatches() {
    return this.erpService.getAllBatches();
  }

  @Post('batches')
  @Roles('SUPER_ADMIN')
  createBatch(@Body() dto: any) { 
    return this.erpService.createBatch(dto);
  }

  @Patch('batches/:id')
  @Roles('SUPER_ADMIN')
  updateBatch(@Param('id') id: string, @Body() dto: any) {
    return this.erpService.updateBatch(id, dto);
  }

  // --- FINANCE (EXPENSES & FEES) ---
  @Get('expenses')
  @Roles('SUPER_ADMIN')
  findAllExpenses() {
    return this.erpService.getAllExpenses();
  }

  @Post('expenses')
  @Roles('SUPER_ADMIN')
  createExpense(@Body() dto: any) {
    return this.erpService.createExpense(dto);
  }

  @Delete('expenses/:id')
  @Roles('SUPER_ADMIN')
  deleteExpense(@Param('id') id: string) {
    return this.erpService.deleteExpense(id);
  }

  @Get('summary')
  @Roles('SUPER_ADMIN')
  getSummary() {
    return this.erpService.getFinancialSummary();
  }

  @Post('fees')
  @Roles('SUPER_ADMIN')
  collectFee(@Body() data: { studentId: string; amount: number; remarks?: string; paymentMode?: string; transactionId?: string }) {
    return this.erpService.collectFee(data);
  }

  // --- NEW: FEE HISTORY ---
  @Get('fees')
  @Roles('SUPER_ADMIN')
  getAllFees() {
    return this.erpService.getAllFeeRecords();
  }

  // --- EXAMS & QUESTION BANK ---
  @Get('exams')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getAllExams() {
    return this.erpService.getAllExams();
  }

  @Post('exams')
  @Roles('SUPER_ADMIN', 'TEACHER')
  createExam(@Body() dto: any) {
    return this.erpService.createExam(dto);
  }

  @Get('exams/:id')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getExamById(@Param('id') id: string) {
    return this.erpService.getExamById(id);
  }

  // NEW: Bulk Import Questions Endpoint (Fixes 500 Error)
  @Post('exams/:id/import')
  @Roles('SUPER_ADMIN', 'TEACHER')
  importQuestions(@Param('id') id: string, @Body() body: { questions: any[] }) {
    return this.erpService.importQuestionsToExam(id, body.questions);
  }

  @Delete('exams/:id')
  @Roles('SUPER_ADMIN', 'TEACHER')
  deleteExam(@Param('id') id: string) {
      return this.erpService.deleteExam(id);
  }

  @Get('questions')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getQuestionBank() {
    return this.erpService.getQuestionBank();
  }

  @Post('questions')
  @Roles('SUPER_ADMIN', 'TEACHER')
  createQuestion(@Body() dto: CreateQuestionDto) {
    return this.erpService.createQuestionInBank(dto);
  }

  // --- ACADEMICS ---
  @Get('academics/results')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getExamResults(@Query('examId') examId: string, @Query('batchId') batchId: string) {
    return this.erpService.getExamResults(examId, batchId);
  }

  @Get('academics/attendance')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getAttendanceStats(@Query('batchId') batchId: string) {
    return this.erpService.getAttendanceStats(batchId);
  }

  @Post('marks')
  @Roles('SUPER_ADMIN', 'TEACHER')
  updateMarks(@Body() data: any) {
    return this.erpService.updateMarks(data);
  }

  @Post('attendance')
  @Roles('SUPER_ADMIN', 'TEACHER')
  saveAttendance(@Body() data: any) {
    return this.erpService.saveAttendance(data);
  }

  @Get('attempts/:username')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getStudentAttempts(@Param('username') username: string) {
    return this.erpService.getStudentAttempts(username);
  }

  @Get('attendance-history/:username')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getAttendanceHistory(@Param('username') username: string) {
    return this.erpService.getAttendanceHistory(username);
  }

  // --- SECURITY ---
  @Post('security/admins')
  @Roles('SUPER_ADMIN')
  createSystemAdmin(@Body() dto: { username: string; password: string; role: 'SUPER_ADMIN' | 'TEACHER' }) {
    return this.erpService.createSystemAdmin(dto);
  }

  @Get('security/admins')
  @Roles('SUPER_ADMIN')
  getSystemAdmins() {
    return this.erpService.getSystemAdmins();
  }

  @Get('security/directory')
  @Roles('SUPER_ADMIN', 'SECURITY_ADMIN')
  getSecurityDirectory() {
    return this.erpService.getSecurityDirectory();
  }

  @Patch('security/mobile-visibility')
  @Roles('SUPER_ADMIN', 'SECURITY_ADMIN')
  toggleMobileVisibility(@Body() body: { parentId: string, isVisible: boolean }) {
    return this.erpService.toggleMobileVisibility(body.parentId, body.isVisible);
  }

  @Patch('security/mobile-visibility/all')
  @Roles('SUPER_ADMIN', 'SECURITY_ADMIN')
  toggleAllMobileVisibility(@Body() body: { isVisible: boolean }) {
    return this.erpService.toggleAllMobileVisibility(body.isVisible);
  }

  // --- ADMISSIONS & STUDENTS ---
  @Post('admissions')
  @Roles('SUPER_ADMIN', 'TEACHER')
  registerStudent(@Body() dto: any) { 
    return this.erpService.registerStudent(dto);
  }

  @Get('students')
  @Roles('SUPER_ADMIN', 'TEACHER', 'SECURITY_ADMIN')
  getAllStudents() {
    return this.erpService.getStudentDirectory();
  }

  // --- ENQUIRIES (CRM) ---
  @Get('enquiries')
  @Roles('SUPER_ADMIN', 'TEACHER')
  getEnquiries() {
    return this.erpService.getEnquiries();
  }

  @Post('enquiries')
  @Roles('SUPER_ADMIN', 'TEACHER')
  createEnquiry(@Body() data: any) {
    return this.erpService.createEnquiry(data);
  }

  @Patch('enquiries/:id/status')
  @Roles('SUPER_ADMIN', 'TEACHER')
  updateEnquiryStatus(@Param('id') id: string, @Body() body: { status: string, followUpCount?: number }) {
    return this.erpService.updateEnquiryStatus(id, body.status, body.followUpCount);
  }

  // --- CONTENT (RESOURCES & NOTICES) ---
  @Get('resources')
  @Roles('SUPER_ADMIN', 'TEACHER', 'STUDENT')
  getResources() {
    return this.erpService.getResources();
  }

  @Post('resources')
  @Roles('SUPER_ADMIN', 'TEACHER')
  createResource(@Body() data: any) {
    return this.erpService.createResource(data);
  }

  @Delete('resources/:id')
  @Roles('SUPER_ADMIN', 'TEACHER')
  deleteResource(@Param('id') id: string) {
    return this.erpService.deleteResource(id);
  }

  @Get('notices')
  @Roles('SUPER_ADMIN', 'TEACHER', 'STUDENT')
  getNotices() {
    return this.erpService.getNotices();
  }

  @Post('notices')
  @Roles('SUPER_ADMIN', 'TEACHER')
  createNotice(@Body() data: any) {
    return this.erpService.createNotice(data);
  }

  @Delete('notices/:id')
  @Roles('SUPER_ADMIN', 'TEACHER')
  deleteNotice(@Param('id') id: string) {
    return this.erpService.deleteNotice(id);
  }
  
  @Get('seed')
  @Roles('SUPER_ADMIN')
  seedSystem() {
    return this.erpService.seedSystem();
  }
}