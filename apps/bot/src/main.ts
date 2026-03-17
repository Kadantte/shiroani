import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { validateEnv } from './env';

async function bootstrap() {
  const env = validateEnv();

  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = app.get(Logger);

  // Global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ err: reason, promise }, 'Unhandled Rejection');
  });

  process.on('uncaughtException', error => {
    // Suppress ForbiddenException from guards (cooldowns, permissions)
    // These are already handled by the guard itself
    if (error instanceof ForbiddenException) {
      logger.debug('Guard returned false (cooldown or permission check)');
      return;
    }

    logger.error({ err: error }, 'Uncaught Exception — shutting down');
    process.exit(1);
  });

  logger.log(`ShiroAni Bot started in ${env.NODE_ENV} mode`, 'Bootstrap');
}

bootstrap().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
