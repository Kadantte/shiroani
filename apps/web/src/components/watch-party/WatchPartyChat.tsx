import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWatchPartyStore } from '@/stores/useWatchPartyStore';
import type { WatchPartyMessage } from '@shiroani/shared';

const DISCORD_CDN = 'https://cdn.discordapp.com';

function getAvatarUrl(userId: string, avatarHash: string | null, size = 32): string {
  if (avatarHash) {
    return `${DISCORD_CDN}/avatars/${userId}/${avatarHash}.png?size=${size}`;
  }
  try {
    const index = Number(BigInt(userId) >> 22n) % 6;
    return `${DISCORD_CDN}/embed/avatars/${index}.png?size=${size}`;
  } catch {
    return `${DISCORD_CDN}/embed/avatars/0.png?size=${size}`;
  }
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

function ChatMessage({ message }: { message: WatchPartyMessage }) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center py-1">
        <span className="text-2xs text-muted-foreground/70 italic">{message.content}</span>
      </div>
    );
  }

  if (message.type === 'reaction') {
    return (
      <div className="flex justify-center py-0.5">
        <span className="text-lg">{message.content}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 py-0.5 group">
      <img
        src={getAvatarUrl(message.userId, message.avatar)}
        alt={message.username}
        className="w-5 h-5 rounded-full shrink-0 mt-0.5"
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs font-medium text-foreground truncate">{message.username}</span>
          <span className="text-2xs text-muted-foreground/50 shrink-0">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p className="text-xs text-foreground/80 break-words">{message.content}</p>
      </div>
    </div>
  );
}

export function WatchPartyChat() {
  const messages = useWatchPartyStore(s => s.messages);
  const sendMessage = useWatchPartyStore(s => s.sendMessage);

  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput('');
  }, [input, sendMessage]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-2xs text-muted-foreground/50">Brak wiadomości</p>
          </div>
        ) : (
          messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1.5 px-3 py-2 border-t border-border/40 shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Napisz wiadomość..."
          className="h-7 text-xs bg-background/50 border-border/50"
        />
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 shrink-0"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
