import { Kysely, sql } from 'kysely';
import { PikSlotsDatabase } from '../schema';

export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('user_id', 'uuid', (col) => col.references('users.id').notNull())
    .addColumn('business_id', 'uuid', (col) => col.references('businesses.id'))
    .addColumn(
      'role',
      sql`varchar CHECK (role IN ('Platform Owner', 'Business Owner', 'No Access', 'Standard', 'Enhanced', 'Admin'))`,
      (col) => col.notNull(),
    )
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
