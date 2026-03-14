import { LevelRoleService } from './level-role.service';
import { createMockPrismaService } from '@/test/mocks';
import { PrismaService } from '@/modules/prisma/prisma.service';

describe('LevelRoleService', () => {
  let service: LevelRoleService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(() => {
    prisma = createMockPrismaService();
    service = new LevelRoleService(prisma as unknown as PrismaService);
  });

  describe('getLevelRoles', () => {
    it('should return roles ordered by level ascending', async () => {
      const roles = [
        { id: 'lr-1', guildId: 'guild-1', level: 5, roleId: 'role-5' },
        { id: 'lr-2', guildId: 'guild-1', level: 10, roleId: 'role-10' },
      ];
      (prisma.levelRole.findMany as jest.Mock).mockResolvedValue(roles);

      const result = await service.getLevelRoles('guild-1');

      expect(prisma.levelRole.findMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-1' },
        orderBy: { level: 'asc' },
      });
      expect(result).toEqual(roles);
    });

    it('should return empty array when no roles exist', async () => {
      (prisma.levelRole.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getLevelRoles('guild-1');

      expect(result).toEqual([]);
    });
  });

  describe('addLevelRole', () => {
    it('should create a level role record', async () => {
      const created = { id: 'lr-1', guildId: 'guild-1', level: 5, roleId: 'role-5' };
      (prisma.levelRole.create as jest.Mock).mockResolvedValue(created);

      const result = await service.addLevelRole('guild-1', 5, 'role-5');

      expect(prisma.levelRole.create).toHaveBeenCalledWith({
        data: { guildId: 'guild-1', level: 5, roleId: 'role-5' },
      });
      expect(result).toEqual(created);
    });
  });

  describe('removeLevelRole', () => {
    it('should delete a level role by compound key', async () => {
      const deleted = { id: 'lr-1', guildId: 'guild-1', level: 5, roleId: 'role-5' };
      (prisma.levelRole.delete as jest.Mock).mockResolvedValue(deleted);

      const result = await service.removeLevelRole('guild-1', 5);

      expect(prisma.levelRole.delete).toHaveBeenCalledWith({
        where: { guildId_level: { guildId: 'guild-1', level: 5 } },
      });
      expect(result).toEqual(deleted);
    });
  });

  describe('getRolesForLevel', () => {
    it('should return all roles up to and including the given level', async () => {
      const roles = [
        { id: 'lr-1', guildId: 'guild-1', level: 5, roleId: 'role-5' },
        { id: 'lr-2', guildId: 'guild-1', level: 10, roleId: 'role-10' },
      ];
      (prisma.levelRole.findMany as jest.Mock).mockResolvedValue(roles);

      const result = await service.getRolesForLevel('guild-1', 10);

      expect(prisma.levelRole.findMany).toHaveBeenCalledWith({
        where: { guildId: 'guild-1', level: { lte: 10 } },
        orderBy: { level: 'asc' },
      });
      expect(result).toEqual(roles);
    });

    it('should return empty array when no roles qualify', async () => {
      (prisma.levelRole.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRolesForLevel('guild-1', 2);

      expect(result).toEqual([]);
    });
  });
});
