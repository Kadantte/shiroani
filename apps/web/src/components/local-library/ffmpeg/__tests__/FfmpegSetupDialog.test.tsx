import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { FfmpegSetupDialog } from '../FfmpegSetupDialog';
import type { FfmpegInstallPhase, FfmpegStatus, FfmpegInstallProgress } from '@shiroani/shared';

/**
 * The dialog reads everything from the Zustand store, so we stub the hook
 * with a tiny selector-aware implementation. Mutating `state` between tests
 * lets us drive each visual variant (idle / installing / installed) without
 * touching sockets.
 */
type StoreState = {
  status: FfmpegStatus;
  progress: FfmpegInstallProgress;
  lastError: string | null;
  install: () => Promise<{ started: boolean }>;
  cancel: () => Promise<void>;
  uninstall: () => Promise<void>;
  clearSystemPaths: () => Promise<void>;
  setSystemPaths: () => Promise<null>;
};

const state: StoreState = {
  status: {
    mode: 'none',
    installed: false,
    ffmpegPath: null,
    ffprobePath: null,
    version: null,
    platform: 'win32',
    bundledSupported: true,
  },
  progress: { phase: 'idle', bytes: 0, total: 0, speed: 0 },
  lastError: null,
  install: vi.fn().mockResolvedValue({ started: true }),
  cancel: vi.fn().mockResolvedValue(undefined),
  uninstall: vi.fn().mockResolvedValue(undefined),
  clearSystemPaths: vi.fn().mockResolvedValue(undefined),
  setSystemPaths: vi.fn().mockResolvedValue(null),
};

vi.mock('@/stores/useFfmpegStore', () => ({
  useFfmpegStore: <T,>(selector: (s: StoreState) => T) => selector(state),
}));

function setPhase(phase: FfmpegInstallPhase, overrides: Partial<FfmpegInstallProgress> = {}): void {
  state.progress = { phase, bytes: 0, total: 0, speed: 0, ...overrides };
}

function setStatus(overrides: Partial<FfmpegStatus>): void {
  state.status = { ...state.status, ...overrides };
}

describe('FfmpegSetupDialog', () => {
  beforeEach(() => {
    setStatus({
      mode: 'none',
      installed: false,
      ffmpegPath: null,
      ffprobePath: null,
      version: null,
      bundledSupported: true,
    });
    setPhase('idle');
    state.lastError = null;
  });

  it('idle state shows the two primary install options', () => {
    render(<FfmpegSetupDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText(/Zainstaluj FFmpeg/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Użyj systemowego FFmpeg/i })).toBeInTheDocument();
  });

  it('installing state renders a progress bar and cancel button', () => {
    setPhase('download', { bytes: 45_000_000, total: 90_000_000, speed: 5_000_000 });
    render(<FfmpegSetupDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Anuluj/i })).toBeInTheDocument();
    // Shows the human-readable "Pobieranie..." label for the download phase.
    expect(screen.getByText(/Pobieranie/i)).toBeInTheDocument();
  });

  it('installed state shows the green check and bundled path', () => {
    setStatus({
      mode: 'bundled',
      installed: true,
      ffmpegPath: '/tmp/shiroani-test/bin/ffmpeg.exe',
      ffprobePath: '/tmp/shiroani-test/bin/ffprobe.exe',
      version: 'autobuild-2026-04-16-13-18',
    });
    setPhase('done');

    render(<FfmpegSetupDialog open={true} onOpenChange={() => {}} />);

    expect(screen.getByText(/FFmpeg zainstalowany/i)).toBeInTheDocument();
    expect(screen.getByText(/autobuild-2026-04-16-13-18/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Odinstaluj/i })).toBeInTheDocument();
  });
});
