import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

// 1. Strictly define the roles
export enum Role {
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string; // Enrollment ID

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(Role)
  role: Role;
}