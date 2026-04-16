import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Validate that `binaryPath` points at a real ffmpeg / ffprobe binary.
 *
 * Spawns `<binaryPath> -version` with a tight timeout and inspects the first
 * line of stdout — both tools start with `ffmpeg version …` / `ffprobe
 * version …`. Any other behaviour (missing file, non-zero exit, wrong banner,
 * hang) counts as invalid.
 */
export interface ValidateOptions {
  /** 'ffmpeg' | 'ffprobe' — determines which banner prefix we expect. */
  kind: 'ffmpeg' | 'ffprobe';
  /** Max wall time before we give up and kill the process (default 3000ms). */
  timeoutMs?: number;
}

export interface ValidateResult {
  ok: boolean;
  /** Detected version string (first line) when ok === true. */
  version?: string;
  /** Human-readable reason when ok === false. */
  error?: string;
}

export async function validateSystemBinary(
  binaryPath: string,
  options: ValidateOptions
): Promise<ValidateResult> {
  const { kind, timeoutMs = 3000 } = options;

  if (typeof binaryPath !== 'string' || binaryPath.trim().length === 0) {
    return { ok: false, error: 'Path is empty' };
  }
  if (!existsSync(binaryPath)) {
    return { ok: false, error: `File does not exist: ${binaryPath}` };
  }

  return new Promise<ValidateResult>(resolve => {
    let settled = false;
    const finish = (result: ValidateResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(binaryPath, ['-version'], {
        // Don't let the child inherit stdio — we want to capture stdout and
        // prevent it from stealing focus.
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      });
    } catch (error) {
      finish({
        ok: false,
        error: `Failed to spawn binary: ${error instanceof Error ? error.message : String(error)}`,
      });
      return;
    }

    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });

    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        // noop
      }
      finish({ ok: false, error: `Timed out after ${timeoutMs}ms — is this really ${kind}?` });
    }, timeoutMs);

    child.on('error', (err: Error) => {
      finish({ ok: false, error: `Spawn error: ${err.message}` });
    });

    child.on('close', (code: number | null) => {
      if (code !== 0) {
        finish({
          ok: false,
          error: `Exited with code ${code ?? '?'}: ${stderr.trim().slice(0, 200) || 'no output'}`,
        });
        return;
      }

      const firstLine = stdout.split(/\r?\n/, 1)[0]?.trim() ?? '';
      const expectedPrefix = kind === 'ffmpeg' ? 'ffmpeg version' : 'ffprobe version';
      if (!firstLine.startsWith(expectedPrefix)) {
        finish({
          ok: false,
          error: `Unexpected banner "${firstLine.slice(0, 80)}" — expected "${expectedPrefix} …"`,
        });
        return;
      }

      finish({ ok: true, version: firstLine });
    });
  });
}
