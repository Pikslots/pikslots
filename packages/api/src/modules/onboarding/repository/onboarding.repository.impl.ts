import { Inject, Injectable } from '@nestjs/common';
import {
  err,
  InfrastructureError,
  ok,
  Onboarding,
  OnboardingRepository,
  Result,
  UserAlreadyExistsError,
} from '@pikslots/domain';
import { Kysely, sql } from 'kysely';
import { PIKSLOTS_DB } from 'src/shared/database/pikslots.database.module';
import { PikSlotsDatabase } from 'src/shared/database/schema';
import { OnboardingPresistenceMapper } from '../mapper/onboarding.database.mapper';
import {
  getUniqueViolationField,
  isUniqueViolation,
} from 'src/shared/database/helpers';

@Injectable()
export class OnboardingRepositoryImpl implements OnboardingRepository {
  private mapper = new OnboardingPresistenceMapper();
  constructor(
    @Inject(PIKSLOTS_DB) private readonly db: Kysely<PikSlotsDatabase>,
  ) {}

  async registerOnboarding(
    onboarding: Onboarding,
  ): Promise<Result<void, UserAlreadyExistsError | InfrastructureError>> {
    try {
      await this.db.transaction().execute(async (trx) => {
        await sql`
        SELECT pg_advisory_xact_lock(12345)
        `.execute(trx);

        await trx
          .insertInto('users')
          .values(this.mapper.userToPresistence(onboarding.platformOwner))
          .execute();

        await trx
          .insertInto('businesses')
          .values(this.mapper.businessToPresistence(onboarding.business))
          .execute();
      });

      return ok(undefined);
    } catch (cause) {
      if (isUniqueViolation(cause)) {
        const field = getUniqueViolationField(cause);
        return err<UserAlreadyExistsError>({
          kind: 'user_already_exists',
          message: `A user with this ${field} already exists`,
          timestamp: new Date(),
          field,
        });
      }

      return err<InfrastructureError>({
        kind: 'infrastructure',
        message: 'Failed to save user',
        timestamp: new Date(),
        cause,
      });
    }
  }
}
