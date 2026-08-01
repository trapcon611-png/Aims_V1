import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
// import { JwtAuthGuard, RolesGuard, Roles } from '../auth/...'; // Import your guards

@Controller('whatsapp')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'DIRECTOR')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    // Expose the current rules to the frontend UI
    @Get('rules')
    async getRules() {
        return await this.whatsappService.getAutomationRules();
    }

    // Allow the Director to save new rules from the UI
    @Post('rules')
    async updateRules(@Body() body: { time: string, daysBefore: number, maxFollowUps: number }) {
        return await this.whatsappService.updateAutomationRules(body);
    }

    // Trigger the manual broadcast
    @Post('broadcast-reminders')
    async broadcastReminders(@Body() body: { targets: any[], customText: string | null }) {
        return await this.whatsappService.automatedFeeRemindersManual(
            body.targets, 
            body.customText || undefined
        );
    }

    // ✨ NEW: Expose WhatsApp Connection Status to the frontend
    @Get('status')
    async getStatus() {
        return await this.whatsappService.getSessionStatus('default');
    }

    // ✨ NEW: Fetch the QR Code to display in the frontend
    @Get('qr')
    async getQr() {
        const qrData = await this.whatsappService.getSessionQr('default');
        return { qr: qrData };
    }
}