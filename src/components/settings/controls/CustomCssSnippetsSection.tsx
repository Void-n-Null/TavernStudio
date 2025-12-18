import { Button } from '../../ui/button';

interface SnippetProps {
  title: string;
  code: string;
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}

function Snippet({ title, code, onCopy, onInsert }: SnippetProps) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-zinc-200 font-medium">{title}</div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(code)} type="button">
            Copy
          </Button>
          <Button size="sm" variant="secondary" onClick={() => onInsert(code)} type="button">
            Insert
          </Button>
        </div>
      </div>
      <pre className="mt-2 text-[11px] leading-snug text-zinc-300 whitespace-pre-wrap font-mono rounded-md bg-black/30 p-2 border border-zinc-800/50">
        {code}
      </pre>
    </div>
  );
}

interface CustomCssSnippetsSectionProps {
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}

export function CustomCssSnippetsSection({ onCopy, onInsert }: CustomCssSnippetsSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3 space-y-2">
      <div className="text-sm text-zinc-200 font-medium">Common snippets</div>
      <div className="text-xs text-zinc-500">These are biased toward actually overriding inline styles (hence the !important spam).</div>

      <Snippet
        title="Force message text color"
        code={'.message-content {\n  color: #eaeaea !important;\n}\n'}
        onCopy={onCopy}
        onInsert={onInsert}
      />
      <Snippet
        title="Make action buttons always visible"
        code={'.message-actions--hover {\n  opacity: 1 !important;\n}\n'}
        onCopy={onCopy}
        onInsert={onInsert}
      />
      <Snippet
        title="Give every message a subtle outline"
        code={'.message-item {\n  outline: 1px solid rgba(255,255,255,0.08) !important;\n  outline-offset: -1px;\n}\n'}
        onCopy={onCopy}
        onInsert={onInsert}
      />
      <Snippet
        title="Increase code block contrast"
        code={'.message-content pre {\n  border: 1px solid rgba(255,255,255,0.14);\n  background: rgba(0,0,0,0.55) !important;\n}\n'}
        onCopy={onCopy}
        onInsert={onInsert}
      />
    </div>
  );
}

