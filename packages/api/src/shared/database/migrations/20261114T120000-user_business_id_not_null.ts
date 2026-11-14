import { Kysely, sql } from 'kysely';
import { PikSlotsDatabase } from '../schema';

/**
 * Every user now belongs to a business, including the Platform Owner created
 * during onboarding. Backfill legacy NULL rows before enforcing NOT NULL.
 */
export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await sql`
    UPDATE users AS u
    SET business_id = COALESCE(
      (
        SELECT b.id
        FROM businesses AS b
        WHERE b.owner_id = u.id
        ORDER BY b.created_at ASC
        LIMIT 1
      ),
      (
        SELECT b.id
        FROM businesses AS b
        ORDER BY b.created_at ASC
        LIMIT 1
      )
    )
    WHERE u.business_id IS NULL
  `.execute(db);

  await sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM users WHERE business_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot enforce users.business_id NOT NULL: users with NULL business_id exist and no business is available to backfill them';
      END IF;
    END $$;
  `.execute(db);

  await db.schema
    .alterTable('users')
    .alterColumn('business_id', (col) => col.setNotNull())
    .execute();
}

export async function down(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .alterTable('users')
    .alterColumn('business_id', (col) => col.dropNotNull())
    .execute();
}
