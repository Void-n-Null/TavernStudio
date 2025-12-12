import { memo, useMemo, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTypographyConfig, useEditConfig } from '../../hooks/queries/useProfiles';
import { fontSizeMap, lineHeightMap, fontFamilyMap, fontWeightMap } from '../../types/messageStyle';
import { Streamdown } from 'streamdown';
import { normalizeFencedCodeBlocks } from '../../utils/streamingMarkdown';
import { subscribeToContent, getStreamingContent } from '../../store/streamingStore';

interface MessageContentProps {
  nodeId: string;
  content: string;
  isBot: boolean;
  /** If true, render live streaming markdown from the streaming store buffer */
  isStreaming?: boolean;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content with markdown support.
 * 
 * Streaming messages subscribe to the streaming store buffer and render via
 * the same DOM container as static messages. This avoids a streaming->static
 * remount on finalize, which can cause scroll jumps when the message is tall.
 */
export const MessageContent = memo(function MessageContent({
  nodeId: _nodeId,
  content,
  isBot,
  isStreaming = false,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  const typography = useTypographyConfig();
  const editConfig = useEditConfig();

  const containerRef = useRef<HTMLDivElement>(null);
  const [streamingRaw, setStreamingRaw] = useState(() => (isStreaming ? getStreamingContent() : ''));
  const pendingRawRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Subscribe to streaming updates only when this message is the active streaming node.
  useEffect(() => {
    if (!isStreaming) {
      // Cleanup any scheduled work and avoid holding stale buffer.
      if (rafRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
      pendingRawRef.current = null;
      setStreamingRaw('');
      return;
    }

    // Initialize from current buffer (in case we mounted mid-stream).
    setStreamingRaw(getStreamingContent());

    const schedule =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16) as unknown as number;

    const cancel =
      typeof cancelAnimationFrame === 'function'
        ? cancelAnimationFrame
        : (id: number) => clearTimeout(id);

    const unsubscribe = subscribeToContent((_html, raw) => {
      pendingRawRef.current = raw;
      if (rafRef.current == null) {
        rafRef.current = schedule(() => {
          rafRef.current = null;
          const nextRaw = pendingRawRef.current;
          pendingRawRef.current = null;
          if (nextRaw == null) return;
          setStreamingRaw(nextRaw);
        });
      }
    });

    return () => {
      unsubscribe();
      if (rafRef.current != null) {
        cancel(rafRef.current);
        rafRef.current = null;
      }
      pendingRawRef.current = null;
    };
  }, [isStreaming]);

  /**
   * Optimistically close unclosed quotes in raw markdown.
   * If we see an opening " without a closing ", add one at the end.
   */
  const displayContent = useMemo(() => {
    const raw = isStreaming ? streamingRaw : content;
    const normalized = normalizeFencedCodeBlocks(raw);
    const quoteCount = (normalized.match(/"/g) || []).length;
    return quoteCount % 2 !== 0 ? normalized + '"' : normalized;
  }, [content, isStreaming, streamingRaw]);

  function unwrapMdQuotes(element: HTMLElement) {
    const spans = Array.from(element.querySelectorAll('span.md-quote'));
    for (const span of spans) {
      const text = span.textContent ?? '';
      span.replaceWith(document.createTextNode(text));
    }
  }

  function wrapQuotesInElement(element: HTMLElement) {
    const hasAnyQuote = (s: string) => /["“”]/.test(s);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];

    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const parent = node.parentElement;
      if (!parent) continue;
      if (parent.classList.contains('md-quote')) continue;
      if (parent.closest('pre, code')) continue;
      textNodes.push(node);
    }

    let inQuote = false;

    for (const node of textNodes) {
      const text = node.textContent ?? '';
      if (!text) continue;
      if (!hasAnyQuote(text) && !inQuote) continue;

      const frag = document.createDocumentFragment();
      let localInQuote: boolean = inQuote;
      let buffer = '';

      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const isQuoteChar = ch === '"' || ch === '“' || ch === '”';
        if (!isQuoteChar) {
          buffer += ch;
          continue;
        }

        if (buffer) {
          if (localInQuote) {
            const span = document.createElement('span');
            span.className = 'md-quote';
            span.textContent = buffer;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(buffer));
          }
          buffer = '';
        }

        const q = document.createElement('span');
        q.className = 'md-quote';
        q.textContent = ch;
        frag.appendChild(q);
        localInQuote = !localInQuote;
      }

      if (buffer) {
        if (localInQuote) {
          const span = document.createElement('span');
          span.className = 'md-quote';
          span.textContent = buffer;
          frag.appendChild(span);
        } else {
          frag.appendChild(document.createTextNode(buffer));
        }
      }

      inQuote = localInQuote;
      node.parentNode?.replaceChild(frag, node);
    }
  }

  // Wrap "quoted text" in spans for styling (DOM pass, like streaming).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      if (!/["“”]/.test(displayContent)) return;
      unwrapMdQuotes(el);
      wrapQuotesInElement(el);
    };

    apply();

    const observer = new MutationObserver(() => {
      observer.disconnect();
      apply();
      observer.observe(el, { childList: true, subtree: true, characterData: true });
    });
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [displayContent]);

  // Compute text color based on message type
  const textColor = useMemo(() => {
    if (isBot && typography.botTextColor) {
      return typography.botTextColor;
    }
    if (!isBot && typography.userTextColor) {
      return typography.userTextColor;
    }
    return typography.textColor;
  }, [isBot, typography.textColor, typography.botTextColor, typography.userTextColor]);

  // Content styles
  const contentStyle = useMemo((): CSSProperties => ({
    fontSize: typography.fontSize === 'custom' 
      ? `${typography.customFontSizePx}px` 
      : fontSizeMap[typography.fontSize],
    lineHeight: lineHeightMap[typography.lineHeight],
    fontFamily: fontFamilyMap[typography.fontFamily],
    fontWeight: fontWeightMap[typography.fontWeight],
    color: textColor,
  }), [typography.fontSize, typography.customFontSizePx, typography.lineHeight, typography.fontFamily, typography.fontWeight, textColor]);

  // Edit textarea styles
  const editStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      ...contentStyle,
      width: '100%',
      resize: 'vertical',
      minHeight: '60px',
    };
    
    if (editConfig.style === 'fullwidth') {
      base.minHeight = '120px';
    }
    
    return base;
  }, [contentStyle, editConfig.style]);

  // Suppress unused variable warning - kept for API consistency
  void _nodeId;

  if (isEditing) {
    return (
      <textarea
        className="message-content-edit"
        style={editStyle}
        value={content}
        onChange={(e) => onEditChange?.(e.target.value)}
        autoFocus
      />
    );
  }

  if (isStreaming) {
    return (
      <div ref={containerRef} className="message-content streaming" style={contentStyle}>
        <Streamdown>{displayContent}</Streamdown>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="message-content" style={contentStyle}>
      <Streamdown>{displayContent}</Streamdown>
    </div>
  );
});
