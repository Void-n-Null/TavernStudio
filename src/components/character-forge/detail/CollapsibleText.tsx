/**
 * CollapsibleText - truncates content to N lines with expand/collapse toggle.
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { parseMarkdown } from '../../../utils/streamingMarkdown';

function applyPreviewMacros(text: string, charName: string): string {
  const char = charName?.trim() || 'Character';
  return (text || '')
    .replace(/\{\{char\}\}/gi, char)
    .replace(/\{\{user\}\}/gi, 'User');
}

export function CollapsibleText({
  content,
  charName,
  maxLines = 18,
  className,
}: {
  content: string;
  charName: string;
  maxLines?: number;
  className?: string;
}) {
  const LARGE_TEXT_CHARS = 50_000;
  const COLLAPSED_CHARS = 8_000;
  const COLLAPSED_MAX_LINES = 30;
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const previewText = useMemo(() => applyPreviewMacros(content, charName), [content, charName]);
  const isHuge = previewText.length > LARGE_TEXT_CHARS;
  const isLong = previewText.length > COLLAPSED_CHARS;
  const lineCount = useMemo(() => previewText.split('\n').length, [previewText]);
  const isManyLines = lineCount > maxLines + 2;

  // Critical perf rule: when collapsed, DO NOT mount the full text/HTML for content that is
  // likely to overflow. Rendering it fully and "hiding" via CSS still costs layout/paint.
  const shouldDeferWhenCollapsed = !expanded && (isHuge || isLong || isManyLines);

  const makeSnippet = (text: string): string => {
    const lines = text.split('\n');
    const clippedByLines =
      lines.length > COLLAPSED_MAX_LINES ? lines.slice(0, COLLAPSED_MAX_LINES).join('\n') : text;
    if (clippedByLines.length <= COLLAPSED_CHARS) return clippedByLines;
    return clippedByLines.slice(0, COLLAPSED_CHARS);
  };

  const collapsedText = useMemo(() => {
    if (!shouldDeferWhenCollapsed) return previewText;
    const snippet = makeSnippet(previewText);
    const remaining = Math.max(0, previewText.length - snippet.length);
    return `${snippet}\n\n… (collapsed, ${remaining.toLocaleString()} more chars)`;
  }, [previewText, shouldDeferWhenCollapsed]);

  const textToRender = shouldDeferWhenCollapsed ? collapsedText : previewText;

  // Markdown is expensive. Only parse markdown when we render the full content and it's not huge.
  const renderAsMarkdown = expanded && !isHuge && !shouldDeferWhenCollapsed;
  const html = useMemo(() => (renderAsMarkdown ? parseMarkdown(textToRender) : ''), [renderAsMarkdown, textToRender]);

  // Measure if content exceeds max lines
  useEffect(() => {
    if (!contentRef.current) return;
    // If we already decided to defer, don't measure.
    if (shouldDeferWhenCollapsed) {
      setNeedsCollapse(true);
      return;
    }

    const el = contentRef.current;
    const raf = requestAnimationFrame(() => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const maxHeight = lineHeight * maxLines;
      setNeedsCollapse(el.scrollHeight > maxHeight + 10);
    });
    return () => cancelAnimationFrame(raf);
  }, [content, maxLines, shouldDeferWhenCollapsed]);

  if (!content?.trim()) {
    return <div className="text-sm italic text-zinc-600">Empty</div>;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lineHeightStyle = { lineHeight: '1.6' };
  const collapsedStyle = needsCollapse && !expanded
    ? { maxHeight: `calc(1.6em * ${maxLines})`, overflow: 'hidden' as const }
    : {};

  return (
    <div className={cn('relative group', className)}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={cn(
          'absolute right-0 top-0 z-10 rounded-md p-1.5 text-zinc-500',
          'opacity-0 transition-opacity group-hover:opacity-100',
          'hover:bg-zinc-800 hover:text-zinc-300'
        )}
        aria-label="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>

      {renderAsMarkdown ? (
        <div
          ref={contentRef}
          className="message-content text-sm text-zinc-200"
          style={{ ...lineHeightStyle, ...collapsedStyle }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div
          ref={contentRef}
          className="text-sm text-zinc-200 whitespace-pre-wrap break-words"
          style={{ ...lineHeightStyle, ...collapsedStyle }}
        >
          {textToRender}
        </div>
      )}

      {needsCollapse && !expanded && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950/90 to-transparent" />
      )}

      {needsCollapse && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium',
            'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors'
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

