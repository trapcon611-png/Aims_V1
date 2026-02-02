import { IsNotEmpty, IsString, IsInt, IsDateString, IsOptional, Min, IsUUID } from 'class-validator';

export class CreateExamDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsInt()
  @Min(1)
  durationMin: number;

  @IsInt()
  @Min(1)
  totalMarks: number;

  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsString()
  @IsOptional()
  batchId?: string; // Optional: if exam is open to all, this might be null

  @IsString()
  @IsOptional()
  examType?: string; // e.g., 'JEE_MAINS', 'NEET'
}