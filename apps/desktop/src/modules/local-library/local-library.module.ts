import { Module } from '@nestjs/common';
import { LocalLibraryService } from './local-library.service';
import { LocalLibraryGateway } from './local-library.gateway';

@Module({
  providers: [LocalLibraryService, LocalLibraryGateway],
  exports: [LocalLibraryService],
})
export class LocalLibraryModule {}
