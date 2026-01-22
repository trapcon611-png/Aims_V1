import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumberString } from 'class-validator';

export class CollectFeeDto {
  @ApiProperty({ example: 'student-profile-id-here', description: 'ID of the Student Profile' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ example: '10000', description: 'Amount being paid now' })
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'First Installment via UPI', description: 'Any notes' })
  @IsString()
  remarks: string;
}