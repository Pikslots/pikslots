import {
  SERVICE_ENDPOINTS,
  type FindAllServicesByBusinessResponse,
} from '@pikslots/shared';
import { setupServiceTestContext } from './support/service.test.context';
import { createBusiness, createService } from './support/service.fixtures';
import request from 'supertest';
import { endpointFor } from '../common/endpoint-path';
import { authHeader, tokenFor } from '../common/auth';
import { successBody } from '../common/http-envelope';

describe(`GET ${SERVICE_ENDPOINTS.FIND_ALL_BY_BUSINESS}`, () => {
  const ctx = setupServiceTestContext();

  it('returns all services for the business ', async () => {
    const businessId = await createBusiness(ctx);
    const serviceId = await createService(ctx, { businessId });

    const body = await request(ctx.app.getHttpServer())
      .get(endpointFor(SERVICE_ENDPOINTS.FIND_ALL_BY_BUSINESS, { businessId }))
      .set(
        authHeader(await tokenFor(ctx.sessionCacheService, 'Platform Owner', businessId)),
      )
      .expect(200);

    const ids = successBody<FindAllServicesByBusinessResponse>(body).data.map(
      (value) => value.id,
    );
    expect(successBody(body).data).toHaveLength(1);
    expect(ids).toContain(serviceId);
  });

  it('returns an empty list for a business with no services', async () => {
    const businessId = await createBusiness(ctx);

    const response = successBody<FindAllServicesByBusinessResponse>(
      await request(ctx.app.getHttpServer())
        .get(
          endpointFor(SERVICE_ENDPOINTS.FIND_ALL_BY_BUSINESS, { businessId }),
        )
        .set(
          authHeader(
            await tokenFor(ctx.sessionCacheService, 'Platform Owner', businessId),
          ),
        ),
    );

    expect(response.statusCode).toBe(200);
    expect(response.data).toEqual([]);
  });
});
