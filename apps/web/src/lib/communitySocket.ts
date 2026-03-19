import { io, Socket } from 'socket.io-client';
import { createLogger } from '@shiroani/shared';

const logger = createLogger('CommunitySocket');

let _socket: Socket | null = null;

const COMMUNITY_URL = import.meta.env.DEV ? 'ws://localhost:3000' : 'wss://api.shiroani.app';

/**
 * Initialize the community socket singleton.
 * Must be called exactly once before any other community socket operation.
 */
export function initializeCommunitySocket(): Socket {
  if (_socket) {
    if (import.meta.env.DEV) {
      logger.warn('Community socket already initialized, returning existing instance');
      return _socket;
    }
    throw new Error('Community socket already initialized');
  }

  logger.info('Initializing community socket connection to', COMMUNITY_URL);

  _socket = io(COMMUNITY_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // Connection event handlers
  _socket.on('connect', () => {
    logger.info('Connected to community server');
  });

  _socket.on('disconnect', reason => {
    logger.warn('Disconnected from community:', reason);
  });

  // Reconnect events are emitted on the Manager (socket.io), not the Socket instance
  _socket.io.on('reconnect', attemptNumber => {
    logger.info('Reconnected after', attemptNumber, 'attempts');
  });

  _socket.io.on('reconnect_attempt', attemptNumber => {
    logger.debug('Reconnection attempt', attemptNumber);
  });

  _socket.io.on('reconnect_error', error => {
    logger.error('Reconnection error:', error);
  });

  _socket.io.on('reconnect_failed', () => {
    logger.error('Reconnection failed after all attempts');
  });

  return _socket;
}

/**
 * Get the community socket singleton. Throws if not yet initialized.
 */
export function getCommunitySocket(): Socket {
  if (!_socket) {
    throw new Error('Community socket not initialized — call initializeCommunitySocket() first');
  }
  return _socket;
}

let isConnecting = false;

interface PendingCaller {
  resolve: () => void;
  reject: (error: Error) => void;
}

let pendingCallers: PendingCaller[] = [];

function resolvePendingCallers(): void {
  const callers = pendingCallers;
  pendingCallers = [];
  for (const caller of callers) {
    caller.resolve();
  }
}

function rejectPendingCallers(error: Error): void {
  const callers = pendingCallers;
  pendingCallers = [];
  for (const caller of callers) {
    caller.reject(error);
  }
}

export function connectCommunitySocket(): Promise<void> {
  const socket = getCommunitySocket();
  return new Promise((resolve, reject) => {
    if (socket.connected) {
      resolve();
      return;
    }

    if (isConnecting) {
      pendingCallers.push({ resolve, reject });
      return;
    }

    isConnecting = true;

    const onConnect = () => {
      isConnecting = false;
      cleanup();
      resolve();
      resolvePendingCallers();
    };

    const onConnectError = (error: Error) => {
      isConnecting = false;
      cleanup();
      reject(error);
      rejectPendingCallers(error);
    };

    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    socket.connect();
  });
}

/**
 * Disconnect and clean up the community socket.
 */
export function disconnectCommunitySocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket.removeAllListeners();
    _socket = null;
    logger.info('Community socket disconnected and cleaned up');
  }
}

/**
 * Check if the community socket is currently connected.
 */
export function isCommunitySocketConnected(): boolean {
  return _socket?.connected ?? false;
}
