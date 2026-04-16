import { Module } from '@nestjs/common';
import { AnimeModule } from '../anime';
import { LocalLibraryService } from './local-library.service';
import { LocalLibraryGateway } from './local-library.gateway';
import { AniListSearchService } from './anilist-search.service';
import { FfmpegService } from './ffmpeg/ffmpeg.service';
import { FfmpegInstallerService } from './ffmpeg/ffmpeg-installer.service';
import { FfmpegGateway } from './ffmpeg/ffmpeg.gateway';
import { ScannerService } from './scanner/scanner.service';
import { ScannerGateway } from './scanner/scanner.gateway';
import { PlayerService } from './player/player.service';
import { PlayerGateway } from './player/player.gateway';

@Module({
  imports: [AnimeModule],
  providers: [
    LocalLibraryService,
    LocalLibraryGateway,
    AniListSearchService,
    FfmpegService,
    FfmpegInstallerService,
    FfmpegGateway,
    ScannerService,
    ScannerGateway,
    // Player session subsystem -- serves episode streams over a local HTTP
    // server and manages the per-session ffmpeg pipeline.
    PlayerService,
    PlayerGateway,
  ],
  exports: [LocalLibraryService, FfmpegService, ScannerService, PlayerService],
})
export class LocalLibraryModule {}
