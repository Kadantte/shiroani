import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class LevelRoleService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get all level roles for a guild, ordered by level ascending */
  async getLevelRoles(guildInternalId: string) {
    return this.prisma.levelRole.findMany({
      where: { guildId: guildInternalId },
      orderBy: { level: 'asc' },
    });
  }

  /** Add a level role */
  async addLevelRole(guildInternalId: string, level: number, roleId: string) {
    return this.prisma.levelRole.create({
      data: { guildId: guildInternalId, level, roleId },
    });
  }

  /** Remove a level role */
  async removeLevelRole(guildInternalId: string, level: number) {
    return this.prisma.levelRole.delete({
      where: { guildId_level: { guildId: guildInternalId, level } },
    });
  }

  /** Get roles that should be assigned for a given level */
  async getRolesForLevel(guildInternalId: string, level: number) {
    return this.prisma.levelRole.findMany({
      where: { guildId: guildInternalId, level: { lte: level } },
      orderBy: { level: 'asc' },
    });
  }
}
