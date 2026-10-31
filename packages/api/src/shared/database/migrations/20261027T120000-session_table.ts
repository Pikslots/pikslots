import { Kysely, sql } from 'kysely';
import { PikSlotsDatabase } from '../schema';

/**
 * user_id/business_id cascade on delete: a session is meaningless once its
 * owning user/business is gone, so deleting either should delete the
 * session too — this also unblocks deleting a user/business while any
 * session (expired or not) still references it, including in e2e test
 * teardown.
 */
export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) =>
      col.references('users.id').onDelete('cascade').notNull(),
    )
    .addColumn('business_id', 'uuid', (col) =>
      col.references('businesses.id').onDelete('cascade'),
    )
    .addColumn(
      'role',
      sql`varchar CHECK (role IN ('Platform Owner', 'Business Owner', 'No Access', 'Standard', 'Enhanced', 'Admin'))`,
      (col) => col.notNull(),
    )
    .addColumn('os', 'varchar', (col) => col.notNull())
    .addColumn('browser', 'varchar', (col) => col.notNull())
    .addColumn('country', 'varchar', (col) => col.notNull())
    .addColumn('issued_at', 'timestamptz', (col) => col.notNull())
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .execute();

  await db.schema
    .createIndex('idx_session_user_id')
    .on('sessions')
    .column('user_id')
    .execute();

  await db.schema
    .createIndex('idx_session_expires_at')
    .on('sessions')
    .column('expires_at')
    .execute();
}

export async function down(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema.dropTable('sessions').execute();
}
