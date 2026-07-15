import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
// import { JwtAuthGuard, RolesGuard, Roles } from '../auth/...'; // Import your guards

@Controller('whatsapp')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'DIRECTOR')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    @Post('broadcast-reminders')
    async broadcastReminders(@Body() targets: any[]) {
        // Triggers the manual dispatch function you wrote in the service
        return await this.whatsappService.automatedFeeRemindersManual(targets);
    }
}