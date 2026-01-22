import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Check for token in "Authorization" header
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_KEY_CHANGE_THIS_LATER', // Must match the key in auth.module.ts
    });
  }

  async validate(payload: any) {
    // This attaches the user info to the request object
    return { id: payload.sub, username: payload.username, role: payload.role };
  }
}