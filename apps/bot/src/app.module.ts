import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NecordModule } from 'necord';
import { LoggerModule } from 'nestjs-pino';
import { IntentsBitField, Partials } from 'discord.js';
import { ForbiddenExceptionFilter } from './common/filters';
import { PrismaModule } from './modules/prisma/prisma.module';
import { GuildModule } from './modules/guild/guild.module';
import { RedisModule } from './modules/redis/redis.module';
import { CommandsModule } from './modules/commands/commands.module';
import { EventsModule } from './modules/events/events.module';
import { ReactionRoleCacheModule } from './modules/reaction-role-cache/reaction-role-cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    NecordModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.getOrThrow<string>('DISCORD_TOKEN'),
        intents: [
          IntentsBitField.Flags.Guilds,
          IntentsBitField.Flags.GuildMembers,
          IntentsBitField.Flags.GuildMessages,
          IntentsBitField.Flags.GuildVoiceStates,
          IntentsBitField.Flags.GuildMessageReactions,
          IntentsBitField.Flags.MessageContent,
        ],
        partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
        development:
          config.get<string>('NODE_ENV') !== 'production'
            ? [config.getOrThrow<string>('DISCORD_GUILD_ID')]
            : false,
      }),
    }),
    PrismaModule,
    GuildModule,
    RedisModule,
    ReactionRoleCacheModule,
    CommandsModule,
    EventsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ForbiddenExceptionFilter,
    },
  ],
})
export class AppModule {}
