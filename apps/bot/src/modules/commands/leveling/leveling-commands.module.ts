import { Module } from '@nestjs/common';
import { RankCommand } from './rank.command';
import { LeaderboardCommand } from './leaderboard.command';
import { SetupLevelsCommand } from './setup-levels.command';

@Module({
  providers: [RankCommand, LeaderboardCommand, SetupLevelsCommand],
})
export class LevelingCommandsModule {}
