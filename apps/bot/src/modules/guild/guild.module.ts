import { Global, Module } from '@nestjs/common';
import { GuildService } from './guild.service';

@Global()
@Module({
  providers: [GuildService],
  exports: [GuildService],
})
export class GuildModule {}
