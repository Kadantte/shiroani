import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
  children?: React.ReactNode;
  className?: string;
  /** Icon for the section header */
  icon?: LucideIcon;
  /** Title shown next to the icon */
  title?: string;
  /** Subtitle shown below the title */
  subtitle?: string;
  /** Optional tint for the icon tile (matches the mock's per-card accent colors). */
  tone?: 'primary' | 'green' | 'gold' | 'blue' | 'orange' | 'muted' | 'destructive';
  /** Optional extra content rendered inside the header, right-aligned (e.g. an inline switch). */
  headerAccessory?: ReactNode;
}

const TONE_TILE: Record<NonNullable<SettingsCardProps['tone']>, string> = {
  primary: 'bg-primary/15 border-primary/30 text-primary',
  green:
    'bg-[oklch(0.78_0.15_140/0.14)] border-[oklch(0.78_0.15_140/0.32)] text-[oklch(0.78_0.15_140)]',
  gold: 'bg-[oklch(0.8_0.14_70/0.14)] border-[oklch(0.8_0.14_70/0.32)] text-[oklch(0.8_0.14_70)]',
  blue: 'bg-[oklch(0.8_0.13_210/0.14)] border-[oklch(0.8_0.13_210/0.32)] text-[oklch(0.8_0.13_210)]',
  orange:
    'bg-[oklch(0.74_0.18_40/0.14)] border-[oklch(0.74_0.18_40/0.32)] text-[oklch(0.74_0.18_40)]',
  muted: 'bg-muted/25 border-border-glass text-muted-foreground',
  destructive: 'bg-destructive/15 border-destructive/30 text-destructive',
};

export function SettingsCard({
  children,
  className,
  icon: Icon,
  title,
  subtitle,
  tone = 'primary',
  headerAccessory,
}: SettingsCardProps) {
  const hasHeader = Icon && title;
  return (
    <div
      className={cn(
        'relative rounded-xl border border-border-glass bg-card/40 backdrop-blur-sm',
        'px-5 py-4',
        className
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex items-start gap-3',
            children ? 'mb-3.5 pb-3 border-b border-border-glass/60' : undefined
          )}
        >
          <div
            className={cn(
              'grid place-items-center flex-shrink-0 size-[38px] rounded-[10px] border',
              TONE_TILE[tone]
            )}
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="font-serif font-bold text-[16px] leading-tight tracking-[-0.01em] text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-[11.5px] text-muted-foreground leading-snug">{subtitle}</p>
            )}
          </div>
          {headerAccessory && (
            <div className="flex items-center flex-shrink-0 pt-0.5">{headerAccessory}</div>
          )}
        </div>
      )}
      {children && <div className={hasHeader ? 'space-y-3.5' : 'space-y-3.5'}>{children}</div>}
    </div>
  );
}

// ── Row primitives ──────────────────────────────────────────────────
//
// The mock's rows share a common pattern: a label block (title + optional
// description) on the left and a control on the right. These helpers keep the
// card bodies consistent across sections without forcing every caller to
// duplicate the flex wrapper.

export interface SettingsRowProps {
  children: ReactNode;
  className?: string;
  /** Stack label above control instead of side-by-side (used for sliders/selects). */
  stacked?: boolean;
  /** When true, render a top divider (used for multi-row groups). */
  divider?: boolean;
}

export function SettingsRow({ children, className, stacked, divider }: SettingsRowProps) {
  return (
    <div
      className={cn(
        stacked ? 'flex flex-col gap-2' : 'flex items-center justify-between gap-4',
        divider && 'border-t border-border-glass/50 pt-3.5',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface SettingsRowLabelProps {
  title: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
}

export function SettingsRowLabel({ title, description, id, className }: SettingsRowLabelProps) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      <p id={id} className="text-[13px] font-semibold leading-snug text-foreground">
        {title}
      </p>
      {description && (
        <p className="mt-0.5 text-[11.5px] text-muted-foreground/85 leading-snug">{description}</p>
      )}
    </div>
  );
}
