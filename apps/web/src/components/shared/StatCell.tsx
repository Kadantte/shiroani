import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Redesign primitive: label (JetBrains Mono, small) + value (DM Sans, bold).
 * Used on Profile, Library stats, Diary sidebar.
 */
export interface StatCellProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  /** Optional descriptor rendered under the value (e.g. "of 184") */
  sub?: React.ReactNode;
  /** When true, displays the value using the Shippori Mincho serif */
  serif?: boolean;
}

export function StatCell({ label, value, sub, serif, className, ...props }: StatCellProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)} {...props}>
      <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          'leading-none text-foreground',
          serif ? 'font-serif text-[28px] font-bold' : 'text-[24px] font-extrabold tracking-tight'
        )}
      >
        {value}
      </span>
      {sub ? <span className="text-[11px] text-muted-foreground">{sub}</span> : null}
    </div>
  );
}
