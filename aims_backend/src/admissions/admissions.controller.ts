import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AdmissionsService } from './admissions.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateAdmissionDto } from './dto/create-admission.dto';

@Controller('admissions')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdmissionsController {
  constructor(private readonly service: AdmissionsService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  // The error happened here previously because of syntax mistakes
  admitStudent(@Body() body: CreateAdmissionDto) {
    return this.service.admitStudent(body);
  }
}