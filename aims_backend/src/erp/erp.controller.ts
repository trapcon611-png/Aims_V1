import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { ErpService } from './erp.service';
import { CreateBatchDto } from '../batches/dto/create-batch.dto';
import { CreateAdmissionDto } from '../admissions/dto/create-admission.dto';
import { CreateExpenseDto } from '../finance/dto/create-expense.dto';

@Controller('erp')
export class ErpController {
  constructor(private readonly erpService: ErpService) {}

  // --- SECURITY PANEL ENDPOINTS ---
  
  @Post('security/admins')
  createSystemAdmin(@Body() dto: { username: string; password: string; role: 'SUPER_ADMIN' | 'TEACHER' }) {
    return this.erpService.createSystemAdmin(dto);
  }

  @Get('security/admins')
  getSystemAdmins() {
    return this.erpService.getSystemAdmins();
  }

  @Get('security/directory')
  getSecurityDirectory() {
    return this.erpService.getSecurityDirectory();
  }

  @Patch('security/mobile-visibility')
  toggleMobileVisibility(@Body() body: { parentId: string, isVisible: boolean }) {
    return this.erpService.toggleMobileVisibility(body.parentId, body.isVisible);
  }

  @Patch('security/mobile-visibility/all')
  toggleAllMobileVisibility(@Body() body: { isVisible: boolean }) {
    return this.erpService.toggleAllMobileVisibility(body.isVisible);
  }

  // --- ADMISSIONS & STUDENTS ---
  
  @Post('admissions')
  registerStudent(@Body() dto: any) { // Using 'any' to accept extended fields (waiveOff, installments, etc.)
    return this.erpService.registerStudent(dto);
  }

  @Get('students')
  getAllStudents() {
    return this.erpService.getStudentDirectory();
  }

  // --- BATCH MANAGEMENT ---
  
  @Get('batches')
  findAllBatches() {
    return this.erpService.getAllBatches();
  }

  @Post('batches')
  createBatch(@Body() dto: any) { // Using 'any' to accept 'fee' and 'strength' before DTO strict update
    return this.erpService.createBatch(dto);
  }

  // --- FINANCE (EXPENSES & FEES) ---
  
  @Get('expenses')
  findAllExpenses() {
    return this.erpService.getAllExpenses();
  }

  @Post('expenses')
  createExpense(@Body() dto: any) {
    return this.erpService.createExpense(dto);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.erpService.deleteExpense(id);
  }

  @Get('summary')
  getSummary() {
    return this.erpService.getFinancialSummary();
  }

  @Post('fees')
  collectFee(@Body() data: { studentId: string; amount: number; remarks?: string; paymentMode?: string; transactionId?: string }) {
    return this.erpService.collectFee(data);
  }

  // --- ENQUIRIES (CRM) ---
  
  @Get('enquiries')
  getEnquiries() {
    return this.erpService.getEnquiries();
  }

  @Post('enquiries')
  createEnquiry(@Body() data: any) {
    // data includes { studentName, mobile, course, allotedTo, remarks }
    return this.erpService.createEnquiry(data);
  }

  @Patch('enquiries/:id/status')
  updateEnquiryStatus(@Param('id') id: string, @Body() body: { status: string, followUpCount?: number }) {
    return this.erpService.updateEnquiryStatus(id, body.status, body.followUpCount);
  }

  // --- CONTENT (RESOURCES & NOTICES) ---
  
  @Get('resources')
  getResources() {
    return this.erpService.getResources();
  }

  @Post('resources')
  createResource(@Body() data: any) {
    return this.erpService.createResource(data);
  }

  @Delete('resources/:id')
  deleteResource(@Param('id') id: string) {
    return this.erpService.deleteResource(id);
  }

  @Get('notices')
  getNotices() {
    return this.erpService.getNotices();
  }

  @Post('notices')
  createNotice(@Body() data: any) {
    return this.erpService.createNotice(data);
  }

  @Delete('notices/:id')
  deleteNotice(@Param('id') id: string) {
    return this.erpService.deleteNotice(id);
  }

  // --- EXAMS & QUESTION BANK ---
  
  @Get('exams')
  getAllExams() {
    return this.erpService.getAllExams();
  }

  @Post('exams')
  createExam(@Body() dto: any) {
    return this.erpService.createExam(dto);
  }

  @Get('exams/:id')
  getExamById(@Param('id') id: string) {
    return this.erpService.getExamById(id);
  }

  @Get('questions')
  getQuestionBank() {
    return this.erpService.getQuestionBank();
  }

  @Post('questions')
  createQuestion(@Body() dto: any) {
    return this.erpService.createQuestionInBank(dto);
  }

  // --- ACADEMICS (RESULTS & ATTENDANCE) ---
  
  @Get('academics/results')
  getExamResults(@Query('examId') examId: string, @Query('batchId') batchId: string) {
    return this.erpService.getExamResults(examId, batchId);
  }

  @Get('academics/attendance')
  getAttendanceStats(@Query('batchId') batchId: string) {
    return this.erpService.getAttendanceStats(batchId);
  }

  @Post('marks')
  updateMarks(@Body() data: any) {
    return this.erpService.updateMarks(data);
  }

  @Post('attendance')
  saveAttendance(@Body() data: any) {
    return this.erpService.saveAttendance(data);
  }

  // --- STUDENT SPECIFIC DATA (Used by Student App) ---
  
  @Get('attempts/:username')
  getStudentAttempts(@Param('username') username: string) {
    return this.erpService.getStudentAttempts(username);
  }

  @Get('attendance-history/:username')
  getAttendanceHistory(@Param('username') username: string) {
    return this.erpService.getAttendanceHistory(username);
  }

  // --- SYSTEM UTILS ---
  
  @Get('seed')
  seedSystem() {
    return this.erpService.seedSystem();
  }
}