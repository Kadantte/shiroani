import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { X, Pin, Bold, Italic, Strikethrough, Heading2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from './EditorToolbar';
import type {
  DiaryEntry,
  DiaryCreatePayload,
  DiaryUpdatePayload,
  DiaryMood,
  DiaryGradient,
} from '@shiroani/shared';
import { DIARY_GRADIENTS, MOOD_OPTIONS } from '@/lib/diary-constants';

interface DiaryEditorProps {
  entry: DiaryEntry | null;
  open: boolean;
  onClose: () => void;
  onCreate: (payload: DiaryCreatePayload) => void;
  onUpdate: (payload: DiaryUpdatePayload) => void;
}

export function DiaryEditor({ entry, open, onClose, onCreate, onUpdate }: DiaryEditorProps) {
  const isEditing = !!entry;
  const [title, setTitle] = useState(entry?.title ?? '');
  const [coverGradient, setCoverGradient] = useState<DiaryGradient | undefined>(
    entry?.coverGradient
  );
  const [mood, setMood] = useState<DiaryMood | undefined>(entry?.mood);
  const [isPinned, setIsPinned] = useState(entry?.isPinned ?? false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(entry?.tags ?? []);

  const initialContent = entry?.contentJson
    ? (() => {
        try {
          return JSON.parse(entry.contentJson);
        } catch {
          return undefined;
        }
      })()
    : undefined;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Zacznij pisać...',
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'min-h-[300px] px-5 py-4 focus:outline-none lined-paper',
      },
    },
  });

  const handleSave = useCallback(() => {
    if (!editor) return;

    const contentJson = JSON.stringify(editor.getJSON());

    if (isEditing) {
      onUpdate({
        id: entry!.id,
        title,
        contentJson,
        coverGradient: coverGradient ?? null,
        mood: mood ?? null,
        tags: tags.length > 0 ? tags : null,
        isPinned,
      });
    } else {
      onCreate({
        title: title || 'Bez tytułu',
        contentJson,
        coverGradient,
        mood,
        tags: tags.length > 0 ? tags : undefined,
      });
    }
    onClose();
  }, [
    editor,
    title,
    coverGradient,
    mood,
    tags,
    isPinned,
    isEditing,
    entry,
    onCreate,
    onUpdate,
    onClose,
  ]);

  const handleTagAdd = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleTagRemove = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  if (!open) return null;

  const gradientCss = coverGradient
    ? DIARY_GRADIENTS[coverGradient]?.css
    : 'linear-gradient(135deg, var(--muted) 0%, var(--accent) 100%)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={cn(
          'relative w-full max-w-2xl max-h-[85vh] flex flex-col',
          'bg-card border border-border-glass rounded-2xl overflow-hidden',
          'shadow-[0_8px_32px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.05)]'
        )}
      >
        {/* Gradient header */}
        <div className="relative h-16 shrink-0 paper-grain" style={{ background: gradientCss }}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/20 text-white/80 hover:bg-black/30 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Pin toggle */}
          <button
            onClick={() => setIsPinned(!isPinned)}
            className={cn(
              'absolute top-2 left-2 p-1.5 rounded-lg transition-colors',
              isPinned ? 'bg-white/25 text-white' : 'bg-black/20 text-white/60 hover:text-white/80'
            )}
          >
            <Pin className={cn('w-4 h-4', isPinned && 'fill-current rotate-45')} />
          </button>
        </div>

        {/* Gradient picker */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border/30 bg-card/50">
          <span className="text-2xs text-muted-foreground/60 mr-1">Okładka:</span>
          {Object.entries(DIARY_GRADIENTS).map(([key, { label, css }]) => (
            <button
              key={key}
              onClick={() => setCoverGradient(key as DiaryGradient)}
              title={label}
              className={cn(
                'w-5 h-5 rounded-full border-2 transition-all duration-150 hover:scale-110',
                coverGradient === key
                  ? 'border-primary ring-2 ring-primary/30 scale-110'
                  : 'border-transparent hover:border-foreground/20'
              )}
              style={{ background: css }}
            />
          ))}
          {coverGradient && (
            <button
              onClick={() => setCoverGradient(undefined)}
              className="ml-1 text-2xs text-muted-foreground/50 hover:text-foreground/70 transition-colors"
            >
              Usuń
            </button>
          )}
        </div>

        {/* Title input */}
        <div className="px-5 pt-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tytuł wpisu..."
            className="w-full text-lg font-semibold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
          />
        </div>

        {/* Meta row: mood + tags */}
        <div className="flex items-center gap-3 px-5 py-2">
          {/* Mood picker */}
          <div className="flex items-center gap-0.5">
            <span className="text-2xs text-muted-foreground/60 mr-1">Nastrój:</span>
            {MOOD_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMood(mood === opt.value ? undefined : opt.value)}
                title={opt.label}
                className={cn(
                  'p-1 rounded-md transition-all',
                  mood === opt.value
                    ? 'bg-accent/60 scale-110'
                    : 'hover:bg-accent/40 opacity-50 hover:opacity-100'
                )}
              >
                <opt.Icon className={cn('w-3.5 h-3.5', opt.color)} />
              </button>
            ))}
          </div>

          {/* Tags */}
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-2xs bg-primary/10 text-primary/80"
              >
                {tag}
                <button onClick={() => handleTagRemove(tag)} className="hover:text-primary ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTagAdd();
                }
              }}
              placeholder="+ Tag"
              className="w-16 text-2xs bg-transparent border-none outline-none placeholder:text-muted-foreground/40 text-foreground"
            />
          </div>
        </div>

        {/* Toolbar */}
        <EditorToolbar editor={editor} />

        {/* Editor */}
        <div className="flex-1 overflow-y-auto">
          {editor && (
            <BubbleMenu editor={editor}>
              <div className="flex items-center gap-0.5 rounded-lg border border-border bg-popover p-1 shadow-lg">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    'rounded px-1.5 py-1',
                    editor.isActive('bold')
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    'rounded px-1.5 py-1',
                    editor.isActive('italic')
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleStrike().run()}
                  className={cn(
                    'rounded px-1.5 py-1',
                    editor.isActive('strike')
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Strikethrough className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-border/50 mx-0.5" />
                <button
                  onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                  className={cn(
                    'rounded px-1.5 py-1',
                    editor.isActive('heading', { level: 2 })
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  )}
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </BubbleMenu>
          )}
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-end gap-2 px-4 py-3 border-t border-border/40 bg-card/30">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Anuluj
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs gap-1.5">
            <Check className="w-3.5 h-3.5" />
            {isEditing ? 'Zapisz' : 'Utwórz'}
          </Button>
        </div>
      </div>
    </div>
  );
}
