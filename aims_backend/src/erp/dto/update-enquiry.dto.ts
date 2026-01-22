import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum EnquiryStatus {
  PENDING = 'PENDING',
  CALLED = 'CALLED',
  ADMITTED = 'ADMITTED',
  CLOSED = 'CLOSED',
}

export class CreateEnquiryDto {
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsOptional()
  @IsString()
  course?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}