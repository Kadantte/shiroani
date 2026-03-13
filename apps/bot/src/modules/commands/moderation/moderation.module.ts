import { Module } from '@nestjs/common';
import { BanCommand } from './ban.command';
import { MuteCommand } from './mute.command';
import { ClearCommand } from './clear.command';
import { SetupCommand } from './setup.command';
import { ModLogService } from './mod-log.service';

@Module({
  providers: [ModLogService, BanCommand, MuteCommand, ClearCommand, SetupCommand],
  exports: [ModLogService],
})
export class ModerationModule {}
