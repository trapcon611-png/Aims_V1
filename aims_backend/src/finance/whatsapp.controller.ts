import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
// import { JwtAuthGuard, RolesGuard, Roles } from '../auth/...'; // Import your guards

@Controller('whatsapp')
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('SUPER_ADMIN', 'DIRECTOR')
export class WhatsappController {
    constructor(private readonly whatsappService: WhatsappService) {}

    @Post('broadcast-reminders')
    async broadcastReminders(@Body() body: { targets: any[], customText: string | null }) {
        // We add "|| undefined" so TypeScript is happy with the service signature
        return await this.whatsappService.automatedFeeRemindersManual(
            body.targets, 
            body.customText || undefined
        );
    }
}