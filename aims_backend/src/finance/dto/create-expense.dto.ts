import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString, IsOptional } from 'class-validator';

export class CreateExpenseDto {
  @ApiProperty({ example: 'Physics Books Stock', description: 'Title of the expense' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Books', description: 'Category (Rent, Salary, Marketing, etc.)' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: '15000', description: 'Total Cost' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'Arihant Pub', required: false })
  @IsString()
  @IsOptional()
  vendor: string;

  @ApiProperty({ example: '50', required: false, description: 'Quantity bought' })
  @IsNumberString()
  @IsOptional()
  quantity: string;

  @ApiProperty({ example: '300', required: false, description: 'Price per item' })
  @IsNumberString()
  @IsOptional()
  unitPrice: string;

  @ApiProperty({ example: 'Purchased for 11th Batch', required: false })
  @IsString()
  @IsOptional()
  description: string;
}