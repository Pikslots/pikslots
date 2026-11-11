import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import type { Server as HttpServer } from 'http';
import { ConfigService } from '@nestjs/config';
import { PikslotsAppModule } from './pikslots.app.module';
import { type Env } from './shared/config/env';
import { PrintLoadedEnv } from './shared/config/print.env';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { validationExceptionFactory } from './shared/pipes/validation.exception.factory';
import {
  buildCorsOriginMatchers,
  isAllowedOrigin,
} from './shared/security/cors';
import { RedisIoAdapter } from './shared/realtime/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(PikslotsAppModule);

  //validation pipe global
  app.useGlobalPipes(
    new ValidationPipe({ exceptionFactory: validationExceptionFactory }),
  );

  // printing the loaded env variables
  app.get(PrintLoadedEnv).logEnv();

  app.use(cookieParser());

  const config = app.get(ConfigService<Env, true>);

  const corsOrigins = config.get('CORS_ORIGINS', { infer: true });
  const corsOriginMatchers = buildCorsOriginMatchers(corsOrigins);

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, corsOriginMatchers)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  };

  app.enableCors(corsOptions);

  const redisIoAdapter = new RedisIoAdapter(
    app.getHttpServer() as HttpServer,
    config,
    corsOriginMatchers,
  );
  redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  const enableApiDocs = config.get('ENABLE_API_DOCS', { infer: true });

  if (enableApiDocs) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Pikslots')
      .setDescription('pikslots swagger api')
      .setVersion('1.0')
      .addBearerAuth()
      .addSecurityRequirements('bearer')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
