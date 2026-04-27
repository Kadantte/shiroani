import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { cn } from '@/lib/utils';

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof Group>) => (
  <Group
    className={cn('flex h-full w-full', 'data-[orientation=vertical]:flex-col', className)}
    {...props}
  />
);

const ResizablePanel = Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & { withHandle?: boolean }) => (
  <Separator
    className={cn(
      'relative flex items-center justify-center bg-border-glass transition-colors',
      'w-px after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2',
      'hover:bg-primary/40',
      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div
        className={cn(
          'z-10 flex h-5 w-3 items-center justify-center rounded-sm border border-border-glass bg-card/80 backdrop-blur-sm'
        )}
      >
        <GripVertical className="h-2.5 w-2.5 text-muted-foreground" />
      </div>
    )}
  </Separator>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
