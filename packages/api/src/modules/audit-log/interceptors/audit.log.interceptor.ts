import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Scope,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Observable, tap } from 'rxjs';
import type { AuditLogJobDataShape } from '@pikslots/domain';
import { AUDIT_LOG_QUEUE } from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { SecurityContext } from 'src/shared/security/context/security.context';
import { enqueueAuditLog } from 'src/shared/utils/audit.log.util';
import {
  AUDIT_LOG_METADATA_KEY,
  type AuditLogOptions,
} from '../decorators/audit.log.decorator';

/**
 * Publishes an audit event to the BullMQ `audit.log` queue after a handler
 * decorated with `@AuditLog()` succeeds.
 *
 * Keeping this out of the use cases means audit coverage stays a cross-cutting
 * concern: handlers only declare *what* happened, and the audit module owns
 * *how* it is persisted (queue + processor + audit_logs table).
 */
@Injectable({ scope: Scope.REQUEST })
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
    private readonly securityContext: SecurityContext,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.get<AuditLogOptions | undefined>(
      AUDIT_LOG_METADATA_KEY,
      context.getHandler(),
    );

    if (!options) return next.handle();

    return next.handle().pipe(
      // Only successful responses are audited. Handlers in this codebase
      // return error payloads as values (with a non-2xx status already set on
      // the response) instead of throwing, so the status must be checked here
      // in addition to relying on the absence of a thrown error.
      tap({
        next: () => {
          const response = context
            .switchToHttp()
            .getResponse<{ statusCode: number }>();
          if (response.statusCode >= 400) return;

          void this.enqueue(context, options);
        },
      }),
    );
  }

  private async enqueue(
    context: ExecutionContext,
    options: AuditLogOptions,
  ): Promise<void> {
    try {
      const request = context.switchToHttp().getRequest<{
        params?: Record<string, string | string[]>;
        ip?: string;
      }>();
      const routeParam = request.params?.[options.businessIdParam ?? 'id'];
      const routeBusinessId = Array.isArray(routeParam)
        ? routeParam[0]
        : routeParam;
      const businessId = routeBusinessId || this.securityContext.businessId;

      if (!businessId || !this.securityContext.userId) return;

      const payload: AuditLogJobDataShape = {
        businessId,
        userId: this.securityContext.userId,
        userType: 'user',
        action: options.action,
        description: options.description,
        entityType: options.entityType ?? 'business',
        entityId: businessId,
        occurredAt: new Date().toISOString(),
        ipAddress: request.ip,
      };

      await enqueueAuditLog(this.auditLogQueue, options.action, payload);
    } catch {
      // Audit failures must never break the request that triggered them.
    }
  }
}
