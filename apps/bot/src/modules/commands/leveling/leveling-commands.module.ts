import { Module } from '@nestjs/common';
import { RankCommand } from './rank.command';
import { LeaderboardCommand } from './leaderboard.command';
import { SetupLevelsCommand } from './setup-levels.command';
import { LevelingModule } from '@/modules/leveling/leveling.module';

@Module({
  imports: [LevelingModule],
  providers: [RankCommand, LeaderboardCommand, SetupLevelsCommand],
})
export class LevelingCommandsModule {}
