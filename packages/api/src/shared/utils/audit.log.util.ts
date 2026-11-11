import { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { AuditLogJobDataShape } from '@pikslots/domain';
import type { AuditLogJobName } from '../queue/jobs';

const logger = new Logger('AuditLog');

/** Enqueue an audit event without allowing audit infrastructure to fail a request. */
export async function enqueueAuditLog(
  queue: Queue<AuditLogJobDataShape, void, AuditLogJobName>,
  action: AuditLogJobName,
  payload: AuditLogJobDataShape,
): Promise<void> {
  try {
    await queue.add(action, payload);
  } catch (error) {
    logger.error(
      `Failed to enqueue '${action}' audit event`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
