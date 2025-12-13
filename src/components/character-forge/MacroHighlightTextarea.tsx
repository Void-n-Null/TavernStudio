/**
 * MacroHighlightTextarea - Textarea with visual highlighting of macros.
 * 
 * Highlights {{char}}, {{user}}, {{original}}, and other common macros
 * with distinct colors. Uses an overlay technique to show highlights
 * while keeping the textarea fully functional.
 */

import { useRef, useLayoutEffect, useState, useId } from 'react';
import { cn } from '../../lib/utils';

// Macro definitions with their highlight colors
const MACRO_PATTERNS: Array<{ pattern: RegExp; className: string; label: string }> = [
  { pattern: /\{\{char\}\}/gi, className: 'bg-violet-500/30 text-violet-300', label: 'Character name' },
  { pattern: /\{\{user\}\}/gi, className: 'bg-blue-500/30 text-blue-300', label: 'User name' },
  { pattern: /\{\{original\}\}/gi, className: 'bg-amber-500/30 text-amber-300', label: 'Original prompt' },
  { pattern: /\{\{personality\}\}/gi, className: 'bg-emerald-500/30 text-emerald-300', label: 'Personality' },
  { pattern: /\{\{scenario\}\}/gi, className: 'bg-cyan-500/30 text-cyan-300', label: 'Scenario' },
  { pattern: /\{\{mes_example\}\}/gi, className: 'bg-pink-500/30 text-pink-300', label: 'Example messages' },
  { pattern: /<BOT>/gi, className: 'bg-violet-500/30 text-violet-300', label: 'Bot marker' },
  { pattern: /<USER>/gi, className: 'bg-blue-500/30 text-blue-300', label: 'User marker' },
  { pattern: /<START>/gi, className: 'bg-zinc-500/30 text-zinc-300', label: 'Start marker' },
];

interface MacroHighlightTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxRows?: number;
  label?: string;
  description?: string;
}

export function MacroHighlightTextarea({
  value,
  onChange,
  placeholder,
  className,
  rows = 4,
  maxRows,
  label,
  description,
}: MacroHighlightTextareaProps) {
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  
  // Sync scroll position
  const handleScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };
  
  // Generate highlighted HTML
  const getHighlightedHtml = () => {
    if (!value) return '';
    
    // Escape HTML
    let html = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Apply macro highlights
    for (const { pattern, className: cls } of MACRO_PATTERNS) {
      html = html.replace(pattern, (match) => {
        return `<mark class="${cls} rounded px-0.5">${match}</mark>`;
      });
    }
    
    // Preserve line breaks and trailing newline for proper sizing
    html = html.replace(/\n/g, '<br/>');
    if (value.endsWith('\n')) {
      html += '<br/>';
    }
    
    return html;
  };
  
  // Auto-resize if maxRows is set
  useLayoutEffect(() => {
    if (!textareaRef.current || !maxRows) return;
    
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const maxHeight = lineHeight * maxRows;
    const minHeight = lineHeight * rows;
    
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
    textarea.style.height = `${newHeight}px`;
  }, [value, rows, maxRows]);

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-300">
          {label}
        </label>
      )}
      {description && (
        <p className="mb-2 text-xs text-zinc-500">{description}</p>
      )}
      
      <div className="relative">
        {/* Highlight backdrop */}
        <div
          ref={backdropRef}
          className={cn(
            'pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words p-3',
            'font-mono text-sm text-transparent',
            'rounded-lg border border-transparent'
          )}
          style={{ wordWrap: 'break-word' }}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: getHighlightedHtml() }}
        />
        
        {/* Actual textarea */}
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={rows}
          spellCheck={false}
          className={cn(
            'relative w-full resize-y rounded-lg border bg-zinc-900/80 p-3',
            'font-mono text-sm text-zinc-200 caret-zinc-100',
            'placeholder:text-zinc-600',
            'focus:outline-none',
            isFocused 
              ? 'border-violet-500/50 ring-1 ring-violet-500/30' 
              : 'border-zinc-800'
          )}
          style={{ 
            // Make text slightly transparent so highlights show through
            color: 'rgba(228, 228, 231, 0.9)',
            background: 'rgba(24, 24, 27, 0.8)',
          }}
        />
      </div>
      
      {/* Macro legend (only when focused) */}
      {isFocused && value && (
        <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
          {MACRO_PATTERNS.slice(0, 4).map(({ pattern, className: cls, label: lbl }) => {
            const match = value.match(pattern);
            if (!match) return null;
            return (
              <span key={lbl} className={cn('rounded px-1.5 py-0.5', cls)}>
                {lbl}
              </span>
            );
          }).filter(Boolean)}
        </div>
      )}
    </div>
  );
}

