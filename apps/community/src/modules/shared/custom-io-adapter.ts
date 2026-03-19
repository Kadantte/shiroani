import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions, Server } from 'socket.io';

/**
 * Custom Socket.io adapter.
 *
 * NOTE: Connection State Recovery (CSR) is intentionally NOT enabled here
 * because it is incompatible with the Redis adapter used for horizontal
 * scaling. State recovery will be handled at the application level instead.
 */
export class CustomIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: Partial<ServerOptions>) {
    const server: Server = super.createIOServer(port, options);

    // Multiple NestJS WebSocket gateways share one Socket.IO server. Each
    // gateway adds ~2 "disconnect" listeners per client socket (from
    // bindClientDisconnect + RxJS fromEvent), exceeding Node's default
    // limit of 10. Raise it to avoid MaxListenersExceeded warnings.
    server.on('connection', socket => {
      socket.setMaxListeners(20);
    });

    return server;
  }
}
