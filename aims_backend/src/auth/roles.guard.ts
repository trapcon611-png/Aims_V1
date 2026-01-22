import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Get the required roles for this route
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true; // If no specific role is needed, let them pass
    }

    // 2. Get the User who is trying to enter
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 3. Check if the user has the right badge
    return roles.includes(user.role);
  }
}