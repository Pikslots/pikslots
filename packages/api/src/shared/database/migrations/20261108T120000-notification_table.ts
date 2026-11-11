import { Kysely, sql } from 'kysely';
import { PikSlotsDatabase } from '../schema';

/**
 * user_id/business_id cascade on delete: a notification is meaningless once
 * its recipient user or owning business is gone. At least one of the two
 * must be set — mirrors the Notification.create() invariant.
 */
export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .createTable('notifications')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade'),
    )
    .addColumn('business_id', 'uuid', (col) =>
      col.references('businesses.id').onDelete('cascade'),
    )
    .addColumn(
      'kind',
      sql`varchar CHECK (kind IN ('booking', 'team', 'payment', 'system'))`,
      (col) => col.notNull(),
    )
    .addColumn('icon_class_name', 'varchar', (col) => col.notNull())
    .addColumn('title', 'varchar', (col) => col.notNull())
    .addColumn('message', 'varchar', (col) => col.notNull())
    .addColumn('body', 'jsonb', (col) => col.notNull().defaultTo(sql`'[]'`))
    .addColumn('href', 'varchar')
    .addColumn('is_read', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('read_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addCheckConstraint(
      'chk_notification_has_recipient',
      sql`user_id IS NOT NULL OR business_id IS NOT NULL`,
    )
    .execute();

  await db.schema
    .createIndex('idx_notification_user_id')
    .on('notifications')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_notification_business_id')
    .on('notifications')
    .column('business_id')
    .execute();

  await db.schema
    .createIndex('idx_notification_created_at')
    .on('notifications')
    .column('created_at')
    .execute();
}

export async function down(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema.dropTable('notifications').execute();
}
