import { Inject, Injectable } from '@nestjs/common';
import {
  Business,
  BusinessAlreadyExistsError,
  IBusinessRepository,
  InfrastructureError,
  RegisterBusinessUseCase,
  CreateBusinessCommand,
  Result,
  err,
  ok,
} from '@pikslots/domain';
import { v7 as uuidv7 } from 'uuid';
import type {
  AuditLogJobDataShape,
  BusinessRepository,
} from '@pikslots/domain';
import { InjectQueue } from '@nestjs/bullmq';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { Queue } from 'bullmq';
import { SecurityContext } from 'src/shared/security/context/security.context';

@Injectable()
export class RegisterBusinessUseCaseImpl implements RegisterBusinessUseCase {
  constructor(
    @Inject(IBusinessRepository)
    private readonly businessRepository: BusinessRepository,
    private readonly securityContext: SecurityContext,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(
    command: CreateBusinessCommand,
  ): Promise<
    Result<
      { message: 'success' },
      BusinessAlreadyExistsError | InfrastructureError
    >
  > {
    const ownerId = this.securityContext.userId;

    const business: Business = Business.create({
      id: uuidv7(),
      ownerId,
      slug: command.slug,
      name: command.name,
      industry: command.industry,
      defaultTimeZone: command.defaultTimeZone,
      createdBy: ownerId,
    });

    const result = await this.businessRepository.save(business);

    if (!result.ok) {
      return err(result.error);
    }

    await this.logBusinessRegisteredAudit(business);

    return ok({ message: 'success' });
  }

  private async logBusinessRegisteredAudit(business: Business): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: business.id,
      userId: business.ownerId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_REGISTERED,
      description: `Business '${business.name}' was registered`,
      entityType: 'business',
      entityId: business.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_REGISTERED,
      payload,
    );
  }
}
