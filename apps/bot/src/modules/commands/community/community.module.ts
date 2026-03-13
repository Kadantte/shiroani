import { Module } from '@nestjs/common';
import { EventsModule } from '@/modules/events/events.module';
import { PostCommand } from './post.command';
import { VerifyCommand } from './verify.command';
import { ReactionRoleCommand } from './reaction-role.command';

@Module({
  imports: [EventsModule],
  providers: [PostCommand, VerifyCommand, ReactionRoleCommand],
})
export class CommunityModule {}
