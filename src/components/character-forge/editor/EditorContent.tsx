import { AvatarSection } from '../sections/AvatarSection';
import {
  CoreSectionFields,
  GreetingsSectionFields,
  ExamplesSectionFields,
  PromptsSectionFields,
  MetadataSectionFields,
  NoteSectionFields
} from './SectionFields';
import { EditorInsightsSidebar } from './EditorInsightsSidebar';
import type { EditorSection } from './types';

interface EditorContentProps {
  activeSection: EditorSection;
  avatarUrl: string | null;
  onAvatarChange: (file: File) => Promise<void>;
  onAvatarRemove: () => void;
  isAvatarActionLoading: boolean;
}

export function EditorContent({
  activeSection,
  avatarUrl,
  onAvatarChange,
  onAvatarRemove,
  isAvatarActionLoading,
}: EditorContentProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            {activeSection === 'core' && (
              <div className="space-y-6">
                <AvatarSection
                  avatarUrl={avatarUrl}
                  onAvatarChange={onAvatarChange}
                  onAvatarRemove={onAvatarRemove}
                  isUploading={isAvatarActionLoading}
                />

                <CoreSectionFields />
              </div>
            )}
            
            {activeSection === 'greetings' && <GreetingsSectionFields />}
            {activeSection === 'examples' && <ExamplesSectionFields />}
            {activeSection === 'prompts' && <PromptsSectionFields />}
            {activeSection === 'metadata' && <MetadataSectionFields />}
            {activeSection === 'note' && <NoteSectionFields />}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-4 self-start">
            <EditorInsightsSidebar />
          </aside>
        </div>
      </div>
    </div>
  );
}

