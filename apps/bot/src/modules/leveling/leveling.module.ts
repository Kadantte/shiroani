import { Module } from '@nestjs/common';
import { XpService } from '@/modules/leveling/xp.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';

@Module({
  providers: [XpService, LevelRoleService],
  exports: [XpService, LevelRoleService],
})
export class LevelingModule {}
