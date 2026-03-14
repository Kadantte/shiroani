import { Module } from '@nestjs/common';
import { ReadyEvent } from './ready.event';
import { GuildMemberEvent } from './guild-member.event';
import { GuildEvent } from './guild.event';
import { MessageAuditEvent } from './message-audit.event';
import { ReactionRoleEvent } from './reaction-role.event';
import { XpMessageEvent } from './xp-message.event';
import { LevelingModule } from '@/modules/leveling/leveling.module';

@Module({
  imports: [LevelingModule],
  providers: [
    ReadyEvent,
    GuildMemberEvent,
    GuildEvent,
    MessageAuditEvent,
    ReactionRoleEvent,
    XpMessageEvent,
  ],
})
export class EventsModule {}
