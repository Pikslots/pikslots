import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SecurityContext } from '../context/security.context';
import { JwtLoginService } from '../jwt/jwt.login.service';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

// Routes bypassed from JWT verification.
// Supports exact paths ('/users/register') and wildcards ('/users/*', '/foo/*/bar').
const PUBLIC_ROUTES: string[] = [
  '/users/register',
  '/users/login',
  '/users/refresh',
  '/users/invite/request-otp',
  '/users/invite/accept',
  '/api/*', // swagger docs
  '/users/free-slots/*', // get free slots for the user
  '/users/available-dates/*', // get available dates
  '/public-booking-page/*/booking-details',
  '/public-booking/register',
  '/onboarding/complete',
  '/onboarding/status',
  '/health',
];

function isPublicRoute(originalUrl: string): boolean {
  const path = originalUrl.split('?')[0];

  return PUBLIC_ROUTES.some((route) => {
    if (!route.includes('*')) return path === route;
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -2);
      return path === prefix || path.startsWith(prefix + '/');
    }
    // mid-path wildcard: convert to regex where * matches one path segment
    const regex = new RegExp(
      '^' +
        route.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+') +
        '$',
    );
    return regex.test(path);
  });
}

@Injectable()
export class JwtVerificationMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtLoginService: JwtLoginService,
    private readonly securityContext: SecurityContext,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    if (isPublicRoute(req.originalUrl)) return next();

    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          new PikslotsBaseErrorResponse(
            'Missing or malformed authorization header',
            HttpStatus.UNAUTHORIZED,
          ),
        );
    }

    const token = authHeader.slice(7);

    try {
      const payload = this.jwtLoginService.verifyAccessToken(token);
      if (!payload.ok)
        return res.status(HttpStatus.UNAUTHORIZED).json(payload.error);

      this.securityContext.userId = payload.value.userId;
      this.securityContext.role = payload.value.role;
      this.securityContext.businessId = payload.value.businessId;

      next();
    } catch {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          new PikslotsBaseErrorResponse(
            'Invalid or expired token',
            HttpStatus.UNAUTHORIZED,
          ),
        );
    }
  }
}
