import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { BullModule } from '@nestjs/bullmq';
import { AUDIT_LOG_QUEUE, PIKSLOT_EVENTS } from './jobs/pikslot.events';

export const QUEUE_CONFIG = BullModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => ({
    connection: {
      host: config.get('REDIS_HOST'),
      port: config.get('REDIS_PORT'),
      password: config.get('REDIS_PASSWORD'),
    },
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
    settings: {},
  }),
});

export const REGISTERED_QUEUES = BullModule.registerQueue(
  {
    name: PIKSLOT_EVENTS.USER.USER_ASSIGN_TO_BUSINESS,
  },
  {
    name: PIKSLOT_EVENTS.SERVICE_GROUP_ASSIGNMENT.SYNC_SERVICE_SERVICE_GROUPS,
  },
  {
    name: PIKSLOT_EVENTS.SERVICE_GROUP_ASSIGNMENT.SYNC_SERVICE_GROUP_SERVICES,
  },
  {
    name: PIKSLOT_EVENTS.SERVICE_USER_ASSIGNMENT.SYNC_SERVICE_TO_USERS,
  },
  {
    name: PIKSLOT_EVENTS.CLASS_GROUP_ASSIGNMENT.SYNC_CLASS_CLASS_GROUPS,
  },
  {
    name: PIKSLOT_EVENTS.CLASS_GROUP_ASSIGNMENT.SYNC_CLASS_GROUP_CLASSES,
  },
  // audit logs
  {
    name: AUDIT_LOG_QUEUE,
  },
);
