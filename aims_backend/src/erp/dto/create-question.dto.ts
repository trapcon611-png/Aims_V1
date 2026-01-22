import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsArray()
  @IsNotEmpty()
  options: string[]; // ["Option A", "Option B", "Option C", "Option D"]

  @IsString()
  @IsNotEmpty()
  correctOption: string; // e.g. "0" for index 0 or "Option A"

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsString()
  @IsNotEmpty()
  difficulty: string; // Easy, Medium, Hard

  @IsNumber()
  marks: number;

  @IsNumber()
  negative: number;
}