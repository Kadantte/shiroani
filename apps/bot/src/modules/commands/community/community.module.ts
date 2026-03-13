import { Module } from '@nestjs/common';
import { PostCommand } from './post.command';

@Module({
  providers: [PostCommand],
})
export class CommunityModule {}
