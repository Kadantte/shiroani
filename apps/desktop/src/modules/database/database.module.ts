import { Global, Module, type DynamicModule } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DATABASE_PATH } from './database.tokens';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(options: { dbPath: string }): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [{ provide: DATABASE_PATH, useValue: options.dbPath }, DatabaseService],
      exports: [DatabaseService],
    };
  }
}
