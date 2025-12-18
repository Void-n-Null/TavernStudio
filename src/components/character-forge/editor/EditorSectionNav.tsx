import { memo, useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import { getCharacterEditorDraftSnapshot, useCharacterEditorStore } from '../../../store/characterEditorStore';
import type { ValidationLevel } from '../ValidationBadge';
import { type EditorSection, SECTIONS } from './types';
import { computeSectionIssueSummary, shallowEqualSectionIssueSummary } from './utils';

interface EditorSectionNavProps {
  activeSection: EditorSection;
  setActiveSection: (section: EditorSection) => void;
}

export const EditorSectionNav = memo(function EditorSectionNav({
  activeSection,
  setActiveSection,
}: EditorSectionNavProps) {
  const [sectionIssueSummary, setSectionIssueSummary] = useState<
    Partial<Record<EditorSection, { count: number; worst: ValidationLevel }>>
  >(() => computeSectionIssueSummary(getCharacterEditorDraftSnapshot()));

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const computeNow = () => {
      const next = computeSectionIssueSummary(getCharacterEditorDraftSnapshot());
      setSectionIssueSummary((prev) => (shallowEqualSectionIssueSummary(prev, next) ? prev : next));
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

  return (
    <nav className="w-44 shrink-0 border-r border-zinc-800/50 bg-zinc-950/60 p-2 overflow-y-auto">
      {SECTIONS.map((section) => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          aria-current={activeSection === section.id ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            activeSection === section.id
              ? 'bg-violet-500/20 text-violet-300'
              : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          )}
        >
          <section.icon className="h-4 w-4" />
          <span className="flex-1 text-left">{section.label}</span>
          {sectionIssueSummary[section.id]?.count ? (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                sectionIssueSummary[section.id]?.worst === 'error'
                  ? 'bg-red-500/15 text-red-300'
                  : sectionIssueSummary[section.id]?.worst === 'warning'
                    ? 'bg-amber-500/15 text-amber-300'
                    : sectionIssueSummary[section.id]?.worst === 'info'
                      ? 'bg-blue-500/15 text-blue-300'
                      : 'bg-zinc-800/60 text-zinc-300'
              )}
              title={`${sectionIssueSummary[section.id]?.count} issue(s)`}
            >
              {sectionIssueSummary[section.id]?.count}
            </span>
          ) : null}
        </button>
      ))}
    </nav>
  );
});

