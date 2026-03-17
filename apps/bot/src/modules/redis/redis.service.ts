import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleInit, OnModuleDestroy {
  private static readonly MAX_RETRIES = 5;

  constructor(
    config: ConfigService,
    @InjectPinoLogger(RedisService.name) private readonly logger: PinoLogger
  ) {
    super(config.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: times => {
        if (times > RedisService.MAX_RETRIES) {
          logger.error(
            `Max Redis connection retries reached (${RedisService.MAX_RETRIES}). Giving up.`
          );
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 5000);
        logger.warn(`Retrying Redis connection in ${delay}ms (attempt ${times})`);
        return delay;
      },
    });

    this.on('connect', () => this.logger.info('Connected to Redis'));
    this.on('ready', () => this.logger.info('Redis client ready'));
    this.on('error', err => this.logger.error({ err }, 'Redis connection error'));
    this.on('close', () => this.logger.warn('Redis connection closed'));
    this.on('reconnecting', () => this.logger.info('Redis client reconnecting...'));
  }

  async onModuleInit() {
    try {
      await this.connect();
      this.logger.info('Redis connection successful');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to connect to Redis: ${message}`);
      // Don't throw — allow the bot to start without Redis.
      // Cache and cooldown operations will gracefully degrade.
    }
  }

  async onModuleDestroy() {
    try {
      await this.quit();
      this.logger.info('Redis client disconnected');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error disconnecting Redis client: ${message}`);
    }
  }

  /** Whether the Redis connection is established and ready for commands. */
  get isReady(): boolean {
    return this.status === 'ready';
  }
}
