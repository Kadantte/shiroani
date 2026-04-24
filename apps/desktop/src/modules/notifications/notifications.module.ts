import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { ScheduleModule } from '../schedule';
import { LibraryModule } from '../library';
import { NotificationsService } from './notifications.service';
import { NotificationHostPort } from './notification-host.port';
import { NotificationStorePort } from './notification-store.port';

/**
 * Notifications module. The Electron host provides concrete implementations
 * for `NotificationHostPort` (native notifications, Windows scheduled toasts)
 * and `NotificationStorePort` (electron-store persistence) via `forRoot`.
 */
@Module({})
export class NotificationsModule {
  static forRoot(options: { hostProvider: Provider; storeProvider: Provider }): DynamicModule {
    return {
      module: NotificationsModule,
      imports: [ScheduleModule, LibraryModule],
      providers: [options.hostProvider, options.storeProvider, NotificationsService],
      exports: [NotificationsService],
    };
  }
}

export { NotificationHostPort, NotificationStorePort };
