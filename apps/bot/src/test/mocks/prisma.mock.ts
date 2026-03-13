import { PrismaService } from '@/modules/prisma/prisma.service';

export function createMockPrismaService(): jest.Mocked<
  Pick<
    PrismaService,
    'guild' | 'moderationLog' | 'reactionRole' | 'member' | 'levelRole' | '$connect' | '$disconnect'
  >
> {
  return {
    guild: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    } as any,
    moderationLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    } as any,
    reactionRole: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    } as any,
    member: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    } as any,
    levelRole: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    } as any,
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}
