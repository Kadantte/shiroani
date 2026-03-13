import { Global, Module } from '@nestjs/common';
import { XpService } from '@/modules/leveling/xp.service';
import { LevelRoleService } from '@/modules/leveling/level-role.service';

@Global()
@Module({
  providers: [XpService, LevelRoleService],
  exports: [XpService, LevelRoleService],
})
export class LevelingModule {}
