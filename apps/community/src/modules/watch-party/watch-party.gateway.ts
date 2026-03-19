import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import {
  WatchPartyEvents,
  type CreateRoomPayload,
  type JoinRoomPayload,
  type SendMessagePayload,
  type StartCountdownPayload,
  type SignalPayload,
  type WatchPartyMessage,
  type Logger,
} from '@shiroani/shared';
import { WsThrottlerGuard } from '@/modules/shared/ws-throttler.guard';
import { handleGatewayRequest } from '@/modules/shared/gateway-handler';
import { WatchPartyService } from './watch-party.service';

@WebSocketGateway({ cors: { origin: '*' } })
@UseGuards(WsThrottlerGuard)
export class WatchPartyGateway implements OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  /** Active countdown intervals keyed by roomCode */
  private countdownIntervals = new Map<string, ReturnType<typeof setInterval>>();

  /** Adapts PinoLogger to the shared Logger interface for handleGatewayRequest */
  private readonly gatewayLogger: Logger;

  constructor(
    private readonly watchPartyService: WatchPartyService,
    @InjectPinoLogger(WatchPartyGateway.name) private readonly logger: PinoLogger
  ) {
    const bind = (method: 'error' | 'warn' | 'info' | 'debug') =>
      ((...args: unknown[]) => {
        this.logger[method](String(args[0] ?? ''), ...args.slice(1));
      }) as Logger['error'];

    this.gatewayLogger = {
      error: bind('error'),
      warn: bind('warn'),
      info: bind('info'),
      debug: bind('debug'),
      log: bind('info'),
    };
  }

  @SubscribeMessage(WatchPartyEvents.CREATE)
  async handleCreate(@MessageBody() payload: CreateRoomPayload, @ConnectedSocket() client: Socket) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:create — user="${payload.user.username}"`,
      defaultResult: { room: null },
      handler: async () => {
        const room = await this.watchPartyService.createRoom(payload);
        const members = await this.watchPartyService.getMembers(room.roomCode);

        client.join(`party:${room.roomCode}`);
        client.data.roomCode = room.roomCode;
        client.data.userId = payload.user.id;

        return { room, members };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.JOIN)
  async handleJoin(@MessageBody() payload: JoinRoomPayload, @ConnectedSocket() client: Socket) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:join — room="${payload.roomCode}", user="${payload.user.username}"`,
      defaultResult: { room: null, members: [] },
      handler: async () => {
        const { room, members } = await this.watchPartyService.joinRoom(
          payload.roomCode,
          payload.user
        );

        client.join(`party:${payload.roomCode}`);
        client.data.roomCode = payload.roomCode;
        client.data.userId = payload.user.id;

        // Broadcast to other members in the room
        const newMember = members.find(m => m.userId === payload.user.id);
        if (newMember) {
          client.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.MEMBER_JOINED, {
            member: newMember,
            memberCount: room.memberCount,
          });
        }

        return { room, members };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.LEAVE)
  async handleLeave(
    @MessageBody() payload: { roomCode: string },
    @ConnectedSocket() client: Socket
  ) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:leave — room="${payload.roomCode}", user="${client.data.userId}"`,
      defaultResult: { success: false },
      handler: async () => {
        const userId = client.data.userId as string;
        if (!userId) throw new Error('User not identified');

        const result = await this.watchPartyService.leaveRoom(payload.roomCode, userId);

        client.leave(`party:${payload.roomCode}`);
        client.data.roomCode = undefined;
        client.data.userId = undefined;

        if (result.isEmpty) {
          this.clearCountdown(payload.roomCode);
          this.server.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.ROOM_CLOSED, {
            roomCode: payload.roomCode,
          });
        } else {
          const members = await this.watchPartyService.getMembers(payload.roomCode);
          client.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.MEMBER_LEFT, {
            userId,
            newHostId: result.newHostId,
            members,
          });
        }

        return { success: true };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.LIST_PUBLIC)
  async handleListPublic() {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: 'watch-party:list-public',
      defaultResult: { rooms: [] },
      handler: async () => {
        const rooms = await this.watchPartyService.getPublicRooms();
        return { rooms };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.SEND_MESSAGE)
  async handleSendMessage(
    @MessageBody() payload: SendMessagePayload,
    @ConnectedSocket() client: Socket
  ) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:send-message — room="${payload.roomCode}"`,
      defaultResult: { success: false },
      handler: async () => {
        const userId = client.data.userId as string;
        if (!userId) throw new Error('User not identified');

        const members = await this.watchPartyService.getMembers(payload.roomCode);
        const sender = members.find(m => m.userId === userId);
        if (!sender) throw new Error('Not a member of this room');

        const message: WatchPartyMessage = {
          id: randomUUID(),
          userId: sender.userId,
          username: sender.username,
          avatar: sender.avatar,
          content: payload.content,
          type: 'text',
          timestamp: Date.now(),
        };

        this.server.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.MESSAGE, message);
        return { success: true };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.COUNTDOWN_START)
  async handleCountdownStart(@MessageBody() payload: StartCountdownPayload) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:countdown-start — room="${payload.roomCode}", seconds=${payload.seconds}`,
      defaultResult: { success: false },
      handler: async () => {
        const room = await this.watchPartyService.getRoomState(payload.roomCode);
        if (!room) throw new Error('Room not found');

        // Clear any existing countdown for this room
        this.clearCountdown(payload.roomCode);

        const totalSeconds = payload.seconds;
        let remaining = totalSeconds;

        this.server.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.COUNTDOWN_START, {
          seconds: totalSeconds,
          startedAt: Date.now(),
        });

        const interval = setInterval(() => {
          remaining -= 1;

          if (remaining <= 0) {
            this.clearCountdown(payload.roomCode);
            this.server
              .to(`party:${payload.roomCode}`)
              .emit(WatchPartyEvents.COUNTDOWN_DONE, { roomCode: payload.roomCode });
          } else {
            this.server
              .to(`party:${payload.roomCode}`)
              .emit(WatchPartyEvents.COUNTDOWN_TICK, { remaining });
          }
        }, 1000);

        this.countdownIntervals.set(payload.roomCode, interval);
        return { success: true };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.READY_TOGGLE)
  async handleReadyToggle(
    @MessageBody() payload: { roomCode: string },
    @ConnectedSocket() client: Socket
  ) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:ready-toggle — room="${payload.roomCode}"`,
      defaultResult: { success: false },
      handler: async () => {
        const userId = client.data.userId as string;
        if (!userId) throw new Error('User not identified');

        const isReady = await this.watchPartyService.toggleReady(payload.roomCode, userId);

        this.server.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.MEMBER_READY, {
          userId,
          isReady,
        });

        return { success: true, isReady };
      },
    });
  }

  @SubscribeMessage(WatchPartyEvents.SIGNAL)
  async handleSignal(@MessageBody() payload: SignalPayload) {
    return handleGatewayRequest({
      logger: this.gatewayLogger,
      action: `watch-party:signal — room="${payload.roomCode}", signal="${payload.signal}"`,
      defaultResult: { success: false },
      handler: async () => {
        this.server.to(`party:${payload.roomCode}`).emit(WatchPartyEvents.SIGNAL, {
          signal: payload.signal,
          data: payload.data,
        });
        return { success: true };
      },
    });
  }

  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const roomCode = client.data.roomCode as string | undefined;
    const userId = client.data.userId as string | undefined;

    if (!roomCode || !userId) return;

    try {
      const result = await this.watchPartyService.leaveRoom(roomCode, userId);

      if (result.isEmpty) {
        this.clearCountdown(roomCode);
        this.server.to(`party:${roomCode}`).emit(WatchPartyEvents.ROOM_CLOSED, { roomCode });
      } else {
        const members = await this.watchPartyService.getMembers(roomCode);
        client.to(`party:${roomCode}`).emit(WatchPartyEvents.MEMBER_LEFT, {
          userId,
          newHostId: result.newHostId,
          members,
        });
      }
    } catch (error) {
      this.logger.error(
        'Error handling disconnect for user %s in room %s: %o',
        userId,
        roomCode,
        error
      );
    }
  }

  private clearCountdown(roomCode: string): void {
    const interval = this.countdownIntervals.get(roomCode);
    if (interval) {
      clearInterval(interval);
      this.countdownIntervals.delete(roomCode);
    }
  }
}
