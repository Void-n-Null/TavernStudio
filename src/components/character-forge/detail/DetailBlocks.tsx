import { useMemo } from 'react';
import { cn } from '../../../lib/utils';
import { parseMarkdown } from '../../../utils/streamingMarkdown';

export function applyPreviewMacros(text: string, charName: string): string {
  const char = charName?.trim() ? charName.trim() : 'Character';
  return (text || '')
    .replace(/\{\{char\}\}/gi, char)
    .replace(/\{\{user\}\}/gi, 'User');
}

export function MarkdownBlock({ content, charName }: { content: string; charName: string }) {
  const LARGE_TEXT_CHARS = 50_000;
  const previewText = useMemo(() => applyPreviewMacros(content, charName), [content, charName]);
  const renderAsMarkdown = previewText.length <= LARGE_TEXT_CHARS;
  const html = useMemo(() => (renderAsMarkdown ? parseMarkdown(previewText) : ''), [previewText, renderAsMarkdown]);
  if (!content?.trim()) return <div className="text-sm italic text-zinc-600">Empty</div>;
  if (!renderAsMarkdown) {
    return <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{previewText}</div>;
  }
  return <div className="message-content text-sm leading-relaxed text-zinc-200" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Card({
  title,
  icon,
  children,
  className,
  headerRight,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}) {
  const Icon = icon;
  return (
    <div className={cn('rounded-xl border border-zinc-800/60 bg-zinc-950/30 backdrop-blur-sm', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/50 px-4 py-3">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-zinc-500" /> : null}
          <div className="text-sm font-medium text-zinc-200">{title}</div>
        </div>
        {headerRight}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

export function CodeBlock({
  text,
  maxHeightClass = 'max-h-[320px]',
  maxChars,
}: {
  text: string;
  maxHeightClass?: string;
  maxChars?: number;
}) {
  if (!text?.trim()) return <div className="text-sm italic text-zinc-600">Empty</div>;
  const clipped =
    typeof maxChars === 'number' && maxChars > 0 && text.length > maxChars
      ? `${text.slice(0, maxChars)}\n\n… (truncated ${text.length - maxChars} chars)`
      : text;
  return (
    <pre
      className={cn(
        'overflow-auto whitespace-pre-wrap rounded-lg border border-zinc-800 bg-zinc-950/60 p-3',
        'font-mono text-xs leading-relaxed text-zinc-200',
        maxHeightClass
      )}
    >
      {clipped}
    </pre>
  );
}

export function MetricRow({
  label,
  value,
  rightClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  rightClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <div className="text-zinc-500">{label}</div>
      <div className={cn('text-zinc-200', rightClassName)}>{value}</div>
    </div>
  );
}


