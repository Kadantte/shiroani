import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { useState } from 'react';

const links = [
  { label: 'Funkcje', href: '#funkcje' },
  { label: 'Podgląd', href: '#podglad' },
  { label: 'Społeczność', href: '#spolecznosc' },
  { label: 'Changelog', href: '/changelog' },
  { label: 'Pobierz', href: '#pobierz' },
];

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, 'change', v => setScrolled(v > 60));

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'oklch(0.08 0.005 0 / 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(1.3)' : 'none',
        borderBottom: scrolled ? '1px solid oklch(0.22 0.01 350 / 0.5)' : '1px solid transparent',
      }}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2.5">
          <img src="/favicon.png" alt="" className="h-7 w-7" />
          <span className="font-display text-base font-bold tracking-tight">
            Shiro<span className="text-primary">Ani</span>
          </span>
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </div>

        <span
          className="cursor-not-allowed rounded-lg bg-primary/40 px-4 py-2 text-sm font-semibold text-primary-foreground/60"
          title="Wkrótce dostępne"
        >
          W krótce
        </span>
      </nav>
    </motion.header>
  );
}
