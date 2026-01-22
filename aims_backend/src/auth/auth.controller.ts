import { Body, Controller, Post, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { SignInDto } from './dto/sign-in.dto'; // <--- Import the definition

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  // We changed 'Record<string, any>' to 'SignInDto' below
  signIn(@Body() signInDto: SignInDto) { 
    return this.authService.signIn(signInDto.username, signInDto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}