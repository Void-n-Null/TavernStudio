import { Button } from '../../ui/button';
import { customCssCheatSheet } from '../customCssCheatSheet';

interface CheatSheetSectionProps {
  onCopy: (text: string) => void;
  onInsert: (text: string) => void;
}

export function CheatSheetSection({ onCopy, onInsert }: CheatSheetSectionProps) {
  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
      <div className="text-sm text-zinc-200 font-medium">Chat selectors</div>
      <div className="text-xs text-zinc-500 mt-1">Copy or insert examples. These are the real classnames used in the chat components.</div>

      <div className="mt-3 space-y-2">
        {customCssCheatSheet.map((item) => (
          <div key={item.selector} className="rounded-lg border border-zinc-800/60 bg-zinc-950/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-xs text-zinc-100 truncate">{item.selector}</div>
                <div className="text-xs text-zinc-500 mt-1">{item.description}</div>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => onCopy(item.selector)} type="button">
                  Copy
                </Button>
                {item.example && (
                  <Button size="sm" variant="secondary" onClick={() => onInsert(item.example ?? '')} type="button">
                    Insert
                  </Button>
                )}
              </div>
            </div>

            {item.example && (
              <pre className="mt-2 text-[11px] leading-snug text-zinc-300 whitespace-pre-wrap font-mono rounded-md bg-black/30 p-2 border border-zinc-800/50">
                {item.example}
              </pre>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-zinc-500">
        Also useful data attributes:
        <div className="font-mono text-[11px] mt-1 text-zinc-400">.message-item[data-node-id="..."]</div>
        <div className="font-mono text-[11px] text-zinc-400">.message-item[data-hovered="true"]</div>
        <div className="font-mono text-[11px] text-zinc-400">.message-list-wrapper[data-dragging="true"]</div>
      </div>
    </div>
  );
}

