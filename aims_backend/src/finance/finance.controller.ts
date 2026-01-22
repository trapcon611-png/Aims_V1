import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CollectFeeDto } from './dto/collect-fee.dto';

@Controller('finance')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

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
}