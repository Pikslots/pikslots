import { Kysely } from 'kysely';
import { PikSlotsDatabase } from '../schema';

/**
 * The initial sessions table left user_id/business_id as plain RESTRICT
 * foreign keys, which blocks deleting a user or business while any session
 * (expired or not) still references it — including in e2e test teardown.
 * A session is meaningless once its owning user/business is gone, so
 * cascading the delete is also the correct production behavior.
 */
export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .alterTable('sessions')
    .dropConstraint('sessions_user_id_fkey')
    .execute();

  await db.schema
    .alterTable('sessions')
    .addForeignKeyConstraint(
      'sessions_user_id_fkey',
      ['user_id'],
      'users',
      ['id'],
      (col) => col.onDelete('cascade'),
    )
    .execute();

  await db.schema
    .alterTable('sessions')
    .dropConstraint('sessions_business_id_fkey')
    .execute();

  await db.schema
    .alterTable('sessions')
    .addForeignKeyConstraint(
      'sessions_business_id_fkey',
      ['business_id'],
      'businesses',
      ['id'],
      (col) => col.onDelete('cascade'),
    )
    .execute();
}

export async function down(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .alterTable('sessions')
    .dropConstraint('sessions_user_id_fkey')
    .execute();

  await db.schema
    .alterTable('sessions')
    .addForeignKeyConstraint('sessions_user_id_fkey', ['user_id'], 'users', [
      'id',
    ])
    .execute();

  await db.schema
    .alterTable('sessions')
    .dropConstraint('sessions_business_id_fkey')
    .execute();

  await db.schema
    .alterTable('sessions')
    .addForeignKeyConstraint(
      'sessions_business_id_fkey',
      ['business_id'],
      'businesses',
      ['id'],
    )
    .execute();
}
