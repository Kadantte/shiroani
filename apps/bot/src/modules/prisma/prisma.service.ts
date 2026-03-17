import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static readonly MAX_RETRIES = 5;
  private static readonly INITIAL_BACKOFF_MS = 1000;

  constructor(
    @InjectPinoLogger(PrismaService.name) private readonly logger: PinoLogger,
    config: ConfigService
  ) {
    const adapter = new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') });
    super({ adapter });
  }

  async onModuleInit() {
    let currentTry = 0;

    while (currentTry < PrismaService.MAX_RETRIES) {
      try {
        this.logger.info(
          `Connecting to database (attempt ${currentTry + 1}/${PrismaService.MAX_RETRIES})`
        );
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        this.logger.info('Connected to database successfully');
        return;
      } catch (error) {
        currentTry++;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to connect to database (attempt ${currentTry}/${PrismaService.MAX_RETRIES}): ${message}`
        );

        if (currentTry === PrismaService.MAX_RETRIES) {
          this.logger.error(
            'Could not connect to database after all retries. Please check your DATABASE_URL'
          );
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        const backoff = PrismaService.INITIAL_BACKOFF_MS * Math.pow(2, currentTry - 1);
        this.logger.warn(`Retrying in ${backoff}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoff));
      }
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.info('Disconnecting from database...');
      await this.$disconnect();
      this.logger.info('Disconnected from database');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error disconnecting from database: ${message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
