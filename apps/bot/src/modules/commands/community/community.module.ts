import { Module } from '@nestjs/common';
import { PostCommand } from './post.command';
import { ReactionRoleCommand } from './reaction-role.command';

@Module({
  providers: [PostCommand, ReactionRoleCommand],
})
export class CommunityModule {}
