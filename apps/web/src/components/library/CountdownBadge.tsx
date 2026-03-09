import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface CountdownBadgeProps {
  airingAt: number;
  episode: number;
}

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft < 15 * 60) return 'Wkrotce!';

  const minutes = Math.floor(secondsLeft / 60) % 60;
  const hours = Math.floor(secondsLeft / 3600) % 24;
  const days = Math.floor(secondsLeft / 86400);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function CountdownBadge({ airingAt, episode }: CountdownBadgeProps) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const secondsLeft = airingAt - now;
  if (secondsLeft <= 0) return null;

  return (
    <Badge className="text-2xs bg-primary/80 text-primary-foreground border-0">
      Odc. {episode} za {formatCountdown(secondsLeft)}
    </Badge>
  );
}
