import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-student.dto'; // Ensure this path matches your folder structure

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // THIS IS THE NEW PART
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}