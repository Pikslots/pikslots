import { UserWorkingHours } from '@pikslots/domain';
import { ServiceTestContext } from './service.test.context';
import { randomUUID } from 'crypto';
import { unique } from '../../common/unique-id';
import request from 'supertest';
import { BUSINESS_ENDPOINTS, SERVICE_ENDPOINTS } from '@pikslots/shared';
import { authHeader, tokenFor } from '../../common/auth';

const DEFAULT_WORKING_HOURS: UserWorkingHours = {
  monday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  tuesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  wednesday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  thursday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  friday: { enabled: true, openTime: '09:00', closeTime: '17:00' },
  saturday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
  sunday: { enabled: false, openTime: '09:00', closeTime: '17:00' },
};

export interface RegisterPayloadOverrides {
  id?: string;
  title?: string;
  description?: string;
  serviceAvatar?: string;
  durationInMins?: number;
  bufferTimeInMins?: number;
  cost?: number;
  isHiddenFromBookingPage?: boolean;
  businessId?: string;
  colorCode?: string;
  associatedUsers?: string[];
  associatedServiceGroups?: string[];
}

export interface EditPayloadOverrides {
  title?: string;
  description?: string;
  serviceAvatar?: string;
  durationInMins?: number;
  bufferTimeInMins?: number;
  cost?: number;
  isHiddenFromBookingPage?: boolean;
  colorCode?: string;
  associatedUsers?: string[];
  associatedServiceGroups?: string[];
}

export async function createOwnerUser(
  ctx: ServiceTestContext,
): Promise<string> {
  return insertTestUser(ctx, null, 'Business Owner', 'E2E', 'Owner');
}

// A real user row inside the business, required so a service can be
// registered/edited with at least one assigned team member.
export async function createTeamMember(
  ctx: ServiceTestContext,
  businessId: string,
): Promise<string> {
  return insertTestUser(ctx, businessId, 'Standard', 'E2E', 'Member');
}

async function insertTestUser(
  ctx: ServiceTestContext,
  businessId: string | null,
  role: 'Business Owner' | 'Standard',
  firstName: string,
  lastName: string,
): Promise<string> {
  const id = randomUUID();
  const suffix = randomUUID().replace(/-/g, '').slice(0, 16);

  await ctx.db
    .insertInto('users')
    .values({
      id,
      business_id: businessId,
      username: `e2e${suffix}`,
      password: 'e2e-unused-password-hash',
      first_name: firstName,
      last_name: lastName,
      email: `${suffix}@example.com`,
      phone: null,
      role,
      status: 'active',
      avatar_url: null,
      email_verified: true,
      booking_url: `https://example.com/book/${suffix}`,
      notification_mode: 'all',
      notification_sound_enabled: true,
      notification_sound_type: 'chime',
      reminder_enabled: true,
      reminder_mins_before: 10,
      reminder_sound_type: 'chime',
      user_working_hours: DEFAULT_WORKING_HOURS,
      last_login_at: null,
      suspended_reason: null,
      created_at: new Date(),
      created_by: id,
      updated_at: new Date(),
      updated_by: id,
      deleted_at: null,
      deleted_by: null,
      is_deleted: false,
    })
    .execute();

  ctx.createdUserIds.push(id);
  return id;
}

export async function createBusiness(ctx: ServiceTestContext): Promise<string> {
  const slug = unique('e2e-biz');
  const userId = await createOwnerUser(ctx);
  const initialPaylaod = {
    ownerId: userId,
    ownerName: 'E2E Test Owner',
    ownerEmail: `${unique('owner')}@example.com`,
    slug,
    name: `E2E Business ${slug}`,
    industry: 'fitness',
    defaultTimeZone: 'UTC',
  };

  await request(ctx.app.getHttpServer())
    .post(BUSINESS_ENDPOINTS.REGISTER)
    .send(initialPaylaod)
    .expect(201);

  const businessId = await ctx.db
    .selectFrom('businesses')
    .select('id')
    .where('slug', '=', slug)
    .executeTakeFirstOrThrow();

  ctx.createdBusinessIds.push(businessId.id);
  return businessId.id;
}

export async function registerPayload(
  ctx: ServiceTestContext,
  overrides: RegisterPayloadOverrides = {},
) {
  const businessId = overrides.businessId ?? (await createBusiness(ctx));
  const associatedUsers = overrides.associatedUsers ?? [
    await createTeamMember(ctx, businessId),
  ];

  return {
    businessId,
    title: overrides.title ?? 'Afaq Dentists',
    bufferTimeInMins: overrides.bufferTimeInMins ?? 12,
    colorCode: overrides.colorCode ?? ' #b30000',
    cost: overrides.cost ?? 250,
    description: overrides.description ?? 'hey this is an afaq denists clinic',
    durationInMins: overrides.durationInMins ?? 40,
    isHiddenFromBookingPage: overrides.isHiddenFromBookingPage ?? false,
    serviceAvatar: overrides.serviceAvatar ?? '',
    associatedUsers,
    associatedServiceGroups: overrides.associatedServiceGroups ?? [],
  };
}

//  Registers a real service through the real HTTP endpoint. /services/register

export async function createService(
  ctx: ServiceTestContext,
  overrides: RegisterPayloadOverrides = {},
) {
  const payload = await registerPayload(ctx, overrides);

  await request(ctx.app.getHttpServer())
    .post(SERVICE_ENDPOINTS.REGISTER)
    .set(
      authHeader(
        await tokenFor(ctx.sessionCacheService, 'Business Owner', payload.businessId),
      ),
    )
    .send(payload)
    .expect(201);

  const row = await ctx.db
    .selectFrom('services')
    .select('id')
    .where('business_id', '=', payload.businessId)
    .where('title', '=', payload.title)
    .executeTakeFirstOrThrow();

  ctx.createdServiceIds.push(row.id);

  return row.id;
}

// A full PATCH /services/:serviceId body
export async function editServicePayload(
  ctx: ServiceTestContext,
  businessId: string,
  overrides: EditPayloadOverrides = {},
) {
  const associatedUsers = overrides.associatedUsers ?? [
    await createTeamMember(ctx, businessId),
  ];

  return {
    businessId,
    title: overrides.title ?? 'Updated Service Title',
    description: overrides.description ?? 'Updated service description',
    bufferTimeInMins: overrides.bufferTimeInMins ?? 15,
    colorCode: overrides.colorCode ?? '#ff0000',
    cost: overrides.cost ?? 500,
    durationInMins: overrides.durationInMins ?? 60,
    isHiddenFromBookingPage: overrides.isHiddenFromBookingPage ?? true,
    serviceAvatar: overrides.serviceAvatar ?? '',
    associatedUsers,
    associatedServiceGroups: overrides.associatedServiceGroups ?? [],
  };
}

export async function findServiceById(ctx: ServiceTestContext, id: string) {
  const row = await ctx.db
    .selectFrom('services')
    .selectAll()
    .where('id', '=', id)
    .executeTakeFirstOrThrow();

  return row;
}
