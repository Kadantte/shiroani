import { Module } from '@nestjs/common';
import { PingCommand } from './utility/ping.command';
import { ModerationModule } from './moderation/moderation.module';
import { CommunityModule } from './community/community.module';
import { LevelingCommandsModule } from './leveling/leveling-commands.module';

@Module({
  imports: [ModerationModule, CommunityModule, LevelingCommandsModule],
  providers: [PingCommand],
})
export class CommandsModule {}
