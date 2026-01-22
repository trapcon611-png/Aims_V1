import { IsString, IsNotEmpty, IsNumber, IsArray, IsDateString, IsOptional } from 'class-validator';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  durationMin: number;

  @IsNumber()
  totalMarks: number;

  @IsDateString()
  scheduledAt: string;

  @IsArray()
  questionBankIds: string[]; // List of IDs from the Master Question Bank
}