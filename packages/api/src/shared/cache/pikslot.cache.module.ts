import { Global, Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Cacheable } from 'cacheable';
import { createKeyv } from '@keyv/redis';
import { ConfigService } from '@nestjs/config';
import { Env } from '../config/env';
import { OtpService } from './otp/otp.service';
import { SessionCacheService } from './session/session.cache.service';
import { CACHE } from './cache.tokens';

@Global()
@Module({
  providers: [
    {
      provide: CACHE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const secondary = createKeyv(
          `redis://:${config.get('REDIS_PASSWORD')}@${config.get('REDIS_HOST')}:${config.get('REDIS_PORT')}`,
          { namespace: 'cache' },
        );
        return new Cacheable({ secondary, ttl: '4h' });
      },
    },
    OtpService,
    SessionCacheService,
  ],
  exports: [CACHE, OtpService, SessionCacheService],
})
export class PikslotCacheModule implements OnModuleDestroy {
  constructor(@Inject(CACHE) private readonly cache: Cacheable) {}

  /** The CACHE provider's underlying ioredis connection (via @keyv/redis) has
   * no Nest lifecycle hook of its own since it's a plain factory value, so
   * without this the socket stays open past app.close() and Jest hangs on
   * an open handle in e2e runs. */
  async onModuleDestroy(): Promise<void> {
    await this.cache.disconnect();
  }
}
