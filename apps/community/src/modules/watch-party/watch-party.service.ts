import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { customAlphabet } from 'nanoid';
import { RedisService } from '@/modules/redis/redis.service';
import type { WatchPartyRoom, WatchPartyMember, CreateRoomPayload } from '@shiroani/shared';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;
const ROOM_TTL_SECONDS = 6 * 60 * 60; // 6 hours

const generateCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);

@Injectable()
export class WatchPartyService {
  constructor(
    private readonly redis: RedisService,
    @InjectPinoLogger(WatchPartyService.name) private readonly logger: PinoLogger
  ) {}

  async createRoom(payload: CreateRoomPayload): Promise<WatchPartyRoom> {
    const roomCode = generateCode();
    const now = Date.now();

    const room: WatchPartyRoom = {
      id: roomCode,
      name: payload.name,
      roomCode,
      hostId: payload.user.id,
      hostName: payload.user.username,
      hostAvatar: payload.user.avatar,
      type: payload.type,
      maxMembers: payload.maxMembers,
      memberCount: 1,
      status: 'waiting',
      createdAt: now,
    };

    const roomKey = `party:room:${roomCode}`;
    await this.redis.set(roomKey, JSON.stringify(room), 'EX', ROOM_TTL_SECONDS);

    // Add host as first member
    const hostMember: WatchPartyMember = {
      userId: payload.user.id,
      username: payload.user.username,
      globalName: payload.user.globalName,
      avatar: payload.user.avatar,
      isHost: true,
      isReady: false,
      joinedAt: now,
    };

    await this.redis.sadd(`party:members:${roomCode}`, payload.user.id);
    await this.redis.set(
      `party:member:${roomCode}:${payload.user.id}`,
      JSON.stringify(hostMember),
      'EX',
      ROOM_TTL_SECONDS
    );

    if (payload.type === 'public') {
      await this.redis.sadd('party:public', roomCode);
    }

    this.logger.info('Room created: %s by %s', roomCode, payload.user.username);
    return room;
  }

  async joinRoom(
    roomCode: string,
    user: { id: string; username: string; globalName: string | null; avatar: string | null }
  ): Promise<{ room: WatchPartyRoom; members: WatchPartyMember[] }> {
    const room = await this.getRoomState(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status === 'ended') {
      throw new Error('Room has ended');
    }

    const memberIds = await this.redis.smembers(`party:members:${roomCode}`);
    if (memberIds.length >= room.maxMembers) {
      throw new Error('Room is full');
    }

    // Check if already a member
    const existing = await this.redis.get(`party:member:${roomCode}:${user.id}`);
    if (existing) {
      // Already in the room, return current state
      const members = await this.getMembers(roomCode);
      return { room, members };
    }

    const now = Date.now();
    const member: WatchPartyMember = {
      userId: user.id,
      username: user.username,
      globalName: user.globalName,
      avatar: user.avatar,
      isHost: false,
      isReady: false,
      joinedAt: now,
    };

    const ttl = await this.redis.ttl(`party:room:${roomCode}`);
    const memberTtl = ttl > 0 ? ttl : ROOM_TTL_SECONDS;

    await this.redis.sadd(`party:members:${roomCode}`, user.id);
    await this.redis.set(
      `party:member:${roomCode}:${user.id}`,
      JSON.stringify(member),
      'EX',
      memberTtl
    );

    // Update member count
    room.memberCount = memberIds.length + 1;
    await this.redis.set(
      `party:room:${roomCode}`,
      JSON.stringify(room),
      'EX',
      ttl > 0 ? ttl : ROOM_TTL_SECONDS
    );

    const members = await this.getMembers(roomCode);
    this.logger.info('User %s joined room %s', user.username, roomCode);
    return { room, members };
  }

  async leaveRoom(
    roomCode: string,
    userId: string
  ): Promise<{ isEmpty: boolean; newHostId?: string }> {
    await this.redis.srem(`party:members:${roomCode}`, userId);
    await this.redis.del(`party:member:${roomCode}:${userId}`);

    const remainingIds = await this.redis.smembers(`party:members:${roomCode}`);

    if (remainingIds.length === 0) {
      await this.closeRoom(roomCode);
      this.logger.info('Room %s closed (empty)', roomCode);
      return { isEmpty: true };
    }

    const room = await this.getRoomState(roomCode);
    if (!room) {
      return { isEmpty: true };
    }

    let newHostId: string | undefined;

    // If the leaving user was the host, promote the first remaining member
    if (room.hostId === userId) {
      newHostId = remainingIds[0];

      // Update new host's member data
      const newHostRaw = await this.redis.get(`party:member:${roomCode}:${newHostId}`);
      if (newHostRaw) {
        const newHost: WatchPartyMember = JSON.parse(newHostRaw);
        newHost.isHost = true;
        const ttl = await this.redis.ttl(`party:member:${roomCode}:${newHostId}`);
        await this.redis.set(
          `party:member:${roomCode}:${newHostId}`,
          JSON.stringify(newHost),
          'EX',
          ttl > 0 ? ttl : ROOM_TTL_SECONDS
        );

        // Update room host info
        room.hostId = newHostId;
        room.hostName = newHost.username;
        room.hostAvatar = newHost.avatar;
      }
    }

    // Update member count
    room.memberCount = remainingIds.length;
    const roomTtl = await this.redis.ttl(`party:room:${roomCode}`);
    await this.redis.set(
      `party:room:${roomCode}`,
      JSON.stringify(room),
      'EX',
      roomTtl > 0 ? roomTtl : ROOM_TTL_SECONDS
    );

    this.logger.info('User %s left room %s', userId, roomCode);
    return { isEmpty: false, newHostId };
  }

  async getRoomState(roomCode: string): Promise<WatchPartyRoom | null> {
    const raw = await this.redis.get(`party:room:${roomCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as WatchPartyRoom;
  }

  async getMembers(roomCode: string): Promise<WatchPartyMember[]> {
    const memberIds = await this.redis.smembers(`party:members:${roomCode}`);
    if (memberIds.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const id of memberIds) {
      pipeline.get(`party:member:${roomCode}:${id}`);
    }

    const results = await pipeline.exec();
    if (!results) return [];

    const members: WatchPartyMember[] = [];
    for (const [err, raw] of results) {
      if (!err && raw && typeof raw === 'string') {
        members.push(JSON.parse(raw) as WatchPartyMember);
      }
    }

    return members.sort((a, b) => a.joinedAt - b.joinedAt);
  }

  async getPublicRooms(): Promise<WatchPartyRoom[]> {
    const codes = await this.redis.smembers('party:public');
    if (codes.length === 0) return [];

    const pipeline = this.redis.pipeline();
    for (const code of codes) {
      pipeline.get(`party:room:${code}`);
    }

    const results = await pipeline.exec();
    if (!results) return [];

    const rooms: WatchPartyRoom[] = [];
    const staleKeys: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const [err, raw] = results[i];
      if (!err && raw && typeof raw === 'string') {
        const room = JSON.parse(raw) as WatchPartyRoom;
        if (room.status !== 'ended') {
          rooms.push(room);
        } else {
          staleKeys.push(codes[i]);
        }
      } else {
        // Room key expired, clean up public set
        staleKeys.push(codes[i]);
      }
    }

    // Clean up stale entries from the public set
    if (staleKeys.length > 0) {
      await this.redis.srem('party:public', ...staleKeys);
    }

    return rooms.sort((a, b) => b.createdAt - a.createdAt);
  }

  async toggleReady(roomCode: string, userId: string): Promise<boolean> {
    const key = `party:member:${roomCode}:${userId}`;
    const raw = await this.redis.get(key);
    if (!raw) {
      throw new Error('Member not found');
    }

    const member: WatchPartyMember = JSON.parse(raw);
    member.isReady = !member.isReady;

    const ttl = await this.redis.ttl(key);
    await this.redis.set(key, JSON.stringify(member), 'EX', ttl > 0 ? ttl : ROOM_TTL_SECONDS);

    return member.isReady;
  }

  async closeRoom(roomCode: string): Promise<void> {
    const memberIds = await this.redis.smembers(`party:members:${roomCode}`);

    const keysToDelete = [
      `party:room:${roomCode}`,
      `party:members:${roomCode}`,
      ...memberIds.map(id => `party:member:${roomCode}:${id}`),
    ];

    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
    }

    await this.redis.srem('party:public', roomCode);
    this.logger.info('Room %s closed', roomCode);
  }
}
