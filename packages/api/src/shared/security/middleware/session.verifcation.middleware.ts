import { HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { SESSION_EXPIRED_MESSAGE } from '@pikslots/shared';
import { SecurityContext } from '../context/security.context';
import { SessionCacheService } from 'src/shared/cache/session/session.cache.service';
import { PikslotsBaseErrorResponse } from 'src/shared/types/base.error.response';

// Supports exact paths ('/users/register') and wildcards ('/users/*', '/foo/*/bar').
const PUBLIC_ROUTES: string[] = [
  '/users/register',
  '/users/login',
  '/users/refresh',
  '/users/invite/request-otp',
  '/users/invite/accept',
  '/businesses/register',
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
export class SessionVerifcationMiddleware implements NestMiddleware {
  constructor(
    private readonly sessionCacheService: SessionCacheService,
    private readonly securityContext: SecurityContext,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (isPublicRoute(req.originalUrl)) return next();

    const jidCookie: unknown = req.cookies?.jid;
    const sessionId = typeof jidCookie === 'string' ? jidCookie : undefined;

    if (!sessionId) {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          new PikslotsBaseErrorResponse(
            SESSION_EXPIRED_MESSAGE,
            HttpStatus.UNAUTHORIZED,
          ),
        );
    }

    try {
      const session = await this.sessionCacheService.get(sessionId);

      if (!session) {
        return res
          .status(HttpStatus.UNAUTHORIZED)
          .json(
            new PikslotsBaseErrorResponse(
              SESSION_EXPIRED_MESSAGE,
              HttpStatus.UNAUTHORIZED,
            ),
          );
      }

      this.securityContext.userId = session.userId;
      this.securityContext.role = session.role;
      this.securityContext.businessId = session.businessId;

      next();
    } catch {
      return res
        .status(HttpStatus.UNAUTHORIZED)
        .json(
          new PikslotsBaseErrorResponse(
            SESSION_EXPIRED_MESSAGE,
            HttpStatus.UNAUTHORIZED,
          ),
        );
    }
  }
}
