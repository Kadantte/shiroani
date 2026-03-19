import { Module } from '@nestjs/common';
import { WatchPartyService } from './watch-party.service';
import { WatchPartyGateway } from './watch-party.gateway';

@Module({
  providers: [WatchPartyService, WatchPartyGateway],
})
export class WatchPartyModule {}
