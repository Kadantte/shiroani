/**
 * PlayerGateway -- socket.io handlers for the player-session API.
 *
 * Contract:
 *   OPEN_PLAYER_SESSION       -> OPEN_PLAYER_SESSION_RESULT (success/fail)
 *   CLOSE_PLAYER_SESSION      -> CLOSE_PLAYER_SESSION_RESULT
 *   SEEK_PLAYER_SESSION       -> SEEK_RESULT
 *   SWITCH_AUDIO_TRACK        -> SEEK_RESULT (same payload shape)
 *
 * Errors are translated to typed codes (FFMPEG_NOT_INSTALLED, FILE_NOT_FOUND,
 * PROBE_FAILED, INVALID_PAYLOAD, INTERNAL_ERROR) so the renderer's player
 * view can branch on `code` without string-matching messages.
 */

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { UseGuards } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  createLogger,
  LocalLibraryEvents,
  extractErrorMessage,
  type PlayerClosePayload,
  type PlayerCloseResult,
  type PlayerOpenErrorCode,
  type PlayerOpenSessionPayload,
  type PlayerOpenSessionResult,
  type PlayerSeekPayload,
  type PlayerSeekResult,
  type PlayerSwitchAudioPayload,
} from '@shiroani/shared';

import { CORS_CONFIG } from '../../shared/cors.config';
import { WsThrottlerGuard } from '../../shared/ws-throttler.guard';
import { FfmpegNotInstalledError } from '../ffmpeg/ffmpeg.errors';
import { PlayerFileNotFoundError, PlayerProbeFailedError, PlayerService } from './player.service';

const logger = createLogger('PlayerGateway');

@WebSocketGateway({ cors: CORS_CONFIG })
@UseGuards(WsThrottlerGuard)
export class PlayerGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly playerService: PlayerService) {
    logger.info('PlayerGateway initialized');
  }

  @SubscribeMessage(LocalLibraryEvents.OPEN_PLAYER_SESSION)
  async handleOpenSession(
    @MessageBody() payload: PlayerOpenSessionPayload
  ): Promise<PlayerOpenSessionResult> {
    logger.info(`open-player-session episode=${payload?.episodeId ?? 'unknown'}`);
    if (typeof payload?.episodeId !== 'number') {
      return {
        ok: false,
        error: { code: 'INVALID_PAYLOAD', message: 'Missing episodeId' },
      };
    }

    try {
      const session = await this.playerService.openSession(payload.episodeId);
      return { ok: true, session };
    } catch (err) {
      const { code, message } = this.classifyOpenError(err);
      logger.error(`open-player-session failed code=${code}: ${message}`);
      return { ok: false, error: { code, message } };
    }
  }

  @SubscribeMessage(LocalLibraryEvents.CLOSE_PLAYER_SESSION)
  async handleCloseSession(@MessageBody() payload: PlayerClosePayload): Promise<PlayerCloseResult> {
    logger.info(`close-player-session session=${payload?.sessionId ?? 'unknown'}`);
    if (!payload?.sessionId || typeof payload.sessionId !== 'string') {
      return { sessionId: '', success: false, error: 'Missing sessionId' };
    }

    try {
      const closed = await this.playerService.closeSession(payload.sessionId);
      return { sessionId: payload.sessionId, success: closed };
    } catch (err) {
      const message = extractErrorMessage(err, 'Unknown error');
      logger.error(`close-player-session error: ${message}`);
      return { sessionId: payload.sessionId, success: false, error: message };
    }
  }

  @SubscribeMessage(LocalLibraryEvents.SEEK_PLAYER_SESSION)
  handleSeek(@MessageBody() payload: PlayerSeekPayload): PlayerSeekResult {
    logger.info(
      `seek-player-session session=${payload?.sessionId ?? 'unknown'} ` +
        `pos=${payload?.positionSeconds ?? 'unknown'}`
    );
    if (
      !payload?.sessionId ||
      typeof payload.sessionId !== 'string' ||
      typeof payload.positionSeconds !== 'number' ||
      !Number.isFinite(payload.positionSeconds)
    ) {
      const result: PlayerSeekResult = {
        sessionId: payload?.sessionId ?? '',
        streamUrl: '',
        positionSeconds: 0,
        error: 'Missing sessionId or positionSeconds',
        code: 'INVALID_PAYLOAD',
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    }

    try {
      const { streamUrl, positionSeconds } = this.playerService.seek(
        payload.sessionId,
        payload.positionSeconds
      );
      const result: PlayerSeekResult = {
        sessionId: payload.sessionId,
        streamUrl,
        positionSeconds,
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    } catch (err) {
      const message = extractErrorMessage(err, 'Unknown error');
      logger.error(`seek-player-session error: ${message}`);
      const result: PlayerSeekResult = {
        sessionId: payload.sessionId,
        streamUrl: '',
        positionSeconds: 0,
        error: message,
        code: 'INTERNAL_ERROR',
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    }
  }

  @SubscribeMessage(LocalLibraryEvents.SWITCH_AUDIO_TRACK)
  handleSwitchAudio(@MessageBody() payload: PlayerSwitchAudioPayload): PlayerSeekResult {
    logger.info(
      `switch-audio session=${payload?.sessionId ?? 'unknown'} ` +
        `track=${payload?.trackIndex ?? 'unknown'} pos=${payload?.atPositionSeconds ?? 'unknown'}`
    );
    if (
      !payload?.sessionId ||
      typeof payload.sessionId !== 'string' ||
      typeof payload.trackIndex !== 'number' ||
      typeof payload.atPositionSeconds !== 'number' ||
      !Number.isFinite(payload.atPositionSeconds)
    ) {
      const result: PlayerSeekResult = {
        sessionId: payload?.sessionId ?? '',
        streamUrl: '',
        positionSeconds: 0,
        error: 'Missing sessionId, trackIndex or atPositionSeconds',
        code: 'INVALID_PAYLOAD',
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    }

    try {
      const { streamUrl, positionSeconds } = this.playerService.switchAudio(
        payload.sessionId,
        payload.trackIndex,
        payload.atPositionSeconds
      );
      const result: PlayerSeekResult = {
        sessionId: payload.sessionId,
        streamUrl,
        positionSeconds,
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    } catch (err) {
      const message = extractErrorMessage(err, 'Unknown error');
      logger.error(`switch-audio error: ${message}`);
      const result: PlayerSeekResult = {
        sessionId: payload.sessionId,
        streamUrl: '',
        positionSeconds: 0,
        error: message,
        code: 'INTERNAL_ERROR',
      };
      this.server.emit(LocalLibraryEvents.SEEK_RESULT, result);
      return result;
    }
  }

  private classifyOpenError(err: unknown): { code: PlayerOpenErrorCode; message: string } {
    if (err instanceof FfmpegNotInstalledError) {
      return { code: 'FFMPEG_NOT_INSTALLED', message: err.message };
    }
    if (err instanceof PlayerFileNotFoundError) {
      return { code: 'FILE_NOT_FOUND', message: err.message };
    }
    if (err instanceof PlayerProbeFailedError) {
      return { code: 'PROBE_FAILED', message: err.message };
    }
    return {
      code: 'INTERNAL_ERROR',
      message: extractErrorMessage(err, 'Unknown error opening player session'),
    };
  }
}
