import { Module } from '@nestjs/common';
import { BrowserService } from './browser.service';
import { BrowserGateway } from './browser.gateway';

@Module({
  providers: [BrowserService, BrowserGateway],
  exports: [BrowserService],
})
export class BrowserModule {}
