import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Check your PrismaService path
import { CreateUserDto } from './dto/create-student.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // 1. Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: createUserDto.username },
    });

    if (existingUser) {
      throw new ConflictException('Enrollment ID already exists');
    }

    // 2. Hash the password (Security First!)
    const salt = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, salt);

    // 3. Save to Database
    // Note: If you added 'fullName' or 'phone' to your Prisma Schema, add them here too.
    return this.prisma.user.create({
      data: {
        username: createUserDto.username,
        password: hashedPassword,
        role: createUserDto.role,
      },
      // Select only safe fields to return (hide the password)
      select: {
        id: true,
        username: true,
        role: true,
      }
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, username: true, role: true }
    });
  }
  
  // Used by AuthService usually, but good to keep here
  async findOne(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }
}