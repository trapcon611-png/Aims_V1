import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { WhatsappService } from './whatsapp.service'; // ✨ IMPORT SERVICE
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CollectFeeDto } from './dto/collect-fee.dto';

@Controller('finance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FinanceController {
  // ✨ INJECT BOTH SERVICES
  constructor(
    private readonly service: FinanceService,
    private readonly whatsappService: WhatsappService 
  ) {}

  // --- WHATSAPP BROADCAST ENDPOINT ---
  @Post('whatsapp/broadcast')
  @Roles('SUPER_ADMIN')
  async broadcastReminders(@Body() body: { targets: any[] }) {
    return await this.whatsappService.automatedFeeRemindersManual(body.targets);
  }

  // --- PARENT ACCESS ---
  @Get('my-summary')
  @Roles('PARENT')
  getMyFamilyFinancials(@Request() req) {
    return this.service.getParentFinancials(req.user.id);
  }

  // --- EXPENSE MANAGEMENT ---
  @Post('expenses')
  @Roles('SUPER_ADMIN')
  createExpense(@Body() body: CreateExpenseDto) {
    return this.service.createExpense(body);
  }

  @Get('expenses')
  @Roles('SUPER_ADMIN')
  findAllExpenses() {
    return this.service.findAllExpenses();
  }

  @Get('summary')
  @Roles('SUPER_ADMIN')
  getSummary() {
    return this.service.getSummary();
  }

  // --- FEE COLLECTION ---
  @Get('check-fee/:studentId')
  @Roles('SUPER_ADMIN')
  checkFee(@Param('studentId') id: string) {
    return this.service.checkFeeStatus(id);
  }

  @Post('collect')
  @Roles('SUPER_ADMIN')
  collectFee(@Body() body: CollectFeeDto) {
    return this.service.collectFee(body);
  }

  @Get('transactions')
  @Roles('SUPER_ADMIN')
  getTransactions() {
    return this.service.getAllTransactions();
  }
}