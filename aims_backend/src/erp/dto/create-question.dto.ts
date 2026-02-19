import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  questionText: string;

  @IsOptional() // Changed from IsArray to IsOptional to allow JSON objects {a:..., b:...}
  options: any;

  @IsString()
  @IsNotEmpty()
  correctOption: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsOptional()
  @IsString()
  topic?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsString()
  @IsNotEmpty()
  difficulty: string; // Easy, Medium, Hard

  @IsNumber()
  marks: number;

  @IsOptional()
  @IsNumber()
  negative?: number;

  @IsOptional()
  @IsString()
  questionImage?: string;

  @IsOptional()
  @IsString()
  solutionImage?: string;
}