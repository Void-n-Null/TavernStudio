import { useCallback, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { cn } from '../../../lib/utils';
import { CheatSheetSection } from './CustomCssCheatSheetSection';
import { CustomCssSnippetsSection } from './CustomCssSnippetsSection';
import { CustomCssValidationSection } from './CustomCssValidationSection';

function validateCss(css: string): { ok: boolean; error?: string } {
  const input = css.trim();
  if (!input) return { ok: true };

  try {
    // Best case: modern browsers
    if (typeof CSSStyleSheet !== 'undefined') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(input);
      return { ok: true };
    }

    // Fallback: attempt to parse via a detached document
    const doc = document.implementation.createHTMLDocument('css-validate');
    const style = doc.createElement('style');
    style.textContent = input;
    doc.head.appendChild(style);

    // Accessing cssRules will throw on parse errors in many browsers.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    style.sheet?.cssRules;

    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function CustomCssEditorControl({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [tab, setTab] = useState<'editor' | 'selectors' | 'snippets' | 'validate'>('editor');

  const validation = useMemo(() => validateCss(value), [value]);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Ignore clipboard failures (permissions, etc.)
    }
  }, []);

  const insertAtEnd = useCallback(
    (snippet: string) => {
      const next = value.trim().length === 0 ? snippet.trimStart() : `${value.replace(/\s*$/, '')}\n\n${snippet.trimStart()}`;
      onChange(next);
      setTab('editor');
    },
    [onChange, value]
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 p-3">
        <div className="text-xs text-zinc-400">
          Inline styles are used heavily in the chat UI. If your rule "does nothing", you probably need <span className="text-zinc-200">!important</span>.
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Cheat sheet is maintained manually. If you spot missing selectors, update it here so it doesn’t drift.
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList className="w-full grid grid-cols-2 gap-1 sm:flex sm:items-center sm:justify-start">
          <TabsTrigger className="w-full justify-center" value="editor">Editor</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="selectors">Selectors</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="snippets">Snippets</TabsTrigger>
          <TabsTrigger className="w-full justify-center" value="validate">Validate</TabsTrigger>
        </TabsList>

        <TabsContent value="editor">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/* Write CSS here */\n\n.message-content {\n  color: #eaeaea !important;\n}\n"
            spellCheck={false}
            disabled={disabled}
            className={cn(
              'w-full min-h-[280px] p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40',
              disabled && 'opacity-60'
            )}
          />
        </TabsContent>

        <TabsContent value="selectors">
          <CheatSheetSection onCopy={copy} onInsert={insertAtEnd} />
        </TabsContent>

        <TabsContent value="snippets">
          <CustomCssSnippetsSection onCopy={copy} onInsert={insertAtEnd} />
        </TabsContent>

        <TabsContent value="validate">
          <CustomCssValidationSection validation={validation} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
