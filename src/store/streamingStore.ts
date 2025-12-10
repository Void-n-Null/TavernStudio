import { create } from 'zustand';
import { useChatStore } from './chatStore';

interface StreamingStore {
  // State
  nodeId: string | null;
  content: string;
  isStreaming: boolean;
  
  // Actions
  startStreaming: (parentId: string, speakerId: string) => string;
  appendContent: (chunk: string) => void;
  finalize: () => void;
  cancel: () => void;
}

/**
 * Separate store for streaming state.
 * 
 * Why separate?
 * - MessageContent can subscribe ONLY to `content` for the streaming node
 * - Other components (MessageMeta, MessageActions, etc.) won't re-render
 * - Chat store stays clean - only complete messages
 */
export const useStreamingStore = create<StreamingStore>((set, get) => ({
  nodeId: null,
  content: '',
  isStreaming: false,

  startStreaming: (parentId, speakerId) => {
    const chatStore = useChatStore.getState();
    
    // Create placeholder node in chat tree
    const nodeId = chatStore.addMessage(parentId, '', speakerId, true);
    
    set({
      nodeId,
      content: '',
      isStreaming: true,
    });
    
    return nodeId;
  },

  appendContent: (chunk) => {
    set((state) => ({
      content: state.content + chunk,
    }));
  },

  finalize: () => {
    const { nodeId, content } = get();
    
    if (nodeId && content) {
      // Commit final content to chat store
      useChatStore.getState().editMessage(nodeId, content);
    }
    
    set({
      nodeId: null,
      content: '',
      isStreaming: false,
    });
  },

  cancel: () => {
    const { nodeId } = get();
    
    if (nodeId) {
      // Delete the incomplete node
      useChatStore.getState().deleteMessage(nodeId);
    }
    
    set({
      nodeId: null,
      content: '',
      isStreaming: false,
    });
  },
}));

/**
 * Hook to get streaming content for a specific node.
 * Only re-renders when streaming content changes for THIS node.
 */
export function useStreamingContent(nodeId: string): string | null {
  return useStreamingStore((state) => 
    state.nodeId === nodeId ? state.content : null
  );
}

/**
 * Hook to check if a node is currently streaming.
 */
export function useIsStreaming(nodeId: string): boolean {
  return useStreamingStore((state) => state.nodeId === nodeId);
}
