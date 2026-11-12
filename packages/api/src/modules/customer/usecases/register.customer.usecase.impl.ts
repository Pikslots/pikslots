import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  ok,
  Customer,
  CustomerAlreadyExistsError,
  RegisterCustomerCommand,
  RegisterCustomerUseCase,
  type AuditLogJobDataShape,
  type CustomerRepository,
  ICustomerRepository,
  InfrastructureError,
  Result,
  UnauthorizedError,
} from '@pikslots/domain';
import { Queue } from 'bullmq';
import { SecurityContext } from 'src/shared/security/context/security.context';
import {
  AUDIT_LOG_QUEUE,
  PIKSLOT_EVENTS,
} from 'src/shared/queue/jobs/pikslot.events';
import type { AuditLogJobName } from 'src/shared/queue/jobs';
import { v7 as uuidv7 } from 'uuid';

const UNAUTHORIZED_ERROR: UnauthorizedError = {
  kind: 'unauthorized',
  message: 'Can not register customer : unauthorized!!!',
  timestamp: new Date(),
};

@Injectable()
export class RegisterCustomerUseCaseImpl implements RegisterCustomerUseCase {
  constructor(
    @Inject(ICustomerRepository)
    private readonly customerRepository: CustomerRepository,
    private readonly securityContext: SecurityContext,
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditLogQueue: Queue<
      AuditLogJobDataShape,
      void,
      AuditLogJobName
    >,
  ) {}

  async execute(
    command: RegisterCustomerCommand,
  ): Promise<
    Result<
      Customer,
      CustomerAlreadyExistsError | UnauthorizedError | InfrastructureError
    >
  > {
    const callerRole = this.securityContext.role;
    const callerBusinessId = this.securityContext.businessId;
    const isPartOfSameBusiness = callerBusinessId === command.businessId;

    if (!Customer.canRegisterCustomer(callerRole, isPartOfSameBusiness))
      return err(UNAUTHORIZED_ERROR);

    const customer = Customer.create({
      id: uuidv7(),
      name: command.name,
      profileImageUrl: command.profileImageUrl,
      email: command.email,
      additionalEmail: command.additionalEmail,
      primaryPhone: command.primaryPhone,
      additionalPhone: command.additionalPhone,
      company: command.company,
      country: command.country,
      address: command.address,
      city: command.city,
      state: command.state,
      zipCode: command.zipCode,
      notes: command.notes,
      customerSocialLinks: command.customerSocialLinks,
      additionalFields: command.additionalFields,
      businessId: command.businessId,
      createdBy: command.createdBy,
    });

    const saved = await this.customerRepository.save(customer);

    if (!saved.ok) return err(saved.error);

    await this.logCustomerCreatedAudit(customer);

    return ok(customer);
  }

  private async logCustomerCreatedAudit(customer: Customer): Promise<void> {
    const payload: AuditLogJobDataShape = {
      businessId: customer.businessId,
      userId: this.securityContext.userId,
      userType: 'user',
      action: PIKSLOT_EVENTS.AUDIT_LOG.CUSTOMER_CREATED,
      description: `Customer '${customer.name.firstName} ${customer.name.lastName}' was created`,
      entityType: 'customer',
      entityId: customer.id,
      occurredAt: new Date().toISOString(),
    };

    await this.auditLogQueue.add(
      PIKSLOT_EVENTS.AUDIT_LOG.CUSTOMER_CREATED,
      payload,
    );
  }
}
