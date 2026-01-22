import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBatchDto {
  @ApiProperty({ example: '11th JEE - Batch A', description: 'Name of the Batch' })
  @IsString()
  @IsNotEmpty()
  name: string;
}