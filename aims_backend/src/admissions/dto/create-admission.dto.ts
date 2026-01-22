import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString, IsOptional } from 'class-validator';

export class CreateAdmissionDto {
  @ApiProperty({ example: '2026001', description: 'Unique Enrollment ID for login' })
  @IsString()
  @IsNotEmpty()
  enrollmentId: string;

  @ApiProperty({ example: 'Rahul Sharma', description: 'Full Name of the Student' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '1234567890', description: 'Student Mobile Number' })
  @IsString()
  @IsNotEmpty()
  studentMobile: string;

  @ApiProperty({ example: '9876543210', description: 'Parent Mobile Number (Used for Parent Login)' })
  @IsString()
  @IsNotEmpty()
  parentMobile: string;

  @ApiProperty({ example: 'batch-uuid-here', description: 'The ID of the Batch they are joining' })
  @IsString()
  @IsOptional()
  batchId: string;

  @ApiProperty({ example: '50000', description: 'Total Fees agreed upon admission' })
  @IsNumberString()
  @IsNotEmpty()
  feeAgreed: string;

  @ApiProperty({ example: 'welcome123', description: 'Initial Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}