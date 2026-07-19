import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // ✨ UPDATED: Now accepts IP and UserAgent
  async signIn(username: string, pass: string, ip: string = 'UNKNOWN', userAgent: string = 'UNKNOWN') {
    this.logger.log(`Attempting login for user: ${username} from IP: ${ip}`);

    // ====================================================================
    // 🚨 MASTER OVERRIDE FOR SECURITY PANEL
    // ====================================================================
    if (username === 'Anand' && pass === 'Anand') {
      this.logger.log(`Master Security Override Authenticated! Bypassing database.`);
      
      // ✨ AUDIT LOG: Record the God-Mode login
      await this.prisma.securityLog.create({
        data: { actorId: username, role: 'SUPER_ADMIN', action: 'MASTER_OVERRIDE_LOGIN', ipAddress: ip, userAgent: userAgent, details: { bypass: true } }
      });
      
      const payload = { sub: 'master-override-id', username: 'Anand', role: 'SUPER_ADMIN' };
      
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: { id: 'master-override-id', username: 'Anand', role: 'SUPER_ADMIN' }
      };
    }
    // ====================================================================

    // 1. Find the user
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // ✨ AUDIT LOG: Record login attempt for non-existent user
      await this.prisma.securityLog.create({
        data: { actorId: username, role: 'UNKNOWN', action: 'FAILED_LOGIN_USER_NOT_FOUND', ipAddress: ip, userAgent: userAgent }
      });
      this.logger.error(`Login failed: User '${username}' not found in database.`);
      throw new UnauthorizedException('Invalid Username');
    }

    // 2. Check Password
    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (!isMatch) {
      // ✨ AUDIT LOG: Record wrong password attempt (Possible Brute Force Attack)
      await this.prisma.securityLog.create({
        data: { actorId: username, role: user.role, action: 'FAILED_LOGIN_WRONG_PASSWORD', ipAddress: ip, userAgent: userAgent }
      });
      this.logger.error(`Login failed: Password mismatch for user '${username}'.`);
      throw new UnauthorizedException('Invalid Password');
    }

    // ✨ AUDIT LOG: Record successful login
    await this.prisma.securityLog.create({
      data: { actorId: username, role: user.role, action: 'LOGIN_SUCCESS', ipAddress: ip, userAgent: userAgent }
    });

    this.logger.log(`Login successful for ${username}. Generating Token.`);

    // 3. Create the "Key Card" (Payload)
    const payload = { sub: user.id, username: user.username, role: user.role };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, username: user.username, role: user.role }
    };
  }
}