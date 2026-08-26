import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
// import { JwtAuthGuard, RolesGuard, Roles } from '../auth/...'; // Import your guards

@Controller('whatsapp')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'DIRECTOR')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    @Get('rules')
    async getRules() {
        return await this.whatsappService.getAutomationRules();
    }

    // ✨ UPDATED: Now accepts the automatedMessage string
    @Post('rules')
    async updateRules(@Body() body: { time: string, daysBefore: number, maxFollowUps: number, automatedMessage?: string }) {
        return await this.whatsappService.updateAutomationRules(body);
    }

    @Post('broadcast-reminders')
    async broadcastReminders(@Body() body: { targets: any[], customText: string | null }) {
        return await this.whatsappService.automatedFeeRemindersManual(
            body.targets, 
            body.customText || undefined
        );
    }

    @Get('status')
    async getStatus() {
        return await this.whatsappService.getSessionStatus();
    }

    @Get('qr')
    async getQr() {
        const qrData = await this.whatsappService.getSessionQr();
        return { qr: qrData };
    }

    @Post('reset')
    async resetSession() {
        return await this.whatsappService.resetSession();
    }
}