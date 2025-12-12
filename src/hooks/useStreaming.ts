import { useCallback, useRef } from 'react';
import { useStreamingStore, useIsStreaming, useStreamingMeta, getStreamingContent } from '../store/streamingStore';
import { useServerChat } from './queries';
import type { Speaker } from '../types/chat';
import { normalizeFencedCodeBlocks } from '../utils/streamingMarkdown';

export interface StreamingOptions {
  /** Parent message ID. Defaults to current tail_id */
  parentId?: string;
  /** Speaker: 'user', 'bot', or a specific speaker ID */
  speaker?: 'user' | 'bot' | string;
}

export interface StreamingAPI {
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Current streaming content buffer */
  content: string;
  /** Current speaker */
  speaker: Speaker | null;
  
  /** Start streaming a new message */
  start: (options?: StreamingOptions) => boolean;
  /** Append content to the stream */
  append: (chunk: string) => void;
  /** Set entire content (replaces) */
  setContent: (content: string) => void;
  /** Finalize and persist to server. Returns true on success */
  finalize: () => Promise<boolean>;
  /** Cancel streaming without persisting */
  cancel: () => void;
}

/**
 * High-level streaming API for creating streamed messages.
 * 
 * Features:
 * - Auto-selects parent (tail_id) and speaker (bot/user)
 * - Creates a real message immediately (optimistic), streams into it, then PATCHes content on finalize
 * - Uses TanStack Query for state management
 * 
 * @example
 * ```tsx
 * const streaming = useStreaming();
 * 
 * // Start a bot message at the current tail
 * streaming.start({ speaker: 'bot' });
 * 
 * // Stream tokens
 * streaming.append('Hello ');
 * streaming.append('world!');
 * 
 * // Persist to server
 * await streaming.finalize();
 * ```
 */
export function useStreaming(): StreamingAPI {
  const isStreaming = useIsStreaming();
  const meta = useStreamingMeta();
  
  const { chatId, addMessage, editMessage, deleteMessage, speakers, tailId, nodes } = useServerChat();
  
  // Refs to avoid stale closures in callbacks
  const chatIdRef = useRef(chatId);
  const addMessageRef = useRef(addMessage);
  const editMessageRef = useRef(editMessage);
  const deleteMessageRef = useRef(deleteMessage);
  const speakersRef = useRef(speakers);
  const tailIdRef = useRef(tailId);
  const nodesRef = useRef(nodes);
  chatIdRef.current = chatId;
  addMessageRef.current = addMessage;
  editMessageRef.current = editMessage;
  deleteMessageRef.current = deleteMessage;
  speakersRef.current = speakers;
  tailIdRef.current = tailId;
  nodesRef.current = nodes;

  // Track the in-flight "create empty message" request so finalize/cancel can coordinate.
  const createPromiseRef = useRef<Promise<{ id: string; created_at: number }> | null>(null);
  const createClientIdRef = useRef<string | null>(null);
  const cancelledRef = useRef(false);
  
  // Get speaker object for current ethereal message
  const currentSpeaker = meta ? speakers.get(meta.speakerId) ?? null : null;
  
  const start = useCallback((options: StreamingOptions = {}): boolean => {
    const { start: storeStart } = useStreamingStore.getState();
    const currentTailId = tailIdRef.current;
    const currentSpeakers = speakersRef.current;
    
    // Determine parent
    const parentId = options.parentId ?? currentTailId;
    if (!parentId) {
      console.warn('[useStreaming] Cannot start: no parent ID available');
      return false;
    }
    
    // Determine speaker
    let speakerId: string | undefined;
    
    if (options.speaker === 'user') {
      const userSpeaker = Array.from(currentSpeakers.values()).find(s => s.is_user);
      speakerId = userSpeaker?.id;
    } else if (options.speaker === 'bot' || options.speaker === undefined) {
      const botSpeaker = Array.from(currentSpeakers.values()).find(s => !s.is_user);
      speakerId = botSpeaker?.id;
    } else {
      // Specific speaker ID provided
      speakerId = options.speaker;
    }
    
    if (!speakerId) {
      console.warn('[useStreaming] Cannot start: no speaker found');
      return false;
    }

    // Create a client-stable id we can match against node.client_id across temp->real id replacement.
    const nodeClientId = crypto.randomUUID();

    // Start streaming state BEFORE inserting into chat so the message renders as streaming immediately.
    storeStart(parentId, speakerId, nodeClientId);

    const startedAt = useStreamingStore.getState().meta?.startedAt ?? Date.now();

    // Determine if bot message
    const speaker = currentSpeakers.get(speakerId);
    const isBot = speaker ? !speaker.is_user : true;

    // Kick off real message creation with EMPTY content (optimistic insert happens immediately).
    cancelledRef.current = false;
    createClientIdRef.current = nodeClientId;
    createPromiseRef.current = addMessageRef.current(
      parentId,
      '',
      speakerId,
      isBot,
      startedAt,
      nodeClientId
    );

    // If creation fails, clear streaming so we don't keep "typing" into nothing.
    createPromiseRef.current.catch(() => {
      const active = useStreamingStore.getState().meta;
      if (active?.nodeClientId === nodeClientId) {
        useStreamingStore.getState().cancel();
      }
    });

    console.log('[useStreaming] Started with parent:', parentId, 'speaker:', speakerId, 'clientId:', nodeClientId);
    return true;
  }, []);
  
  const append = useCallback((chunk: string): void => {
    useStreamingStore.getState().append(chunk);
  }, []);
  
  const setContent = useCallback((content: string): void => {
    useStreamingStore.getState().setContent(content);
  }, []);
  
  const finalize = useCallback(async (): Promise<boolean> => {
    const { meta } = useStreamingStore.getState();
    const currentSpeakers = speakersRef.current;
    const content = getStreamingContent();
    const normalizedContent = normalizeFencedCodeBlocks(content);
    
    if (!meta) {
      console.warn('[useStreaming] Finalize called but no streaming message');
      return false;
    }
    
    if (!normalizedContent.trim()) {
      console.warn('[useStreaming] Finalize called but message is empty');
      // Treat as cancel: delete the placeholder message.
      const clientId = meta.nodeClientId;
      useStreamingStore.getState().cancel();

      const node = Array.from(nodesRef.current.values()).find((n) => n.client_id === clientId || n.id === clientId) ?? null;
      if (node) {
        void deleteMessageRef.current(node.id).catch(() => {});
      }
      const createPromise = createPromiseRef.current;
      if (createPromise) {
        void createPromise.then((r) => deleteMessageRef.current(r.id)).catch(() => {});
      }
      createPromiseRef.current = null;
      createClientIdRef.current = null;
      return false;
    }
    
    const currentChatId = chatIdRef.current;
    if (!currentChatId) {
      console.error('[useStreaming] Cannot persist: no chat ID');
      return false;
    }
    
    // Determine if bot message
    const speaker = currentSpeakers.get(meta.speakerId);
    void speaker;
    
    try {
      // Ensure the placeholder message is created on the server before editing.
      const created = createPromiseRef.current ? await createPromiseRef.current : null;
      const nodeId = created?.id ?? null;

      if (!nodeId) {
        throw new Error('No created message id available for finalize');
      }

      // Patch the real node content.
      await editMessageRef.current(nodeId, normalizedContent);

      // Stop streaming state (message remains in chat as a normal node).
      useStreamingStore.getState().cancel();
      createPromiseRef.current = null;
      createClientIdRef.current = null;
      
      console.log('[useStreaming] ✅ Finalized message');
      return true;
    } catch (err) {
      console.error('[useStreaming] ❌ Failed to finalize:', err);
      // On failure, cancel streaming but keep the placeholder; user can delete manually.
      useStreamingStore.getState().cancel();
      createPromiseRef.current = null;
      createClientIdRef.current = null;
      return false;
    }
  }, []);
  
  const cancel = useCallback((): void => {
    const active = useStreamingStore.getState().meta;
    if (!active) return;

    const clientId = active.nodeClientId;
    cancelledRef.current = true;

    // Stop streaming immediately (UI).
    useStreamingStore.getState().cancel();

    // Remove the placeholder node from the chat tree.
    const node = Array.from(nodesRef.current.values()).find((n) => n.client_id === clientId || n.id === clientId) ?? null;
    if (node) {
      void deleteMessageRef.current(node.id).catch(() => {});
    }

    // If the server creation is still in flight, clean it up once it lands.
    const createPromise = createPromiseRef.current;
    if (createPromise) {
      void createPromise
        .then((r) => {
          if (!cancelledRef.current) return;
          return deleteMessageRef.current(r.id).then(() => {});
        })
        .catch(() => {});
    }

    createPromiseRef.current = null;
    createClientIdRef.current = null;
    console.log('[useStreaming] Cancelled');
  }, []);
  
  return {
    isStreaming,
    content: getStreamingContent(),
    speaker: currentSpeaker,
    start,
    append,
    setContent,
    finalize,
    cancel,
  };
}
