import { Module } from '@nestjs/common';
import { AniListClient } from './anilist-client';
import { AnimeService } from './anime.service';
import { AnimeGateway } from './anime.gateway';

@Module({
  providers: [AniListClient, AnimeService, AnimeGateway],
  exports: [AnimeService, AniListClient],
})
export class AnimeModule {}
