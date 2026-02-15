import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString, IsOptional } from 'class-validator';

export class CollectFeeDto {
  @ApiProperty({ example: 'student-profile-id-here', description: 'ID of the Student Profile' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: '10000', description: 'Amount being paid now' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'First Installment via UPI', description: 'Any notes', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ example: 'CASH', description: 'Payment Mode (e.g. CASH, UPI)', required: false })
  @IsString()
  @IsOptional()
  paymentMode?: string;

  @ApiProperty({ example: 'TXN-12345', description: 'Transaction Reference ID', required: false })
  @IsString()
  @IsOptional()
  transactionId?: string;
}