import { memo } from 'react';
import { useStreamingContent } from '../../store/streamingStore';

interface MessageContentProps {
  nodeId: string;
  content: string;
  isEditing?: boolean;
  onEditChange?: (content: string) => void;
}

/**
 * Renders message text content.
 * 
 * Streaming optimization:
 * - Subscribes to streaming store ONLY for its own nodeId
 * - When streaming, renders from streaming store (updates every chunk)
 * - When not streaming, renders from props (memoized)
 * 
 * This means: Only THIS component re-renders during streaming,
 * not MessageMeta, MessageActions, or sibling messages.
 */
export const MessageContent = memo(function MessageContent({
  nodeId,
  content,
  isEditing = false,
  onEditChange,
}: MessageContentProps) {
  // Only subscribes if this node is streaming - selector returns null otherwise
  const streamingContent = useStreamingContent(nodeId);
  
  // Use streaming content if available, otherwise use prop
  const displayContent = streamingContent ?? content;

  if (isEditing) {
    return (
      <textarea
        className="message-content-edit"
        value={displayContent}
        onChange={(e) => onEditChange?.(e.target.value)}
        autoFocus
      />
    );
  }

  return (
    <div className="message-content">
      {displayContent}
      {streamingContent !== null && <span className="streaming-cursor">▊</span>}
    </div>
  );
});
