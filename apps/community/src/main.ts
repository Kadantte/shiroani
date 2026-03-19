import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './modules/shared/custom-io-adapter';
import { validateEnv } from './env';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  app.use(helmet());
  app.enableCors({ origin: env.CORS_ORIGIN, credentials: true });
  app.useWebSocketAdapter(new CustomIoAdapter(app));

  await app.listen(env.PORT, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(
    `ShiroAni Community server started on port ${env.PORT} in ${env.NODE_ENV} mode`,
    'Bootstrap'
  );
}

bootstrap().catch(err => {
  console.error('Failed to start community server:', err);
  process.exit(1);
});
