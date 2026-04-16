import { Module } from '@nestjs/common';
import { LocalLibraryService } from './local-library.service';
import { LocalLibraryGateway } from './local-library.gateway';
import { FfmpegService } from './ffmpeg/ffmpeg.service';
import { FfmpegInstallerService } from './ffmpeg/ffmpeg-installer.service';
import { FfmpegGateway } from './ffmpeg/ffmpeg.gateway';

@Module({
  providers: [
    LocalLibraryService,
    LocalLibraryGateway,
    FfmpegService,
    FfmpegInstallerService,
    FfmpegGateway,
  ],
  exports: [LocalLibraryService, FfmpegService],
})
export class LocalLibraryModule {}
