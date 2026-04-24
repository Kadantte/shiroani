import { Module, type DynamicModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from './database';
import { AnimeModule } from './anime';
import { LibraryModule } from './library';
import { ScheduleModule } from './schedule';
import { DiaryModule } from './diary';
import { ImportExportModule } from './import-export';
import { FeedModule } from './feed';

@Module({})
export class AppModule {
  static forRoot(options: { dbPath: string }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ThrottlerModule.forRoot([
          {
            name: 'short',
            ttl: 1000, // 1 second window
            limit: 100, // max 100 requests per second (desktop app — single user)
          },
          {
            name: 'medium',
            ttl: 10000, // 10 second window
            limit: 500, // max 500 requests per 10 seconds
          },
        ]),
        DatabaseModule.forRoot({ dbPath: options.dbPath }),
        AnimeModule,
        LibraryModule,
        ScheduleModule,
        DiaryModule,
        ImportExportModule,
        FeedModule,
      ],
    };
  }
}
