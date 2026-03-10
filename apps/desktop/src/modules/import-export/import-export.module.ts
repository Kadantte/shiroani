import { Module } from '@nestjs/common';
import { LibraryModule } from '../library';
import { DiaryModule } from '../diary';
import { ImportExportService } from './import-export.service';
import { ImportExportGateway } from './import-export.gateway';

@Module({
  imports: [LibraryModule, DiaryModule],
  providers: [ImportExportService, ImportExportGateway],
  exports: [ImportExportService],
})
export class ImportExportModule {}
