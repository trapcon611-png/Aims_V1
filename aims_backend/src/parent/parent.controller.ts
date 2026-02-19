import { Controller, Get, Post, Body, Query, UseGuards, Request, Logger, InternalServerErrorException } from '@nestjs/common';
import { ParentService } from './parent.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('parent')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PARENT')
export class ParentController {
  private readonly logger = new Logger(ParentController.name);

  constructor(private readonly parentService: ParentService) {}

  @Get('my-summary')
  async getMySummary(@Request() req) {
    try {
        const userId = req.user?.userId || req.user?.id || req.user?.sub;
        if (!userId) throw new InternalServerErrorException('User context invalid');
        return await this.parentService.getParentSummary(userId);
    } catch (error) {
        this.logger.error('Failed to get parent summary', error);
        throw new InternalServerErrorException('Could not fetch parent data');
    }
  }

  @Get('student-attempts')
  async getStudentAttempts(@Query('studentId') studentUserId: string, @Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return await this.parentService.getStudentAttempts(userId, studentUserId);
  }

  @Get('notices')
  async getNotices(@Request() req) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return await this.parentService.getNotices(userId);
  }

  // --- NEW ENDPOINT ---
  @Post('subscribe')
  async subscribe(@Request() req, @Body() body: any) {
    const userId = req.user?.userId || req.user?.id || req.user?.sub;
    return await this.parentService.subscribeToPush(userId, body);
  }
}