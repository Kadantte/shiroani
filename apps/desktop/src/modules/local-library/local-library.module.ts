import { Module } from '@nestjs/common';
import { LocalLibraryService } from './local-library.service';
import { LocalLibraryGateway } from './local-library.gateway';
import { FfmpegService } from './ffmpeg/ffmpeg.service';
import { FfmpegInstallerService } from './ffmpeg/ffmpeg-installer.service';
import { FfmpegGateway } from './ffmpeg/ffmpeg.gateway';
import { ScannerService } from './scanner/scanner.service';
import { ScannerGateway } from './scanner/scanner.gateway';

@Module({
  providers: [
    LocalLibraryService,
    LocalLibraryGateway,
    FfmpegService,
    FfmpegInstallerService,
    FfmpegGateway,
    ScannerService,
    ScannerGateway,
  ],
  exports: [LocalLibraryService, FfmpegService, ScannerService],
})
export class LocalLibraryModule {}
