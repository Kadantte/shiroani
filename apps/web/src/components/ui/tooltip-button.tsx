import * as React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface TooltipButtonProps extends ButtonProps {
  tooltip: React.ReactNode;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const TooltipButton = React.forwardRef<HTMLButtonElement, TooltipButtonProps>(
  ({ tooltip, tooltipSide, children, ...buttonProps }, ref) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button ref={ref} {...buttonProps}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
    </Tooltip>
  )
);
TooltipButton.displayName = 'TooltipButton';

export { TooltipButton };
export type { TooltipButtonProps };
