import { Module } from '@nestjs/common';
import { FeedService } from './feed.service';
import { FeedGateway } from './feed.gateway';

@Module({
  providers: [FeedService, FeedGateway],
  exports: [FeedService],
})
export class FeedModule {}
