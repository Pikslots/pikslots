import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Queue } from 'bullmq';
import { firstValueFrom, of } from 'rxjs';
import type { AuditLogJobDataShape } from '@pikslots/domain';
import { PIKSLOT_EVENTS } from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import type { AuthenticatedActor } from 'src/shared/security/types/authenticated.request';
import { AuditLogInterceptor } from './audit.log.interceptor';
import type { AuditLogOptions } from '../decorators/audit.log.decorator';

const handler = () => undefined;

const actor: AuthenticatedActor = {
  userId: 'user-1',
  role: 'Business Owner',
  businessId: 'biz-1',
};

function createContext({
  params = { id: 'biz-1' },
  requestActor = actor,
  statusCode = 200,
}: {
  params?: Record<string, string>;
  requestActor?: AuthenticatedActor;
  statusCode?: number;
} = {}): ExecutionContext {
  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({ params, actor: requestActor, ip: '127.0.0.1' }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function createNext(): CallHandler {
  return { handle: () => of({ ok: true }) };
}

describe('AuditLogInterceptor', () => {
  let reflector: { get: jest.Mock };
  let queue: { add: jest.Mock };
  let interceptor: AuditLogInterceptor;

  const options: AuditLogOptions = {
    action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_GENERAL_UPDATED,
    description: 'Updated general settings',
  };

  beforeEach(() => {
    reflector = { get: jest.fn() };
    queue = { add: jest.fn().mockResolvedValue(undefined) };

    interceptor = new AuditLogInterceptor(
      reflector as unknown as Reflector,
      queue as unknown as Queue<AuditLogJobDataShape, void, AuditLogJobName>,
    );
  });

  it('passes through without queueing when the handler is not decorated', async () => {
    reflector.get.mockReturnValue(undefined);

    await firstValueFrom(interceptor.intercept(createContext(), createNext()));

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('queues an audit event when a decorated handler succeeds', async () => {
    reflector.get.mockReturnValue(options);

    const result = await firstValueFrom(
      interceptor.intercept(createContext(), createNext()),
    );
    await Promise.resolve();

    expect(result).toEqual({ ok: true });
    expect(queue.add).toHaveBeenCalledWith(
      options.action,
      expect.objectContaining({
        businessId: 'biz-1',
        userId: 'user-1',
        userType: 'user',
        action: options.action,
        description: 'Updated general settings',
        entityType: 'business',
        entityId: 'biz-1',
        ipAddress: '127.0.0.1',
      }),
    );
  });

  it('falls back to the session business and honours custom options', async () => {
    reflector.get.mockReturnValue({
      ...options,
      entityType: 'business-settings',
      businessIdParam: 'businessId',
    });

    await firstValueFrom(
      interceptor.intercept(
        createContext({ params: { businessId: 'biz-from-route' } }),
        createNext(),
      ),
    );
    await Promise.resolve();

    expect(queue.add).toHaveBeenCalledWith(
      options.action,
      expect.objectContaining({
        businessId: 'biz-from-route',
        entityType: 'business-settings',
      }),
    );
  });

  it('does not queue when the handler returned an error response', async () => {
    reflector.get.mockReturnValue(options);

    await firstValueFrom(
      interceptor.intercept(createContext({ statusCode: 404 }), createNext()),
    );
    await Promise.resolve();

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not queue when there is no authenticated actor', async () => {
    reflector.get.mockReturnValue(options);

    await firstValueFrom(
      interceptor.intercept(
        createContext({ params: {}, requestActor: { ...actor, userId: '' } }),
        createNext(),
      ),
    );
    await Promise.resolve();

    expect(queue.add).not.toHaveBeenCalled();
  });
});
