/**
 * CharacterDetailDashboard - Dense, 6-column grid layout.
 *
 * Layout rationale:
 * - Each "row" is its own grid so vertical sizing doesn't bleed between columns
 * - Full width (no max-width constraint) with padding
 * - Description is collapsible to ~18 lines
 * - Token Budget bar at top for at-a-glance context usage
 * - Per-field copy buttons for interactivity
 */

import { useMemo, useState } from 'react';
import { Copy, Download, Pencil, User, X, MessageSquareText, Sparkles, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { parseExampleMessages } from '../../utils/exampleMessages';
import { Card, CodeBlock, MarkdownBlock } from './detail/DetailBlocks';
import { CharacterDetailInsights } from './detail/CharacterDetailInsights';
import { TokenBudgetBar } from './detail/TokenBudgetBar';
import { CollapsibleText } from './detail/CollapsibleText';

export type CharacterDetailDashboardData = {
  id: string;
  name: string;
  specLabel: string;
  createdAt: number;
  updatedAt: number;
  hasPng: boolean;
  avatarUrl: string | null;
  rawJson: string;

  creator: string;
  characterVersion: string;
  tags: string[];

  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  alternateGreetings: string[];
  exampleMessages: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  creatorNotes: string;
};

// Copyable card header helper
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text?.trim()) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="rounded-md p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export function CharacterDetailDashboard({
  data,
  onEdit,
  onClose,
  onCopyJson,
  onExportJson,
  onExportPng,
}: {
  data: CharacterDetailDashboardData;
  onEdit: () => void;
  onClose: () => void;
  onCopyJson: () => void;
  onExportJson: () => void;
  onExportPng: () => void;
}) {
  const HUGE_TEXT_CHARS = 50_000;
  const RAW_JSON_PREVIEW_CHARS = 4_000;
  const [imgError, setImgError] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const [totalTokens, setTotalTokens] = useState<number | null>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const greetings = useMemo(
    () => [data.firstMessage, ...data.alternateGreetings],
    [data.firstMessage, data.alternateGreetings]
  );
  const greetingLabel = greetingIndex === 0 ? 'First' : `Alt ${greetingIndex}`;

  const examplesParsed = useMemo(() => {
    // Parsing + rendering massive example blocks is a UI killer. If it's huge, show raw instead.
    if ((data.exampleMessages || '').length > HUGE_TEXT_CHARS) return null;
    return parseExampleMessages(data.exampleMessages);
  }, [data.exampleMessages]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-950/50">
      {/* Hero header - compact */}
      <div className="shrink-0 border-b border-zinc-800/50 bg-zinc-950/80 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800 shadow-lg">
              {data.hasPng && data.avatarUrl && !imgError ? (
                <img
                  src={data.avatarUrl}
                  alt={data.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-600">
                  <User className="h-6 w-6" />
                </div>
              )}
            </div>

            <div>
              <div
                className="text-xl font-bold text-zinc-100"
                style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
              >
                {data.name}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[11px]">
                  {data.specLabel}
                </span>
                {data.creator && (
                  <span className="rounded bg-zinc-900/60 px-2 py-0.5">by {data.creator}</span>
                )}
                {data.characterVersion && (
                  <span className="rounded bg-zinc-900/60 px-2 py-0.5">v{data.characterVersion}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onCopyJson}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
            <Button size="sm" variant="outline" onClick={onExportJson}>
              <Download className="h-4 w-4" />
              JSON
            </Button>
            {data.hasPng && (
              <Button size="sm" variant="outline" onClick={onExportPng}>
                <Download className="h-4 w-4" />
                PNG
              </Button>
            )}
            <Button
              size="sm"
              onClick={onEdit}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <button
              onClick={onClose}
              className="ml-1 rounded-lg p-2 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {data.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-200"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Dashboard content - independent rows */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto w-full space-y-4">
          {/* Row 0: Token Budget Bar (full width) */}
          <TokenBudgetBar totalTokens={totalTokens} loading={totalTokens === null} />

          {/* Row 1: Description (4 cols) + Personality/Scenario (2 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="Description"
              className="col-span-6 lg:col-span-4"
              headerRight={<CopyButton text={data.description} />}
            >
              <CollapsibleText content={data.description} charName={data.name} maxLines={18} />
            </Card>

            <div className="col-span-6 space-y-4 lg:col-span-2">
              <Card title="Personality" headerRight={<CopyButton text={data.personality} />}>
                <MarkdownBlock content={data.personality} charName={data.name} />
              </Card>
              <Card title="Scenario" headerRight={<CopyButton text={data.scenario} />}>
                <MarkdownBlock content={data.scenario} charName={data.name} />
              </Card>
            </div>
          </div>

          {/* Row 2: Greetings (3 cols) + Examples (3 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="Greetings"
              icon={MessageSquareText}
              className="col-span-6 lg:col-span-3"
              headerRight={
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <button
                    className="rounded-md px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                    disabled={greetingIndex <= 0}
                    onClick={() => setGreetingIndex((v) => Math.max(0, v - 1))}
                  >
                    ←
                  </button>
                  <span className="rounded bg-zinc-900/60 px-2 py-1">
                    {greetingLabel} ({greetingIndex + 1}/{greetings.length})
                  </span>
                  <button
                    className="rounded-md px-2 py-1 hover:bg-zinc-800 disabled:opacity-40"
                    disabled={greetingIndex >= greetings.length - 1}
                    onClick={() => setGreetingIndex((v) => Math.min(greetings.length - 1, v + 1))}
                  >
                    →
                  </button>
                  <CopyButton text={greetings[greetingIndex] || ''} />
                </div>
              }
            >
              <CollapsibleText
                content={greetings[greetingIndex] || ''}
                charName={data.name}
                maxLines={12}
              />
            </Card>

            <Card
              title="Example Messages"
              icon={Sparkles}
              className="col-span-6 lg:col-span-3"
              headerRight={<CopyButton text={data.exampleMessages} />}
            >
              {examplesParsed?.ok ? (
                <div className="max-h-[320px] space-y-3 overflow-y-auto">
                  {examplesParsed.conversations.map((conv, i) => (
                    <div
                      key={conv.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3"
                    >
                      <div className="mb-2 text-xs font-medium text-zinc-400">
                        Conversation {i + 1}
                      </div>
                      <div className="space-y-2">
                        {conv.messages.map((m, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'rounded-lg px-3 py-2 text-sm',
                              m.role === 'user'
                                ? 'border border-blue-500/20 bg-blue-500/10 text-blue-100'
                                : 'border border-violet-500/20 bg-violet-500/10 text-violet-100'
                            )}
                          >
                            <div className="mb-1 text-[11px] font-medium opacity-70">
                              {m.role === 'user' ? 'User' : data.name || 'Character'}
                            </div>
                            <div className="whitespace-pre-wrap">{m.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-amber-200">
                    {examplesParsed === null ? 'Too large to parse. Showing raw.' : 'Non-standard format. Showing raw.'}
                  </div>
                  <CodeBlock text={data.exampleMessages} maxHeightClass="max-h-[200px]" maxChars={60_000} />
                </div>
              )}
            </Card>
          </div>

          {/* Row 3: System + Post-History + Notes (2+2+2) */}
          <div className="grid grid-cols-6 gap-4">
            <Card
              title="System Prompt"
              className="col-span-6 md:col-span-3 lg:col-span-2"
              headerRight={<CopyButton text={data.systemPrompt} />}
            >
              <CodeBlock text={data.systemPrompt} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>

            <Card
              title="Post-History"
              className="col-span-6 md:col-span-3 lg:col-span-2"
              headerRight={<CopyButton text={data.postHistoryInstructions} />}
            >
              <CodeBlock text={data.postHistoryInstructions} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>

            <Card
              title="Creator Notes"
              className="col-span-6 md:col-span-6 lg:col-span-2"
              headerRight={<CopyButton text={data.creatorNotes} />}
            >
              <CodeBlock text={data.creatorNotes} maxHeightClass="max-h-[180px]" maxChars={60_000} />
            </Card>
          </div>

          {/* Row 4: Token Breakdown (3 cols) + Raw JSON (3 cols) */}
          <div className="grid grid-cols-6 gap-4">
            <div className="col-span-6 lg:col-span-3">
              <CharacterDetailInsights
                input={{
                  name: data.name,
                  description: data.description,
                  personality: data.personality,
                  scenario: data.scenario,
                  firstMessage: data.firstMessage,
                  alternateGreetings: data.alternateGreetings,
                  exampleMessages: data.exampleMessages,
                  systemPrompt: data.systemPrompt,
                  postHistoryInstructions: data.postHistoryInstructions,
                  creatorNotes: data.creatorNotes,
                }}
                onTokensCalculated={setTotalTokens}
              />
            </div>

            <Card
              title="Raw JSON"
              className="col-span-6 lg:col-span-3"
              headerRight={
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setJsonExpanded((v) => !v)}
                    className="rounded-md px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                  >
                    {jsonExpanded ? 'Collapse' : 'Expand'}
                  </button>
                  <CopyButton text={data.rawJson} />
                </div>
              }
            >
              {!jsonExpanded ? (
                <div className="space-y-2">
                  <div className="text-xs text-zinc-500">
                    Showing preview. Full JSON is{' '}
                    <span className="font-mono text-zinc-200">{data.rawJson.length.toLocaleString()}</span> chars.
                  </div>
                  <CodeBlock text={data.rawJson} maxHeightClass="max-h-[200px]" maxChars={RAW_JSON_PREVIEW_CHARS} />
                  <div className="text-xs text-zinc-500">
                    Tip: use the JSON export button above to open it in a new tab without freezing this view.
                  </div>
                </div>
              ) : (
                <CodeBlock
                  text={data.rawJson}
                  maxHeightClass="max-h-[600px]"
                  // Even expanded, don't try to render absurdly large blobs.
                  maxChars={250_000}
                />
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
