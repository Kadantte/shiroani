import { Module } from '@nestjs/common';
import { DiaryService } from './diary.service';
import { DiaryGateway } from './diary.gateway';

@Module({
  providers: [DiaryService, DiaryGateway],
  exports: [DiaryService],
})
export class DiaryModule {}
