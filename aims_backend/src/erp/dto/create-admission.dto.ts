import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, IsDateString, IsInt } from 'class-validator';

export class CreateAdmissionDto {
  // --- Existing Fields ---
  @IsString()
  @IsNotEmpty()
  studentName: string;

  @IsString()
  @IsNotEmpty()
  studentId: string; // The Username

  @IsString()
  @IsNotEmpty()
  batchId: string;

  // --- NEW FEE FIELDS ---
  @IsNumber()
  @Min(0)
  fees: number; // The Agreed Base Fee

  @IsNumber()
  @IsOptional()
  @Min(0)
  waiveOff?: number; // Discount amount

  @IsNumber()
  @IsOptional()
  @Min(0)
  penalty?: number; // Daily late penalty

  @IsInt()
  @IsOptional()
  @Min(1)
  installments?: number; // Number of installments (1-6)

  @IsDateString()
  @IsOptional()
  installmentDate?: string; // Date for next payment

  @IsDateString()
  @IsNotEmpty()
  agreedDate: string; // Date of agreement signing

  // --- Parent & Auth Fields ---
  @IsString()
  @IsOptional()
  studentPassword?: string;

  @IsString()
  @IsNotEmpty()
  parentId: string;

  @IsString()
  @IsOptional()
  parentPassword?: string;

  @IsString()
  @IsOptional()
  studentPhone?: string;

  @IsString()
  @IsOptional()
  parentPhone?: string;
}