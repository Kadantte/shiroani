import { Module } from '@nestjs/common';
import { PostCommand } from './post.command';
import { VerifyCommand } from './verify.command';
import { ReactionRoleCommand } from './reaction-role.command';

@Module({
  providers: [PostCommand, VerifyCommand, ReactionRoleCommand],
})
export class CommunityModule {}
