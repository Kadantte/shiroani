import { Global, Module } from '@nestjs/common';
import { ReactionRoleCacheService } from './reaction-role-cache.service';

@Global()
@Module({
  providers: [ReactionRoleCacheService],
  exports: [ReactionRoleCacheService],
})
export class ReactionRoleCacheModule {}
