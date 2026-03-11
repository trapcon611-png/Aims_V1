import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Check for token in "Authorization" header
      ignoreExpiration: false,
      // CRITICAL FIX: Ensure it falls back to the exact same string used in auth.module.ts
      secretOrKey: process.env.JWT_SECRET || 'SUPER_SECRET_KEY_CHANGE_THIS_LATER', 
    });
  }

  async validate(payload: any) {
    // This attaches the user info to the request object
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}