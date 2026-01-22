import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ExamsModule } from './exams/exams.module';
import { BatchesModule } from './batches/batches.module';
import { ResourcesModule } from './resources/resources.module';
import { NoticesModule } from './notices/notices.module';
import { FinanceModule } from './finance/finance.module';
import { AdmissionsModule } from './admissions/admissions.module';
import { ErpModule } from './erp/erp.module';

@Module({
  imports: [
    PrismaModule, 
    UsersModule, 
    AuthModule,
    ExamsModule,
    BatchesModule,
    ResourcesModule,
    NoticesModule,
    FinanceModule,
    AdmissionsModule,
    ErpModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}