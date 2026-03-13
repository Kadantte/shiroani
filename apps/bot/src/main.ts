import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
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
  logger.log(`ShiroAni Bot started in ${env.NODE_ENV} mode`, 'Bootstrap');
}

bootstrap().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});
