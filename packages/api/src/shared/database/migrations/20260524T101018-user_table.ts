import { type Kysely, sql } from 'kysely';
import { PikSlotsDatabase } from '../schema';

export async function up(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) => col.primaryKey().notNull())
    .addColumn('business_id', 'uuid', (col) => col.notNull())
    .addColumn('username', 'varchar(30)', (col) => col.notNull().unique())
    .addColumn('password', 'varchar(255)', (col) => col.notNull())
    .addColumn('first_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('last_name', 'varchar(50)', (col) => col.notNull())
    .addColumn('email', 'varchar(100)', (col) => col.notNull().unique())
    .addColumn('phone', 'varchar(20)', (col) => col.defaultTo(null))
    .addColumn(
      'role',
      sql`varchar CHECK (role IN ('Platform Owner', 'Business Owner', 'No Access', 'Standard', 'Enhanced', 'Admin'))`,
      (col) => col.notNull(),
    )
    .addColumn(
      'status',
      sql`varchar CHECK (status IN ('invited', 'active', 'inactive', 'suspended'))`,
      (col) => col.notNull(),
    )
    .addColumn('avatar_url', 'varchar(500)', (col) => col.defaultTo(null))
    .addColumn('email_verified', 'boolean', (col) =>
      col.notNull().defaultTo(false),
    )
    .addColumn('booking_url', 'varchar(500)', (col) => col.notNull())
    // notification preferences
    .addColumn(
      'notification_mode',
      sql`varchar CHECK (notification_mode IN ('all', 'focus', 'none'))`,
      (col) => col.notNull().defaultTo('all'),
    )
    .addColumn('notification_sound_enabled', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn(
      'notification_sound_type',
      sql`varchar CHECK (notification_sound_type IN ('chime', 'whistle'))`,
      (col) => col.notNull().defaultTo('chime'),
    )
    // appointment reminders
    .addColumn('reminder_enabled', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn('reminder_mins_before', 'integer', (col) =>
      col.notNull().defaultTo(10),
    )
    .addColumn(
      'reminder_sound_type',
      sql`varchar CHECK (reminder_sound_type IN ('chime', 'whistle'))`,
      (col) => col.notNull().defaultTo('chime'),
    )
    // working hours
    .addColumn('user_working_hours', 'jsonb', (col) => col.notNull())
    // misc
    .addColumn('last_login_at', 'timestamptz', (col) => col.defaultTo(null))
    .addColumn('suspended_reason', 'text', (col) => col.defaultTo(null))
    // audit
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('created_by', 'uuid', (col) => col.notNull())
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_by', 'uuid', (col) => col.notNull())
    .addColumn('deleted_at', 'timestamptz', (col) => col.defaultTo(null))
    .addColumn('deleted_by', 'uuid', (col) => col.defaultTo(null))
    .addColumn('is_deleted', 'boolean', (col) => col.notNull().defaultTo(false))
    .execute();

  await db.schema
    .createIndex('idx_user_email')
    .on('users')
    .column('email')
    .execute();
  await db.schema
    .createIndex('idx_user_username')
    .on('users')
    .column('username')
    .execute();
  await db.schema
    .createIndex('idx_user_is_deleted')
    .on('users')
    .column('is_deleted')
    .execute();
}

export async function down(db: Kysely<PikSlotsDatabase>): Promise<void> {
  await db.schema.dropTable('users').execute();
}
