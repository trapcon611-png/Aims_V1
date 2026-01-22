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

  async signIn(username: string, pass: string) {
    this.logger.log(`Attempting login for user: ${username}`);

    // 1. Find the user
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      this.logger.error(`Login failed: User '${username}' not found in database.`);
      throw new UnauthorizedException('Invalid Username');
    }

    this.logger.log(`User found (ID: ${user.id}). Verifying password...`);

    // 2. Check Password
    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (!isMatch) {
      this.logger.error(`Login failed: Password mismatch for user '${username}'.`);
      // Debug: Hash comparison (Do not use in production normally)
      // console.log(`Input: ${pass}, Stored Hash: ${user.password}`); 
      throw new UnauthorizedException('Invalid Password');
    }

    this.logger.log(`Login successful for ${username}. Generating Token.`);

    // 3. Create the "Key Card" (Payload)
    const payload = { sub: user.id, username: user.username, role: user.role };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { // Send back basic info for the frontend
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
}