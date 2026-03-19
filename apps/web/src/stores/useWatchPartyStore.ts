import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createLogger, WatchPartyEvents } from '@shiroani/shared';
import type {
  WatchPartyRoom,
  WatchPartyMember,
  WatchPartyMessage,
  CountdownState,
  CreateRoomPayload,
  JoinRoomPayload,
  SendMessagePayload,
  StartCountdownPayload,
  SignalPayload,
} from '@shiroani/shared';
import { getCommunitySocket } from '@/lib/communitySocket';
import { useAuthStore } from '@/stores/useAuthStore';

const logger = createLogger('WatchPartyStore');

/** Maximum number of messages to keep in memory */
const MAX_MESSAGES = 100;

// ─── Types ────────────────────────────────────────────────────────────

type CommunityConnectionStatus = 'disconnected' | 'connected' | 'reconnecting';

interface WatchPartyState {
  /** Whether the watch party side panel is open */
  isOpen: boolean;
  /** Connection status to the community server */
  connectionStatus: CommunityConnectionStatus;
  /** Current room the user has joined */
  currentRoom: WatchPartyRoom | null;
  /** Members in the current room */
  members: WatchPartyMember[];
  /** Chat messages in the current room */
  messages: WatchPartyMessage[];
  /** Active countdown state */
  countdown: CountdownState | null;
  /** Public rooms available to join */
  publicRooms: WatchPartyRoom[];
  /** Last error message */
  error: string | null;
}

interface WatchPartyActions {
  /** Open the watch party panel */
  openPanel: () => void;
  /** Close the watch party panel */
  closePanel: () => void;
  /** Toggle the watch party panel */
  togglePanel: () => void;

  /** Create a new watch party room */
  createRoom: (name: string, type: 'public' | 'private', maxMembers?: number) => void;
  /** Join an existing room by code */
  joinRoom: (roomCode: string) => void;
  /** Leave the current room */
  leaveRoom: () => void;

  /** Send a chat message */
  sendMessage: (content: string) => void;
  /** Start a countdown (host only) */
  startCountdown: (seconds?: number) => void;
  /** Toggle ready status */
  toggleReady: () => void;
  /** Send a reaction emoji */
  sendReaction: (emoji: string) => void;
  /** Send a playback signal */
  sendSignal: (signal: SignalPayload['signal'], data?: string) => void;

  /** Fetch public rooms */
  fetchPublicRooms: () => void;

  /** Register socket event listeners */
  initListeners: () => void;
  /** Remove socket event listeners */
  cleanupListeners: () => void;
}

type WatchPartyStore = WatchPartyState & WatchPartyActions;

// Module-level listener tracking
let listenersInitialized = false;

/** Helper to create a system message for local display */
function createSystemMessage(content: string): WatchPartyMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: 'system',
    username: 'System',
    avatar: null,
    content,
    type: 'system',
    timestamp: Date.now(),
  };
}

export const useWatchPartyStore = create<WatchPartyStore>()(
  devtools(
    (set, get) => ({
      // ─── Initial State ────────────────────────────────────────────

      isOpen: false,
      connectionStatus: 'disconnected',
      currentRoom: null,
      members: [],
      messages: [],
      countdown: null,
      publicRooms: [],
      error: null,

      // ─── Panel Actions ────────────────────────────────────────────

      openPanel: () => {
        set({ isOpen: true }, undefined, 'watchParty/openPanel');
      },

      closePanel: () => {
        set({ isOpen: false }, undefined, 'watchParty/closePanel');
      },

      togglePanel: () => {
        set({ isOpen: !get().isOpen }, undefined, 'watchParty/togglePanel');
      },

      // ─── Room Actions ─────────────────────────────────────────────

      createRoom: (name, type, maxMembers) => {
        const user = useAuthStore.getState().user;
        if (!user) {
          set(
            { error: 'You must be logged in to create a room' },
            undefined,
            'watchParty/createRoom/error'
          );
          return;
        }

        try {
          const socket = getCommunitySocket();
          const payload: CreateRoomPayload = {
            name,
            type,
            maxMembers: maxMembers ?? 10,
            user: {
              id: user.id,
              username: user.username,
              globalName: user.globalName,
              avatar: user.avatar,
            },
          };
          socket.emit(
            WatchPartyEvents.CREATE,
            payload,
            (response: { error?: string; room?: WatchPartyRoom; members?: WatchPartyMember[] }) => {
              if (response.error) {
                logger.warn('Failed to create room:', response.error);
                set({ error: response.error }, undefined, 'watchParty/createRoom/error');
                return;
              }
              logger.info('Room created:', response.room?.roomCode);
              set(
                {
                  currentRoom: response.room ?? null,
                  members: response.members ?? [],
                  messages: [],
                  error: null,
                },
                undefined,
                'watchParty/createRoom/success'
              );
            }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to create room';
          logger.error('Create room error:', message);
          set({ error: message }, undefined, 'watchParty/createRoom/error');
        }
      },

      joinRoom: roomCode => {
        const user = useAuthStore.getState().user;
        if (!user) {
          set(
            { error: 'You must be logged in to join a room' },
            undefined,
            'watchParty/joinRoom/error'
          );
          return;
        }

        try {
          const socket = getCommunitySocket();
          const payload: JoinRoomPayload = {
            roomCode,
            user: {
              id: user.id,
              username: user.username,
              globalName: user.globalName,
              avatar: user.avatar,
            },
          };
          socket.emit(
            WatchPartyEvents.JOIN,
            payload,
            (response: {
              error?: string;
              room?: WatchPartyRoom;
              members?: WatchPartyMember[];
              messages?: WatchPartyMessage[];
            }) => {
              if (response.error) {
                logger.warn('Failed to join room:', response.error);
                set({ error: response.error }, undefined, 'watchParty/joinRoom/error');
                return;
              }
              logger.info('Joined room:', roomCode);
              set(
                {
                  currentRoom: response.room ?? null,
                  members: response.members ?? [],
                  messages: response.messages ?? [],
                  error: null,
                },
                undefined,
                'watchParty/joinRoom/success'
              );
            }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to join room';
          logger.error('Join room error:', message);
          set({ error: message }, undefined, 'watchParty/joinRoom/error');
        }
      },

      leaveRoom: () => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          socket.emit(WatchPartyEvents.LEAVE, { roomCode: currentRoom.roomCode });
          logger.info('Left room:', currentRoom.roomCode);
          set(
            {
              currentRoom: null,
              members: [],
              messages: [],
              countdown: null,
              error: null,
            },
            undefined,
            'watchParty/leaveRoom'
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to leave room';
          logger.error('Leave room error:', message);
          set({ error: message }, undefined, 'watchParty/leaveRoom/error');
        }
      },

      // ─── Chat & Interaction ───────────────────────────────────────

      sendMessage: content => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          const payload: SendMessagePayload = {
            roomCode: currentRoom.roomCode,
            content,
          };
          socket.emit(WatchPartyEvents.SEND_MESSAGE, payload);
        } catch (err) {
          logger.error('Send message error:', err);
        }
      },

      startCountdown: (seconds = 3) => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          const payload: StartCountdownPayload = {
            roomCode: currentRoom.roomCode,
            seconds,
          };
          socket.emit(WatchPartyEvents.COUNTDOWN_START, payload);
        } catch (err) {
          logger.error('Start countdown error:', err);
        }
      },

      toggleReady: () => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          socket.emit(WatchPartyEvents.READY_TOGGLE, {
            roomCode: currentRoom.roomCode,
          });
        } catch (err) {
          logger.error('Toggle ready error:', err);
        }
      },

      sendReaction: emoji => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          socket.emit(WatchPartyEvents.REACTION, {
            roomCode: currentRoom.roomCode,
            emoji,
          });
        } catch (err) {
          logger.error('Send reaction error:', err);
        }
      },

      sendSignal: (signal, data) => {
        const { currentRoom } = get();
        if (!currentRoom) return;

        try {
          const socket = getCommunitySocket();
          const payload: SignalPayload = {
            roomCode: currentRoom.roomCode,
            signal,
            data,
          };
          socket.emit(WatchPartyEvents.SIGNAL, payload);
        } catch (err) {
          logger.error('Send signal error:', err);
        }
      },

      // ─── Public Rooms ─────────────────────────────────────────────

      fetchPublicRooms: () => {
        try {
          const socket = getCommunitySocket();
          socket.emit(
            WatchPartyEvents.LIST_PUBLIC,
            {},
            (response: { error?: string; rooms?: WatchPartyRoom[] }) => {
              if (response.error) {
                logger.warn('Failed to fetch public rooms:', response.error);
                set({ error: response.error }, undefined, 'watchParty/fetchPublicRooms/error');
                return;
              }
              set(
                { publicRooms: response.rooms ?? [], error: null },
                undefined,
                'watchParty/fetchPublicRooms/success'
              );
            }
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to fetch rooms';
          logger.error('Fetch public rooms error:', message);
          set({ error: message }, undefined, 'watchParty/fetchPublicRooms/error');
        }
      },

      // ─── Listeners ────────────────────────────────────────────────

      initListeners: () => {
        if (listenersInitialized) return;

        try {
          const socket = getCommunitySocket();

          // Sync current connection state in case socket connected before listeners
          if (socket.connected) {
            set({ connectionStatus: 'connected' }, undefined, 'watchParty/alreadyConnected');
          }

          socket.on('connect', () => {
            set({ connectionStatus: 'connected' }, undefined, 'watchParty/connected');
          });

          socket.on('disconnect', () => {
            set({ connectionStatus: 'disconnected' }, undefined, 'watchParty/disconnected');
          });

          socket.io.on('reconnect_attempt', () => {
            set({ connectionStatus: 'reconnecting' }, undefined, 'watchParty/reconnecting');
          });

          socket.io.on('reconnect_failed', () => {
            set({ connectionStatus: 'disconnected' }, undefined, 'watchParty/reconnectFailed');
          });

          socket.on(
            WatchPartyEvents.ROOM_STATE,
            (payload: { room: WatchPartyRoom; members: WatchPartyMember[] }) => {
              set(
                { currentRoom: payload.room, members: payload.members },
                undefined,
                'watchParty/roomState'
              );
            }
          );

          socket.on(WatchPartyEvents.MEMBER_JOINED, (payload: { member: WatchPartyMember }) => {
            const { members, messages } = get();
            set(
              {
                members: [...members, payload.member],
                messages: [
                  ...messages,
                  createSystemMessage(`${payload.member.username} joined the room`),
                ].slice(-MAX_MESSAGES),
              },
              undefined,
              'watchParty/memberJoined'
            );
          });

          socket.on(
            WatchPartyEvents.MEMBER_LEFT,
            (payload: { userId: string; username: string }) => {
              const { members, messages } = get();
              set(
                {
                  members: members.filter(m => m.userId !== payload.userId),
                  messages: [
                    ...messages,
                    createSystemMessage(`${payload.username} left the room`),
                  ].slice(-MAX_MESSAGES),
                },
                undefined,
                'watchParty/memberLeft'
              );
            }
          );

          socket.on(WatchPartyEvents.MESSAGE, (message: WatchPartyMessage) => {
            const { messages } = get();
            set(
              { messages: [...messages, message].slice(-MAX_MESSAGES) },
              undefined,
              'watchParty/message'
            );
          });

          socket.on(WatchPartyEvents.COUNTDOWN_START, (payload: CountdownState) => {
            set({ countdown: payload }, undefined, 'watchParty/countdownStart');
          });

          socket.on(WatchPartyEvents.COUNTDOWN_TICK, (payload: { seconds: number }) => {
            const { countdown } = get();
            if (countdown) {
              set(
                { countdown: { ...countdown, seconds: payload.seconds } },
                undefined,
                'watchParty/countdownTick'
              );
            }
          });

          socket.on(WatchPartyEvents.COUNTDOWN_DONE, () => {
            set({ countdown: null }, undefined, 'watchParty/countdownDone');
          });

          socket.on(
            WatchPartyEvents.MEMBER_READY,
            (payload: { userId: string; isReady: boolean }) => {
              const { members } = get();
              set(
                {
                  members: members.map(m =>
                    m.userId === payload.userId ? { ...m, isReady: payload.isReady } : m
                  ),
                },
                undefined,
                'watchParty/memberReady'
              );
            }
          );

          socket.on(
            WatchPartyEvents.REACTION,
            (payload: {
              userId: string;
              username: string;
              avatar: string | null;
              emoji: string;
            }) => {
              const { messages } = get();
              const reactionMessage: WatchPartyMessage = {
                id: `reaction-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                userId: payload.userId,
                username: payload.username,
                avatar: payload.avatar,
                content: payload.emoji,
                type: 'reaction',
                timestamp: Date.now(),
              };
              set(
                { messages: [...messages, reactionMessage].slice(-MAX_MESSAGES) },
                undefined,
                'watchParty/reaction'
              );
            }
          );

          socket.on(WatchPartyEvents.SIGNAL, (payload: { signal: string; data?: string }) => {
            const { messages } = get();
            set(
              {
                messages: [
                  ...messages,
                  createSystemMessage(`Playback signal: ${payload.signal}`),
                ].slice(-MAX_MESSAGES),
              },
              undefined,
              'watchParty/signal'
            );
          });

          socket.on(WatchPartyEvents.ROOM_CLOSED, (payload: { reason?: string }) => {
            const { messages } = get();
            set(
              {
                currentRoom: null,
                members: [],
                countdown: null,
                messages: [
                  ...messages,
                  createSystemMessage(payload.reason ?? 'Room has been closed'),
                ].slice(-MAX_MESSAGES),
              },
              undefined,
              'watchParty/roomClosed'
            );
          });

          socket.on(WatchPartyEvents.ERROR, (payload: { message: string }) => {
            logger.warn('Watch party error:', payload.message);
            set({ error: payload.message }, undefined, 'watchParty/error');
          });

          listenersInitialized = true;
          logger.debug('Watch party listeners registered');
        } catch (err) {
          // Community socket may not be initialized yet — that's OK
          logger.debug('Could not init watch party listeners (socket not ready):', err);
        }
      },

      cleanupListeners: () => {
        try {
          const socket = getCommunitySocket();

          socket.off('connect');
          socket.off('disconnect');

          socket.off(WatchPartyEvents.ROOM_STATE);
          socket.off(WatchPartyEvents.MEMBER_JOINED);
          socket.off(WatchPartyEvents.MEMBER_LEFT);
          socket.off(WatchPartyEvents.MESSAGE);
          socket.off(WatchPartyEvents.COUNTDOWN_START);
          socket.off(WatchPartyEvents.COUNTDOWN_TICK);
          socket.off(WatchPartyEvents.COUNTDOWN_DONE);
          socket.off(WatchPartyEvents.MEMBER_READY);
          socket.off(WatchPartyEvents.REACTION);
          socket.off(WatchPartyEvents.SIGNAL);
          socket.off(WatchPartyEvents.ROOM_CLOSED);
          socket.off(WatchPartyEvents.ERROR);
        } catch {
          // Socket may not be initialized — that's fine during cleanup
        }

        listenersInitialized = false;
        logger.debug('Watch party listeners cleaned up');
      },
    }),
    { name: 'watchParty' }
  )
);
