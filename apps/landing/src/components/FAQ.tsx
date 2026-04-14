import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { ease } from '@/lib/animations';
import { MotionProvider } from './MotionProvider';

const questions: { q: string; a: string }[] = [
  {
    q: 'Czy ShiroAni jest darmowe?',
    a: 'Tak. Bez reklam, subskrypcji i płatnych funkcji. Cały kod jest publiczny na GitHubie, więc możesz sam sprawdzić, jak to działa.',
  },
  {
    q: 'Czy muszę mieć konto?',
    a: 'Nie. Aplikacja działa od razu po uruchomieniu. Na razie możesz tylko podejrzeć profil AniList po nazwie użytkownika. Pełna integracja z AniList pojawi się w kolejnych wydaniach.',
  },
  {
    q: 'Skąd pochodzą odcinki?',
    a: 'ShiroAni nie hostuje anime. Daje Ci wbudowaną przeglądarkę z adblockiem, dzięki której wygodniej ogląda się na popularnych stronach, takich jak ogladajanime.pl, shinden.pl czy YouTube. Do tego dochodzi śledzenie postępów, Discord RPC i porządny interfejs.',
  },
  {
    q: 'Co z moimi danymi?',
    a: 'Wszystko trzymane jest lokalnie, na Twoim komputerze. Nie mamy serwera, który zbiera historię oglądania ani innych danych. Z siecią łączy się tylko to, czego sam używasz w przeglądarce, plus opcjonalna synchronizacja z AniList.',
  },
];

export function FAQ() {
  return (
    <MotionProvider>
      <section id="faq" className="relative px-6 py-24 lg:py-28">
        <motion.div
          className="mx-auto max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease }}
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">FAQ</p>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Krótkie odpowiedzi
          </h2>
          <p className="mt-3 text-muted-foreground">
            Zanim pobierzesz, oto odpowiedzi na najczęstsze pytania.
          </p>

          <ul className="mt-10 divide-y divide-border/60 border-y border-border/60">
            {questions.map(({ q, a }) => (
              <li key={q}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-foreground/90 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:rounded-md focus-visible:outline-none">
                    <span>{q}</span>
                    <Plus
                      className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{a}</p>
                </details>
              </li>
            ))}
          </ul>
        </motion.div>
      </section>
    </MotionProvider>
  );
}
