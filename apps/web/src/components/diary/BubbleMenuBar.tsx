import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Heading2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BubbleMenuBarProps {
  editor: Editor;
}

const FORMATTING_BUTTONS = [
  {
    key: 'bold',
    Icon: Bold,
    toggle: (e: Editor) => e.chain().focus().toggleBold().run(),
    isActive: (e: Editor) => e.isActive('bold'),
  },
  {
    key: 'italic',
    Icon: Italic,
    toggle: (e: Editor) => e.chain().focus().toggleItalic().run(),
    isActive: (e: Editor) => e.isActive('italic'),
  },
  {
    key: 'strike',
    Icon: Strikethrough,
    toggle: (e: Editor) => e.chain().focus().toggleStrike().run(),
    isActive: (e: Editor) => e.isActive('strike'),
  },
] as const;

const HEADING_BUTTON = {
  key: 'heading',
  Icon: Heading2,
  toggle: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  isActive: (e: Editor) => e.isActive('heading', { level: 2 }),
} as const;

export function BubbleMenuBar({ editor }: BubbleMenuBarProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
      {FORMATTING_BUTTONS.map(({ key, Icon, toggle, isActive }) => (
        <button
          key={key}
          onClick={() => toggle(editor)}
          className={cn(
            'rounded px-1.5 py-1',
            isActive(editor)
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </button>
      ))}
      <div className="w-px h-4 bg-border/50 mx-0.5" />
      <button
        onClick={() => HEADING_BUTTON.toggle(editor)}
        className={cn(
          'rounded px-1.5 py-1',
          HEADING_BUTTON.isActive(editor)
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
        )}
      >
        <HEADING_BUTTON.Icon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
