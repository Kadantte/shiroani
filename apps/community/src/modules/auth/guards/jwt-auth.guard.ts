import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface JwtPayload {
  sub: string;
  sid: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (context.getType() === 'ws') {
      const client = context.switchToWs().getClient();
      if (client.data?.user) {
        return true;
      }
      throw new UnauthorizedException('WebSocket connection not authenticated');
    }

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        throw new UnauthorizedException('Missing authorization token');
      }

      let payload: JwtPayload;
      try {
        payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }

      const session = await this.prisma.session.findFirst({
        where: {
          id: payload.sid,
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = user;
      request.sessionId = payload.sid;
      return true;
    }

    throw new UnauthorizedException('Unsupported transport');
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
