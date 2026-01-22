import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNoticeDto {
  @ApiProperty({ example: 'Holiday Tomorrow', description: 'Notice Title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Due to heavy rains...', description: 'Notice Content' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'batch-id-here', required: false, description: 'Leave empty for Everyone' })
  @IsString()
  @IsOptional()
  batchId: string;
}