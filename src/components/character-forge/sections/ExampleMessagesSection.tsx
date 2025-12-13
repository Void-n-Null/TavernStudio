/**
 * ExampleMessagesSection - Example dialogue with snippet helpers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Wand2 } from 'lucide-react';
import { MacroHighlightTextarea } from '../MacroHighlightTextarea';
import { Button } from '../../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { ExampleConversationBuilder } from './ExampleConversationBuilder';
import { parseExampleMessages, serializeExampleMessages, type ExampleConversation } from '../../../utils/exampleMessages';

interface ExampleMessagesSectionProps {
  exampleMessages: string;
  characterName: string;
  onChange: (value: string) => void;
}

// Common example message templates
const SNIPPETS = [
  {
    label: 'Basic Exchange',
    template: (char: string) => `<START>
{{user}}: Hello there!
{{char}}: *${char} looks up with interest* Well hello! What brings you here today?`,
  },
  {
    label: 'Action Description',
    template: (char: string) => `<START>
{{user}}: *approaches cautiously*
{{char}}: *${char} notices the hesitation and offers a reassuring smile* Don't worry, I don't bite... much.`,
  },
  {
    label: 'Emotional Response',
    template: (char: string) => `<START>
{{user}}: Are you okay?
{{char}}: *${char}'s expression softens slightly* I... appreciate you asking. It's been a difficult day.`,
  },
];

export function ExampleMessagesSection({
  exampleMessages,
  characterName,
  onChange,
}: ExampleMessagesSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<'builder' | 'raw'>('builder');

  const parsed = useMemo(() => parseExampleMessages(exampleMessages), [exampleMessages]);
  const [builderConversations, setBuilderConversations] = useState<ExampleConversation[]>([]);
  const lastUpdateSourceRef = useRef<'builder' | 'external'>('external');

  // Keep builder in sync with raw if raw is parseable.
  useEffect(() => {
    if (mode !== 'builder') return;
    if (!parsed.ok) return;
    if (lastUpdateSourceRef.current === 'builder') return;
    setBuilderConversations(parsed.conversations);
  }, [mode, parsed.ok, parsed.conversations]);

  const builderLocked = mode === 'builder' && !parsed.ok;
  
  const handleInsertSnippet = (template: (char: string) => string) => {
    lastUpdateSourceRef.current = 'external';
    const snippet = template(characterName || 'Character');
    const newValue = exampleMessages 
      ? `${exampleMessages}\n\n${snippet}` 
      : snippet;
    onChange(newValue);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-zinc-300">Example Messages</label>
          <p className="mt-0.5 text-xs text-zinc-500">
            Dialogue examples showing your character's writing style. Use &lt;START&gt; to separate conversations.
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title={expanded ? 'Minimize' : 'Maximize'}
        >
          {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>
      </div>
      
      {/* Snippet buttons */}
      <div className="flex flex-wrap gap-2">
        {SNIPPETS.map((snippet) => (
          <Button
            key={snippet.label}
            size="sm"
            variant="outline"
            onClick={() => handleInsertSnippet(snippet.template)}
            className="text-xs"
          >
            <Wand2 className="mr-1.5 h-3 w-3" />
            {snippet.label}
          </Button>
        ))}
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
        <TabsList>
          <TabsTrigger value="builder">Builder</TabsTrigger>
          <TabsTrigger value="raw">Raw</TabsTrigger>
        </TabsList>

        <TabsContent value="builder">
          {builderLocked && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              The raw example text doesn’t cleanly match the expected format (speaker prefixes + optional &lt;START&gt; markers).
              Builder is read-only until the raw is fixed, so we don’t accidentally delete content.
            </div>
          )}

          <ExampleConversationBuilder
            conversations={builderLocked ? parsed.conversations : builderConversations}
            disabled={builderLocked}
            onChange={(next) => {
              lastUpdateSourceRef.current = 'builder';
              setBuilderConversations(next);
              // Only write back to raw if the source is clean.
              const raw = serializeExampleMessages(next);
              onChange(raw);
            }}
          />

          {!parsed.ok && (parsed.unparsed.trim() || parsed.issues.length > 0) && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-zinc-300">Unparsed / invalid content (kept visible)</div>
              {parsed.issues.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-zinc-400">
                  {parsed.issues.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              )}
              {parsed.unparsed.trim() && (
                <pre className="max-h-56 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-200">
{parsed.unparsed}
                </pre>
              )}
              <div className="text-[11px] text-zinc-500">
                Fix it in <strong>Raw</strong>, or keep it as-is. I’m not touching it automatically.
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="raw">
          <MacroHighlightTextarea
            value={exampleMessages}
            onChange={(v) => {
              lastUpdateSourceRef.current = 'external';
              onChange(v);
            }}
            placeholder={`<START>
{{user}}: Hello!
{{char}}: *waves* Hi there!`}
            rows={expanded ? 20 : 8}
            maxRows={expanded ? 40 : 15}
          />
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-zinc-500">
        <strong>Tip:</strong> Use <code className="rounded bg-zinc-800 px-1">&lt;START&gt;</code> to 
        begin a new example conversation. Use <code className="rounded bg-zinc-800 px-1">{`{{user}}`}</code> and{' '}
        <code className="rounded bg-zinc-800 px-1">{`{{char}}`}</code> as placeholders.
      </div>
    </div>
  );
}

