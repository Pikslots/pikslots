import { Session } from '@pikslots/domain';

export const SESSION_TEST_DATA: Session[] = [
  Session.reconstitute({
    id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
    role: 'Admin',
    os: 'macOS',
    browser: 'Chrome',
    country: 'PK',
    businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
    issuedAt: new Date('2026-10-27T12:00:00.000Z'),
    expiresAt: new Date('2099-10-27T12:00:00.000Z'),
  }),
  Session.reconstitute({
    id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7e',
    userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7f',
    role: 'Platform Owner',
    os: 'Windows',
    browser: 'Edge',
    country: 'US',
    businessId: null,
    issuedAt: new Date('2026-10-27T12:00:00.000Z'),
    expiresAt: new Date('2099-10-27T12:00:00.000Z'),
  }),
];

export const EXPIRED_SESSION = Session.reconstitute({
  id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a80',
  userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a81',
  role: 'Standard',
  os: 'iOS',
  browser: 'Safari',
  country: 'GB',
  businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
  issuedAt: new Date('2026-10-20T12:00:00.000Z'),
  expiresAt: new Date('2026-10-21T12:00:00.000Z'),
});
