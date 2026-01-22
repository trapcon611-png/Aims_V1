import { IsString, IsNotEmpty, IsInt, Min, IsNumber } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startYear: string;

  @IsInt()
  @Min(1)
  strength: number;

  // --- NEW FIELD ---
  @IsNumber()
  @Min(0)
  fee: number; // Standard fee for this batch (e.g., 50000)
}