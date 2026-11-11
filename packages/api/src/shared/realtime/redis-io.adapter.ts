import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ConfigService } from '@nestjs/config';
import type { Server as HttpServer } from 'http';
import type { Server, ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import type { Env } from '../config/env';
import { isAllowedOrigin } from '../security/cors';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  /** Takes the raw HTTP server (not the Nest `app`) — a duplicated
   * @nestjs/websockets package instance in this monorepo breaks
   * AbstractWsAdapter's `instanceof NestApplication` detection, which would
   * otherwise silently treat the whole app object as the HTTP server. */
  constructor(
    httpServer: HttpServer,
    private readonly config: ConfigService<Env, true>,
    private readonly corsOriginMatchers: RegExp[],
  ) {
    super(httpServer);
  }

  /** Pub/sub clients dedicated to the Socket.IO adapter — a subscriber
   * connection can't issue other commands, so these must never be the
   * same ioredis client used by BullMQ or the Keyv cache. */
  connectToRedis(): void {
    const pubClient = new Redis({
      host: this.config.get('REDIS_HOST'),
      port: this.config.get('REDIS_PORT'),
      password: this.config.get('REDIS_PASSWORD'),
    });
    const subClient = pubClient.duplicate();

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: (
          origin: string | undefined,
          callback: (err: Error | null, allow?: boolean) => void,
        ) => {
          if (isAllowedOrigin(origin, this.corsOriginMatchers)) {
            callback(null, true);
          } else {
            callback(new Error(`Not allowed by CORS: ${origin}`));
          }
        },
        credentials: true,
      },
    }) as Server;

    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }

    return server;
  }
}
