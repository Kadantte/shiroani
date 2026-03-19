import { useState, useEffect, useCallback } from 'react';
import { Plus, LogIn, Users, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWatchPartyStore } from '@/stores/useWatchPartyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { CreateRoomDialog } from './CreateRoomDialog';
import type { WatchPartyRoom } from '@shiroani/shared';

const DISCORD_CDN = 'https://cdn.discordapp.com';

function getAvatarUrl(userId: string, avatarHash: string | null, size = 32): string {
  if (avatarHash) {
    return `${DISCORD_CDN}/avatars/${userId}/${avatarHash}.png?size=${size}`;
  }
  const index = Number(BigInt(userId) >> 22n) % 6;
  return `${DISCORD_CDN}/embed/avatars/${index}.png?size=${size}`;
}

function PublicRoomCard({ room }: { room: WatchPartyRoom }) {
  const joinRoom = useWatchPartyStore(s => s.joinRoom);
  const [joining, setJoining] = useState(false);

  const handleJoin = useCallback(async () => {
    setJoining(true);
    try {
      await joinRoom(room.roomCode);
    } finally {
      setJoining(false);
    }
  }, [joinRoom, room.roomCode]);

  const isFull = room.memberCount >= room.maxMembers;

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background/40 border border-border/30 hover:border-border/60 transition-colors">
      <img
        src={getAvatarUrl(room.hostId, room.hostAvatar)}
        alt={room.hostName}
        className="w-7 h-7 rounded-full shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{room.name}</p>
        <div className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <Crown className="w-3 h-3 text-yellow-500" />
          <span className="truncate">{room.hostName}</span>
          <span className="mx-0.5">·</span>
          <Users className="w-3 h-3" />
          <span>
            {room.memberCount}/{room.maxMembers}
          </span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 text-xs shrink-0"
        onClick={handleJoin}
        disabled={isFull || joining}
      >
        {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : isFull ? 'Pełny' : 'Dołącz'}
      </Button>
    </div>
  );
}

export function WatchPartyLobby() {
  const { isAuthenticated } = useAuthStore();
  const publicRooms = useWatchPartyStore(s => s.publicRooms);
  const error = useWatchPartyStore(s => s.error);
  const fetchPublicRooms = useWatchPartyStore(s => s.fetchPublicRooms);
  const joinRoom = useWatchPartyStore(s => s.joinRoom);

  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch public rooms on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchPublicRooms();
    }
  }, [isAuthenticated, fetchPublicRooms]);

  const handleJoinByCode = useCallback(async () => {
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      await joinRoom(joinCode.trim());
    } finally {
      setIsJoining(false);
    }
  }, [joinCode, joinRoom]);

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <LogIn className="w-5 h-5 text-primary" />
        </div>
        <p className="text-sm text-foreground font-medium">Wymagane logowanie</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Zaloguj się, aby korzystać z Watch Party
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions */}
      <div className="p-3 space-y-2.5 border-b border-border/40 shrink-0">
        {/* Create room */}
        <Button className="w-full" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Utwórz pokój
        </Button>

        {/* Join by code */}
        <div className="flex gap-2">
          <Input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => {
              if (e.key === 'Enter') handleJoinByCode();
            }}
            placeholder="Kod pokoju"
            className="h-8 text-xs bg-background/50 border-border/50 uppercase"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0"
            onClick={handleJoinByCode}
            disabled={!joinCode.trim() || isJoining}
          >
            {isJoining ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Dołącz'}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-3 pt-2">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Public rooms */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Publiczne pokoje
        </h3>

        {publicRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Users className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Brak publicznych pokoi</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {publicRooms.map(room => (
              <PublicRoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>

      {/* Create room dialog */}
      <CreateRoomDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
