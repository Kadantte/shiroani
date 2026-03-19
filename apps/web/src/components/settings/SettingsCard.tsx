import type { LucideIcon } from 'lucide-react';
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
}

export function SettingsCard({
  children,
  className,
  icon: Icon,
  title,
  subtitle,
}: SettingsCardProps) {
  return (
    <div
      className={cn(
        'bg-background/40 border border-border-glass backdrop-blur-sm rounded-xl p-4',
        children && 'space-y-4',
        className
      )}
    >
      {Icon && title && (
        <div className={cn('flex items-center gap-2.5', children && 'mb-3')}>
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground/70">{subtitle}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
