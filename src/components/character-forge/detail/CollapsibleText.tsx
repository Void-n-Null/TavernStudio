/**
 * CollapsibleText - truncates content to N lines with expand/collapse toggle.
 */

import { useState, useMemo, useRef, useLayoutEffect } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const html = useMemo(
    () => parseMarkdown(applyPreviewMacros(content, charName)),
    [content, charName]
  );

  // Measure if content exceeds max lines
  useLayoutEffect(() => {
    if (!contentRef.current) return;
    const lineHeight = parseFloat(getComputedStyle(contentRef.current).lineHeight) || 20;
    const maxHeight = lineHeight * maxLines;
    setNeedsCollapse(contentRef.current.scrollHeight > maxHeight + 10);
  }, [content, maxLines]);

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

      <div
        ref={contentRef}
        className="message-content text-sm text-zinc-200"
        style={{ ...lineHeightStyle, ...collapsedStyle }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

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

