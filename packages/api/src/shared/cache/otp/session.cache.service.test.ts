import { Logger } from '@nestjs/common';
import { Session } from '@pikslots/domain';
import type { Cacheable } from 'cacheable';
import { SessionCacheService } from './session.cache.service';

function makeSession(
  overrides: Partial<{
    id: string;
    issuedAt: Date;
    expiresAt: Date;
  }> = {},
): Session {
  return Session.reconstitute({
    id: overrides.id ?? '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
    userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
    role: 'Admin',
    businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
    issuedAt: overrides.issuedAt ?? new Date('2026-10-27T12:00:00.000Z'),
    expiresAt: overrides.expiresAt ?? new Date('2099-10-27T12:00:00.000Z'),
  });
}

describe('SessionCacheService', () => {
  let service: SessionCacheService;
  let cache: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
  };
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };
    service = new SessionCacheService(cache as unknown as Cacheable);
    loggerSpy = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  describe('save', () => {
    it('caches the session with a key and remaining ttl', async () => {
      const session = makeSession();

      await service.save(session);

      expect(cache.set).toHaveBeenCalledWith(
        'session:01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
        {
          id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
          userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
          role: 'Admin',
          businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
          issuedAt: '2026-10-27T12:00:00.000Z',
          expiresAt: '2099-10-27T12:00:00.000Z',
        },
        expect.any(Number),
      );
      const setCall = cache.set.mock.calls[0] as [string, unknown, number];
      expect(setCall[2]).toBeGreaterThan(0);
    });

    it('swallows cache failures', async () => {
      cache.set.mockRejectedValue(new Error('redis unavailable'));

      await expect(service.save(makeSession())).resolves.toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the cached session by id', async () => {
      await service.remove('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');

      expect(cache.delete).toHaveBeenCalledWith(
        'session:01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
      );
    });

    it('swallows cache failures', async () => {
      cache.delete.mockRejectedValue(new Error('redis unavailable'));

      await expect(
        service.remove('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b'),
      ).resolves.toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns a cached session', async () => {
      cache.get.mockResolvedValue({
        id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
        userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
        role: 'Admin',
        businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
        issuedAt: '2026-10-27T12:00:00.000Z',
        expiresAt: '2099-10-27T12:00:00.000Z',
      });

      const result = await service.get('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');

      expect(result?.id).toBe('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');
      expect(cache.delete).not.toHaveBeenCalled();
    });

    it('returns null on a cache miss', async () => {
      cache.get.mockResolvedValue(undefined);

      const result = await service.get('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');

      expect(result).toBeNull();
    });

    it('removes and returns null for an expired session', async () => {
      cache.get.mockResolvedValue({
        id: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
        userId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7c',
        role: 'Admin',
        businessId: '01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7d',
        issuedAt: '2026-10-20T12:00:00.000Z',
        expiresAt: '2026-10-21T12:00:00.000Z',
      });

      const result = await service.get('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');

      expect(result).toBeNull();
      expect(cache.delete).toHaveBeenCalledWith(
        'session:01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b',
      );
    });

    it('returns null when the cache read fails', async () => {
      cache.get.mockRejectedValue(new Error('redis unavailable'));

      const result = await service.get('01932b4a-5f3c-7e1d-b2a8-3c9d4e5f6a7b');

      expect(result).toBeNull();
      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
