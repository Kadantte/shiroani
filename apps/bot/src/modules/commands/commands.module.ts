import { Module } from '@nestjs/common';
import { PingCommand } from './utility/ping.command';
import { ModerationModule } from './moderation/moderation.module';

@Module({
  imports: [ModerationModule],
  providers: [PingCommand],
})
export class CommandsModule {}
