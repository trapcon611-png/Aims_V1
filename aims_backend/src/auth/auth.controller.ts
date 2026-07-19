// ✨ ADD Req to your imports
import { Body, Controller, Post, HttpCode, HttpStatus, Get, UseGuards, Request, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { SignInDto } from './dto/sign-in.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  // ✨ Capture the raw request to get the IP and Device Info
  signIn(@Body() signInDto: SignInDto, @Req() req: any) { 
    // Extract IP and Browser User-Agent, falling back to 'UNKNOWN' if missing
    const ip = req.ip || req.connection?.remoteAddress || 'UNKNOWN';
    const userAgent = req.headers['user-agent'] || 'UNKNOWN';
    
    // Pass them to the service
    return this.authService.signIn(signInDto.username, signInDto.password, ip, userAgent);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}