import { useEffect } from 'react';
import { MessageList } from './components/chat';
import { generateDemoData } from './utils/generateDemoData';
import { useStreamingStore } from './store/streamingStore';
import { useChatStore } from './store/chatStore';

/**
 * Root application component.
 * 
 * Single responsibility: App shell layout and initialization.
 */
export function App() {
  useEffect(() => {
    generateDemoData();
  }, []);

  return (
    <div className="app">
      <MessageList />
      <StreamingDemo />
    </div>
  );
}

/**
 * Temporary demo component for testing streaming.
 * Press 'S' to start streaming, 'Enter' to finalize, 'Escape' to cancel.
 */
function StreamingDemo() {
  const { isStreaming, startStreaming, appendContent, finalize, cancel } = useStreamingStore();
  const tailId = useChatStore((s) => s.tail_id);
  const speakers = useChatStore((s) => s.speakers);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 'S' to start streaming
      if (e.key === 's' && !isStreaming && !e.ctrlKey && !e.metaKey) {
        if (!tailId) return;
        
        // Find bot speaker
        const botSpeaker = Array.from(speakers.values()).find((s) => !s.is_user);
        if (!botSpeaker) return;

        startStreaming(tailId, botSpeaker.id);
        
        // Simulate streaming tokens
        const text = "This is a streaming message that appears token by token to test that only MessageContent re-renders, not the entire message tree. Watch react-scan to verify minimal re-renders! ";
        let index = 0;
        
        const interval = setInterval(() => {
          if (index < text.length) {
            appendContent(text[index]);
            index++;
          } else {
            clearInterval(interval);
          }
        }, 30);
        
        // Store interval for cleanup
        (window as any).__streamingInterval = interval;
      }
      
      // Enter to finalize
      if (e.key === 'Enter' && isStreaming) {
        clearInterval((window as any).__streamingInterval);
        finalize();
      }
      
      // Escape to cancel
      if (e.key === 'Escape' && isStreaming) {
        clearInterval((window as any).__streamingInterval);
        cancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStreaming, tailId, speakers, startStreaming, appendContent, finalize, cancel]);

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      right: 16,
      padding: '8px 12px',
      background: 'rgba(0,0,0,0.8)',
      borderRadius: 8,
      fontSize: 12,
      color: '#888',
    }}>
      {isStreaming ? (
        <span>Streaming... [Enter] finalize | [Esc] cancel</span>
      ) : (
        <span>Press [S] to test streaming</span>
      )}
    </div>
  );
}
