import type { CookieOptions } from 'express';

export const SESSION_TTL_SECONDS = 604800;

export const jidCookieOptions = (isProduction: boolean): CookieOptions => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
  path: '/',
});
