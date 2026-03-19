import { useState, useCallback } from 'react';
import { LogOut, Copy, Check, Crown, Users, CheckCircle2, Circle, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWatchPartyStore } from '@/stores/useWatchPartyStore';
import { useAuthStore } from '@/stores/useAuthStore';
import { WatchPartyChat } from './WatchPartyChat';
import { cn } from '@/lib/utils';
import type { WatchPartyMember } from '@shiroani/shared';

const DISCORD_CDN = 'https://cdn.discordapp.com';

const REACTIONS = [
  { emoji: '\u{1F525}', label: 'fire' },
  { emoji: '\u{1F602}', label: 'laugh' },
  { emoji: '\u2764\uFE0F', label: 'heart' },
  { emoji: '\u{1F440}', label: 'eyes' },
  { emoji: '\u{1F389}', label: 'party' },
] as const;

function getAvatarUrl(userId: string, avatarHash: string | null, size = 32): string {
  if (avatarHash) {
    return `${DISCORD_CDN}/avatars/${userId}/${avatarHash}.png?size=${size}`;
  }
  const index = Number(BigInt(userId) >> 22n) % 6;
  return `${DISCORD_CDN}/embed/avatars/${index}.png?size=${size}`;
}

function MemberAvatar({ member }: { member: WatchPartyMember }) {
  return (
    <div className="relative shrink-0" title={member.globalName ?? member.username}>
      <img
        src={getAvatarUrl(member.userId, member.avatar)}
        alt={member.globalName ?? member.username}
        className="w-7 h-7 rounded-full"
      />
      {/* Host crown */}
      {member.isHost && (
        <Crown className="absolute -top-1.5 -right-1 w-3 h-3 text-yellow-500 drop-shadow" />
      )}
      {/* Ready indicator */}
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
          member.isReady ? 'bg-status-success' : 'bg-muted-foreground/40'
        )}
      />
    </div>
  );
}

export function WatchPartyRoomView() {
  const currentRoom = useWatchPartyStore(s => s.currentRoom);
  const members = useWatchPartyStore(s => s.members);
  const leaveRoom = useWatchPartyStore(s => s.leaveRoom);
  const toggleReady = useWatchPartyStore(s => s.toggleReady);
  const startCountdown = useWatchPartyStore(s => s.startCountdown);
  const sendReaction = useWatchPartyStore(s => s.sendReaction);

  const user = useAuthStore(s => s.user);

  const [copied, setCopied] = useState(false);

  const isHost = currentRoom?.hostId === user?.id;
  const currentMember = members.find(m => m.userId === user?.id);
  const isReady = currentMember?.isReady ?? false;

  const handleCopyCode = useCallback(async () => {
    if (!currentRoom) return;
    try {
      await navigator.clipboard.writeText(currentRoom.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may fail in some contexts; silently ignore
    }
  }, [currentRoom]);

  const handleLeave = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  const handleStartCountdown = useCallback(() => {
    startCountdown(3);
  }, [startCountdown]);

  if (!currentRoom) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <div className="px-3 py-2.5 border-b border-border/40 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-semibold text-foreground truncate">{currentRoom.name}</h3>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-2xs text-muted-foreground hover:text-foreground transition-colors mt-0.5"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-status-success" />
                  <span className="text-status-success">Skopiowano!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="font-mono">{currentRoom.roomCode}</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-2xs h-5">
              <Users className="w-3 h-3 mr-1" />
              {members.length}/{currentRoom.maxMembers}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleLeave}>
              <LogOut className="w-3 h-3" />
              Opuść
            </Button>
          </div>
        </div>

        {/* Members bar */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          {members.map(member => (
            <MemberAvatar key={member.userId} member={member} />
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <WatchPartyChat />
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border/40 shrink-0">
        {/* Ready toggle */}
        <Button
          variant={isReady ? 'default' : 'outline'}
          size="sm"
          className={cn('h-7 text-xs', isReady && 'bg-status-success hover:bg-status-success/90')}
          onClick={() => toggleReady()}
        >
          {isReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
          {isReady ? 'Gotowy' : 'Gotów?'}
        </Button>

        {/* Countdown button (host only) */}
        {isHost && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleStartCountdown}
          >
            <Timer className="w-3.5 h-3.5" />
            3...2...1
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Reaction buttons */}
        <div className="flex gap-0.5">
          {REACTIONS.map(({ emoji, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => sendReaction(emoji)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-sm hover:bg-accent transition-colors"
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
