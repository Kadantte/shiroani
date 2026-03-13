import { Module } from '@nestjs/common';
import { PingCommand } from './utility/ping.command';
import { ModerationModule } from './moderation/moderation.module';
import { CommunityModule } from './community/community.module';

@Module({
  imports: [ModerationModule, CommunityModule],
  providers: [PingCommand],
})
export class CommandsModule {}
