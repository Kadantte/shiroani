import { describe, expect, it } from 'vitest';

import {
  clampPlaybackPosition,
  getAbsolutePlaybackPosition,
  getStreamPlaybackTime,
} from '../timeline';

describe('player timeline helpers', () => {
  it('converts stream-relative time to episode-relative time', () => {
    expect(getAbsolutePlaybackPosition(250, 1.389, 1310.5)).toBeCloseTo(251.389);
  });

  it('converts episode-relative time back to stream-relative time', () => {
    expect(getStreamPlaybackTime(250, 251.389)).toBeCloseTo(1.389);
  });

  it('clamps positions to the episode bounds', () => {
    expect(clampPlaybackPosition(-5, 1310.5)).toBe(0);
    expect(clampPlaybackPosition(2000, 1310.5)).toBe(1310.5);
  });
});
