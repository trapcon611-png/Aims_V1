import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'owner', description: 'Your Enrollment ID or Admin Username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: '12345', description: 'Your Password' })
  @IsString()
  @IsNotEmpty()
  password: string;
}