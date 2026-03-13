import { Injectable } from '@nestjs/common';
import { Context, Once, ContextOf } from 'necord';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class ReadyEvent {
  constructor(@InjectPinoLogger(ReadyEvent.name) private readonly logger: PinoLogger) {}

  @Once('clientReady')
  onReady(@Context() [client]: ContextOf<'clientReady'>) {
    this.logger.info(
      `Bot logged in as ${client.user.username} | Guilds: ${client.guilds.cache.size}`
    );
  }
}
