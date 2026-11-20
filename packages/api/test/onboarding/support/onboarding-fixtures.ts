import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { ONBOARDING_ENDPOINTS } from '@pikslots/shared';

import { unique } from '../../common/unique-id';
import type { OnboardingTestContext } from './onboarding-test-context';

const DEFAULT_PASSWORD = 'password123';

/** A short, collision-safe, lowercase-alphanumeric handle (usernames are capped at 30 chars). */
function shortUnique(prefix: string): string {
  return `${prefix}${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export interface OnboardingPayload {
  platformOwner: {
    username: string;
    password: string;
    name: { firstName: string; lastName: string };
    email: string;
    phone: string;
    role: 'Platform Owner';
  };
  business: {
    slug: string;
    name: string;
    industry: string;
    defaultTimeZone: string;
  };
}

export interface OnboardingPayloadOverrides {
  platformOwnerEmail?: string;
  platformOwnerUsername?: string;
  businessSlug?: string;
}

export function completePayload(
  overrides: OnboardingPayloadOverrides = {},
): OnboardingPayload {
  return {
    platformOwner: {
      username: overrides.platformOwnerUsername ?? shortUnique('po'),
      password: DEFAULT_PASSWORD,
      name: { firstName: 'E2E', lastName: 'Platform Owner' },
      email:
        overrides.platformOwnerEmail ?? `${shortUnique('pomail')}@example.com`,
      phone: '+12025551234',
      role: 'Platform Owner',
    },
    business: {
      slug: overrides.businessSlug ?? unique('e2e-onb'),
      name: 'E2E Onboarding Business',
      industry: 'salon_and_beauty',
      defaultTimeZone: 'America/New_York',
    },
  };
}

export interface CompleteOnboardingResult {
  payload: OnboardingPayload;
  platformOwnerId: string;
  businessId: string;
  response: request.Response;
}

/** Runs the real POST /onboarding/complete flow and resolves the created rows' ids (tracked for cleanup). */
export async function completeOnboarding(
  ctx: OnboardingTestContext,
  overrides: OnboardingPayloadOverrides = {},
): Promise<CompleteOnboardingResult> {
  const payload = completePayload(overrides);

  const response = await request(ctx.app.getHttpServer())
    .post(ONBOARDING_ENDPOINTS.ONBOARDING_COMPLETE)
    .send(payload)
    .expect(201);

  const platformOwner = await ctx.db
    .selectFrom('users')
    .select('id')
    .where('email', '=', payload.platformOwner.email)
    .executeTakeFirstOrThrow();

  const business = await ctx.db
    .selectFrom('businesses')
    .select('id')
    .where('slug', '=', payload.business.slug)
    .executeTakeFirstOrThrow();

  ctx.createdUserIds.push(platformOwner.id);
  ctx.createdBusinessIds.push(business.id);

  return {
    payload,
    platformOwnerId: platformOwner.id,
    businessId: business.id,
    response,
  };
}
