import { motion } from 'framer-motion';
import { DISCORD_INVITE_URL } from '@shiroani/shared';
import { MotionProvider } from './MotionProvider';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 .5a12 12 0 0 0-3.794 23.385c.6.111.82-.261.82-.577v-2.234c-3.338.726-4.042-1.61-4.042-1.61a3.18 3.18 0 0 0-1.334-1.755c-1.09-.745.083-.73.083-.73a2.52 2.52 0 0 1 1.84 1.239 2.554 2.554 0 0 0 3.49.997 2.556 2.556 0 0 1 .762-1.603c-2.665-.303-5.466-1.333-5.466-5.931a4.64 4.64 0 0 1 1.236-3.218 4.31 4.31 0 0 1 .117-3.176s1.008-.323 3.301 1.23a11.4 11.4 0 0 1 6.01 0c2.29-1.553 3.296-1.23 3.296-1.23a4.31 4.31 0 0 1 .12 3.176 4.63 4.63 0 0 1 1.234 3.218c0 4.61-2.805 5.625-5.478 5.921a2.86 2.86 0 0 1 .814 2.219v3.286c0 .319.216.694.825.576A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.699.7719 1.3638 1.225 1.9942a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  );
}

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <MotionProvider>
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/mascot-sleep.png"
              alt="Shiro-chan śpi"
              className="h-10 w-10 opacity-70 select-none"
              draggable={false}
            />
            <div>
              <span className="text-sm font-bold">
                Shiro<span className="text-primary">Ani</span>
              </span>
              <p className="text-xs text-muted-foreground">
                Stworzone z{' '}
                <motion.span
                  className="inline-block text-primary"
                  whileHover={{ scale: 1.3 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 10 }}
                >
                  ♥
                </motion.span>{' '}
                przez Shiro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <motion.a
              href="https://github.com/Shironex/shiroani"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <GitHubIcon className="h-4.5 w-4.5" />
            </motion.a>
            <motion.a
              href={DISCORD_INVITE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-md"
              aria-label="Discord"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <DiscordIcon className="h-4.5 w-4.5" />
            </motion.a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-widest text-gold-dim">Shiro Suite</span>
          <span aria-hidden="true"> · </span>
          <a
            href="#suite"
            className="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-sm"
          >
            ShiroAni
          </a>
          <span aria-hidden="true"> · </span>
          <a
            href="https://shiranami.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-sm"
          >
            Shiranami
          </a>
          <span aria-hidden="true"> · </span>
          <a
            href="https://kireimanga.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none rounded-sm"
          >
            KireiManga
          </a>
        </p>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          © {YEAR} ShiroAni · Kod źródłowy dostępny publicznie
        </p>
      </footer>
    </MotionProvider>
  );
}
