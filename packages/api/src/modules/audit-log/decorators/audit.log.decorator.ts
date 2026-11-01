import { SetMetadata } from '@nestjs/common';
import type { AuditLogJobName } from 'src/shared/queue/jobs';

export const AUDIT_LOG_METADATA_KEY = 'audit_log';

export interface AuditLogOptions {
  /** Audit action name, e.g. PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_GENERAL_UPDATED. */
  action: AuditLogJobName;
  /** Human-readable sentence shown in the Activity feed. */
  description: string;
  /** Entity being changed. Defaults to 'business'. */
  entityType?: string;
  /** Route param holding the business id. Defaults to 'id'. */
  businessIdParam?: string;
}

/**
 * Marks a handler as an audited action.
 *
 * The handler's return value decides success: the event is only queued when it
 * completes without throwing, so failed updates never show up in the Activity
 * feed. Auditing is handled centrally by `AuditLogInterceptor`, which publishes
 * to the BullMQ `audit.log` queue consumed by `AuditLogEventProcessor`.
 *
 * @example
 * @AuditLog({
 *   action: PIKSLOT_EVENTS.AUDIT_LOG.BUSINESS_GENERAL_UPDATED,
 *   description: 'Updated general settings',
 * })
 * @Patch(BUSINESS_ENDPOINTS.UPDATE_GENERAL)
 */
export const AuditLog = (options: AuditLogOptions) =>
  SetMetadata(AUDIT_LOG_METADATA_KEY, options);
