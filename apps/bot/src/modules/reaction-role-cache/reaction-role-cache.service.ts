import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/modules/prisma/prisma.service';

@Injectable()
export class ReactionRoleCacheService {
  private readonly knownMessageIds = new Set<string>();
  private initPromise: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  ensureInitialized() {
    if (!this.initPromise) {
      this.initPromise = this.doInit();
    }
    return this.initPromise;
  }

  private async doInit() {
    const mappings = await this.prisma.reactionRole.findMany({
      select: { messageId: true },
      distinct: ['messageId'],
    });
    for (const m of mappings) this.knownMessageIds.add(m.messageId);
  }

  has(messageId: string): boolean {
    return this.knownMessageIds.has(messageId);
  }

  add(messageId: string) {
    this.knownMessageIds.add(messageId);
  }

  remove(messageId: string) {
    this.knownMessageIds.delete(messageId);
  }
}
