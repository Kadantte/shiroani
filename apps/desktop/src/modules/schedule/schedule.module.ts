import { Module } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { ScheduleGateway } from './schedule.gateway';
import { AnimeModule } from '../anime';

@Module({
  imports: [AnimeModule],
  providers: [ScheduleService, ScheduleGateway],
  exports: [ScheduleService],
})
export class ScheduleModule {}
