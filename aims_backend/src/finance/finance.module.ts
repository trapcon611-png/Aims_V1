import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { WhatsappService } from './whatsapp.service';
import { FinanceController } from './finance.controller';
import { WhatsappController } from './whatsapp.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FinanceController, WhatsappController],
  providers: [FinanceService, WhatsappService],
  exports: [FinanceService]
})
export class FinanceModule {}