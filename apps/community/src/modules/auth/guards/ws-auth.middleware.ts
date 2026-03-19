import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/modules/prisma/prisma.service';
import type { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

/**
 * Creates Socket.IO middleware that authenticates WebSocket connections.
 *
 * This is NOT a NestJS guard — it runs as raw Socket.IO middleware before
 * NestJS handles the connection, attaching the verified user to socket.data.
 */
export function createWsAuthMiddleware(jwtService: JwtService, prisma: PrismaService) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Unauthorized: Missing token'));
    }

    let payload: JwtPayload;
    try {
      payload = await jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      return next(new Error('Unauthorized: Invalid token'));
    }

    const session = await prisma.session.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return next(new Error('Unauthorized: Session expired or revoked'));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return next(new Error('Unauthorized: User not found'));
    }

    socket.data.user = user;
    next();
  };
}
