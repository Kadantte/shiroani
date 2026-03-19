export interface WatchPartyRoom {
  id: string;
  name: string;
  roomCode: string;
  hostId: string;
  hostName: string;
  hostAvatar: string | null;
  type: 'public' | 'private';
  maxMembers: number;
  memberCount: number;
  status: 'waiting' | 'watching' | 'paused' | 'ended';
  videoUrl?: string;
  createdAt: number; // Unix timestamp ms
}

export interface WatchPartyMember {
  userId: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export interface WatchPartyMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string | null;
  content: string;
  type: 'text' | 'system' | 'reaction';
  timestamp: number;
}

export interface CountdownState {
  active: boolean;
  seconds: number;
  startedAt: number;
  startedBy: string;
}

// Payloads
export interface CreateRoomPayload {
  name: string;
  type: 'public' | 'private';
  maxMembers: number;
  user: { id: string; username: string; globalName: string | null; avatar: string | null };
}

export interface JoinRoomPayload {
  roomCode: string;
  user: { id: string; username: string; globalName: string | null; avatar: string | null };
}

export interface SendMessagePayload {
  roomCode: string;
  content: string;
}

export interface StartCountdownPayload {
  roomCode: string;
  seconds: number; // typically 3 or 5
}

export interface SignalPayload {
  roomCode: string;
  signal: 'pause-request' | 'resume-request' | 'timestamp-share';
  data?: string; // e.g. "14:32" for timestamp-share
}
