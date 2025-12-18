import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Send, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';
import { useServerChat } from '../../hooks/queries';
import { useComposerConfig, useLayoutConfig } from '../../hooks/queries/useProfiles';
import { useChatComposerDraft, useChatComposerStore } from '../../store/chatComposerStore';

export function ChatComposer() {
  const layout = useLayoutConfig();
  const composer = useComposerConfig();
  const { tailId, speakers, nodes, addMessage, isAddingMessage } = useServerChat();

  const draft = useChatComposerDraft();
  const setDraft = useChatComposerStore((s) => s.setDraft);
  const undo = useChatComposerStore((s) => s.undo);
  const redo = useChatComposerStore((s) => s.redo);
  const clear = useChatComposerStore((s) => s.clear);

  const value = draft.text;
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep latest chat data in refs so event handlers can read it without forcing derived work on every render.
  const tailIdRef = useRef<string | null>(tailId);
  const nodesRef = useRef(nodes);
  const speakersRef = useRef(speakers);
  tailIdRef.current = tailId;
  nodesRef.current = nodes;
  speakersRef.current = speakers;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
  }, []);

  const userSpeakerId = useMemo(() => {
    const user = Array.from(speakers.values()).find((s) => s.is_user);
    return user?.id ?? Array.from(speakers.values())[0]?.id ?? null;
  }, [speakers]);

  const getLastUserMessage = useCallback((): string | null => {
    const currentTailId = tailIdRef.current;
    if (!currentTailId) return null;

    const nodesMap = nodesRef.current;
    const speakersMap = speakersRef.current;

    let currentId: string | null = currentTailId;
    while (currentId) {
      const node = nodesMap.get(currentId);
      if (!node) break;
      const sp = speakersMap.get(node.speaker_id);
      if (sp?.is_user && node.message.trim()) return node.message;
      currentId = node.parent_id;
    }

    return null;
  }, []);

  const isEmpty = !value.trim();

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(240, Math.max(44, el.scrollHeight));
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight]);

  const send = useCallback(async () => {
    const content = value.trim();
    if (!content) return;

    if (!tailId) {
      showToast({ message: 'No parent message available yet.', type: 'warning' });
      return;
    }

    if (!userSpeakerId) {
      showToast({ message: 'No speaker configured for sending.', type: 'warning' });
      return;
    }

    try {
      await addMessage(tailId, content, userSpeakerId, false);
      clear();
      requestAnimationFrame(() => {
        syncTextareaHeight();
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send message.';
      showToast({ message: msg, type: 'error' });
    }
  }, [addMessage, clear, syncTextareaHeight, tailId, userSpeakerId, value]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (el.value !== draft.text) return;
    const desiredStart = Math.min(draft.selectionStart, draft.text.length);
    const desiredEnd = Math.min(draft.selectionEnd, draft.text.length);
    if (el.selectionStart === desiredStart && el.selectionEnd === desiredEnd) return;
    try {
      el.setSelectionRange(desiredStart, desiredEnd);
    } catch {
      // ignore
    }
  }, [draft.selectionEnd, draft.selectionStart, draft.text]);

  const containerWidthStyle = useMemo(() => {
    return {
      width: isMobile ? '100%' : `${layout.containerWidth + 5}%`,
      margin: '0 auto',
    };
  }, [isMobile, layout.containerWidth]);

  const applyOpacityToColor = useCallback((color: string | undefined, opacity: number): string => {
    if (!color) return `rgba(0, 0, 0, ${opacity})`;
    if (color.startsWith('rgba')) {
      return color.replace(/[\d.]+\)$/, `${opacity})`);
    }
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
      const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
      const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  }, []);

  const surfaceStyle = useMemo(() => {
    const bgOpacity = (isFocused ? composer.backgroundOpacityFocused : composer.backgroundOpacity) / 100;
    const borderOpacity = (isFocused ? composer.borderOpacityFocused : composer.borderOpacity) / 100;

    const style: React.CSSProperties = {
      borderWidth: `${composer.borderWidthPx}px`,
      borderColor: applyOpacityToColor(composer.borderColor, borderOpacity),
      backgroundColor: applyOpacityToColor(composer.backgroundColor, bgOpacity),
      borderRadius: `${composer.radiusPx}px`,
      boxShadow: composer.shadowEnabled ? composer.shadowCss : 'none',
    };

    if (composer.backdropBlurPx > 0) {
      style.backdropFilter = `blur(${composer.backdropBlurPx}px)`;
      (style as any).WebkitBackdropFilter = `blur(${composer.backdropBlurPx}px)`;
    }

    return style;
  }, [applyOpacityToColor, composer, isFocused]);

  const sendButtonStyle = useMemo(() => {
    const disabled = isAddingMessage || isEmpty;

    const bgOpacity = (disabled ? composer.sendButtonBackgroundOpacityDisabled : composer.sendButtonBackgroundOpacity) / 100;
    const borderOpacity = (disabled ? composer.sendButtonBorderOpacityDisabled : composer.sendButtonBorderOpacity) / 100;
    const textOpacity = (disabled ? composer.sendButtonTextOpacityDisabled : 100) / 100;

    return {
      backgroundColor: applyOpacityToColor(composer.sendButtonBackgroundColor, bgOpacity),
      borderColor: applyOpacityToColor(composer.sendButtonBorderColor, borderOpacity),
      borderWidth: `${composer.sendButtonBorderWidthPx}px`,
      borderStyle: composer.sendButtonBorderWidthPx > 0 ? 'solid' : 'none',
      borderRadius: `${composer.sendButtonRadiusPx}px`,
      color: applyOpacityToColor(composer.sendButtonTextColor, textOpacity),
    } satisfies React.CSSProperties;
  }, [applyOpacityToColor, composer, isAddingMessage, isEmpty]);

  return (
    <div className="chat-composer w-full shrink-0 px-2 pb-3 pt-0" aria-label="Chat composer">
      <div style={containerWidthStyle}>
        <div
          className={cn(
            'chat-composer-surface border',
            'transition-all duration-150',
            isFocused ? 'chat-composer-focused' : undefined
          )}
          style={surfaceStyle}
        >
          <form
            className={cn('chat-composer-form flex items-end gap-2 p-2', !isFocused && isEmpty ? 'items-center' : 'items-end')}
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn('chat-composer-attach shrink-0', isFocused ? 'text-zinc-200' : 'text-zinc-400')}
              onClick={() => showToast({ message: 'Attachments not wired yet.', type: 'info' })}
              aria-label="Add"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1 justify-center">
              <textarea
                ref={textareaRef}
                value={value}
                placeholder="Message…"
                onChange={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'input');
                }}
                onKeyUp={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                onMouseUp={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  const mod = isMac ? e.metaKey : e.ctrlKey;

                  if (mod && (e.key === 'z' || e.key === 'Z')) {
                    e.preventDefault();
                    if (e.shiftKey) {
                      const entry = redo();
                      if (!entry) return;
                      requestAnimationFrame(() => {
                        const el = textareaRef.current;
                        if (!el) return;
                        el.focus();
                        el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                        syncTextareaHeight();
                      });
                      return;
                    }

                    const entry = undo();
                    if (!entry) return;
                    requestAnimationFrame(() => {
                      const el = textareaRef.current;
                      if (!el) return;
                      el.focus();
                      el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                      syncTextareaHeight();
                    });
                    return;
                  }

                  if (mod && (e.key === 'y' || e.key === 'Y')) {
                    e.preventDefault();
                    const entry = redo();
                    if (!entry) return;
                    requestAnimationFrame(() => {
                      const el = textareaRef.current;
                      if (!el) return;
                      el.focus();
                      el.setSelectionRange(entry.selectionStart, entry.selectionEnd);
                      syncTextareaHeight();
                    });
                    return;
                  }

                  if (e.key === 'Escape') {
                    if (value) {
                      e.preventDefault();
                      clear();
                      requestAnimationFrame(() => {
                        syncTextareaHeight();
                      });
                    }
                    return;
                  }

                  if (e.key === 'ArrowUp') {
                    const el = e.currentTarget;
                    const isAtStart = el.selectionStart === 0 && el.selectionEnd === 0;
                    const lastUserMessage = getLastUserMessage();
                    if (isAtStart && !value.trim() && lastUserMessage) {
                      e.preventDefault();
                      setDraft(lastUserMessage, lastUserMessage.length, lastUserMessage.length, 'shortcut');
                      requestAnimationFrame(() => {
                        el.setSelectionRange(lastUserMessage.length, lastUserMessage.length);
                        syncTextareaHeight();
                      });
                    }
                    return;
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    if (isMobile && composer.sendButtonType !== 'hidden') {
                      return;
                    }
                    e.preventDefault();
                    void send();
                  }
                }}
                onSelect={(e) => {
                  const el = e.currentTarget;
                  setDraft(el.value, el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length, 'selection');
                }}
                rows={1}
                className={cn(
                  'chat-composer-textarea w-full resize-none bg-transparent px-2 py-2 text-sm text-zinc-100 outline-none',
                  'placeholder:text-zinc-500',
                  'leading-6',
                  isFocused || !isEmpty ? 'min-h-[44px]' : 'h-[44px] overflow-hidden'
                )}
                style={{ maxHeight: 240 }}
                aria-label="Message input"
              />
            </div>

            {composer.sendButtonType === 'hidden' ? null : (
              <Button
                type="submit"
                variant={isEmpty ? 'secondary' : 'default'}
                size={composer.sendButtonType === 'icon' ? 'icon' : 'default'}
                className={cn('chat-composer-send shrink-0', isEmpty ? 'opacity-70' : undefined)}
                disabled={isAddingMessage || isEmpty}
                aria-label="Send"
                style={sendButtonStyle}
              >
                {composer.sendButtonType === 'icon' ? (
                  composer.sendButtonIconSvg ? (
                    <div
                      className="flex h-4 w-4 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: composer.sendButtonIconSvg }}
                    />
                  ) : (
                    <Send className="h-4 w-4" />
                  )
                ) : (
                  <span>Send</span>
                )}
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
