import { Module } from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeGateway } from './anime.gateway';

@Module({
  providers: [AnimeService, AnimeGateway],
  exports: [AnimeService],
})
export class AnimeModule {}
