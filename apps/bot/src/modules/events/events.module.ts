import { Module } from '@nestjs/common';
import { ReadyEvent } from './ready.event';
import { GuildMemberEvent } from './guild-member.event';
import { GuildEvent } from './guild.event';
import { MessageAuditEvent } from './message-audit.event';

@Module({
  providers: [ReadyEvent, GuildMemberEvent, GuildEvent, MessageAuditEvent],
})
export class EventsModule {}
