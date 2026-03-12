import type { SyntheticEvent } from 'react';

export function handleImageError(e: SyntheticEvent<HTMLImageElement>) {
  (e.target as HTMLImageElement).style.display = 'none';
}
