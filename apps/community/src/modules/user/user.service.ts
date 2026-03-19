import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '@/modules/prisma/prisma.service';

export interface DiscordUserProfile {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  banner: string | null;
  accent_color: number | null;
  locale: string | null;
  premium_type: number | null;
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectPinoLogger(UserService.name) private readonly logger: PinoLogger
  ) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByDiscordId(discordId: string) {
    return this.prisma.user.findUnique({
      where: { discordId },
    });
  }

  async upsert(discordUser: DiscordUserProfile) {
    this.logger.debug({ discordId: discordUser.id }, 'Upserting user');

    return this.prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        banner: discordUser.banner,
        accentColor: discordUser.accent_color,
        locale: discordUser.locale,
        premiumType: discordUser.premium_type,
      },
      create: {
        discordId: discordUser.id,
        username: discordUser.username,
        globalName: discordUser.global_name,
        avatar: discordUser.avatar,
        banner: discordUser.banner,
        accentColor: discordUser.accent_color,
        locale: discordUser.locale,
        premiumType: discordUser.premium_type,
      },
    });
  }
}
