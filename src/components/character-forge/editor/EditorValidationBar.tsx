import { memo, useEffect, useRef, useState } from 'react';
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../../store/characterEditorStore';
import { ValidationBadge } from '../ValidationBadge';
import { computeEditorMessages, shallowEqualEditorMessages } from './utils';

export const EditorValidationBar = memo(function EditorValidationBar() {
  const [messages, setMessages] = useState(() => computeEditorMessages(getCharacterEditorDraftSnapshot()));
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const computeNow = () => {
      const next = computeEditorMessages(getCharacterEditorDraftSnapshot());
      setMessages((prev) => (shallowEqualEditorMessages(prev, next) ? prev : next));
    };
    computeNow();

    const unsub = useCharacterEditorStore.subscribe(
      (s) => s.dirtyVersion,
      () => {
        if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
        debounceRef.current = window.setTimeout(() => {
          debounceRef.current = null;
          computeNow();
        }, 200);
      }
    );

    return () => {
      unsub();
      if (debounceRef.current != null) window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    };
  }, []);

  if (messages.length === 0) return null;

  return (
    <div className="shrink-0 px-6 py-3">
      <ValidationBadge messages={messages} />
    </div>
  );
});

