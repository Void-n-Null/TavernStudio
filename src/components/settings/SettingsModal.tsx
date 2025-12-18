/**
 * Settings Modal - Central hub for application settings and design customization
 */

import { useState, useRef, useEffect, startTransition, useCallback, useMemo } from 'react';
import { User, Settings2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Dialog, DialogContent } from '../ui/dialog';
import { useActiveMessageStyle } from '../../hooks/queries/useProfiles';
import { interfaceDesignSections } from './interfaceDesignSchema';
import { useSettingsModalState } from '../../store/settingsModalState';
import { useShallow } from 'zustand/react/shallow';

// Extracted components
import { MobileSectionNav } from './MobileSectionNav';
import { SectionContent } from './SectionContent';
import { SearchResults } from './SearchResults';
import { ConfirmDialog } from './ConfirmDialog';
import { ProfileSection } from './ProfileSection';
import { GeneralSettings } from './GeneralSettings';
import { SettingsHeader } from './SettingsHeader';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsMobileHeader } from './SettingsMobileHeader';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const isMobile = useIsMobile();
  const {
    activeSection,
    searchQuery,
    compactMode,
    setActiveSection,
    setSearchQuery,
    toggleCompactMode,
  } = useSettingsModalState(
    useShallow((s) => ({
      activeSection: s.activeSection,
      searchQuery: s.searchQuery,
      compactMode: s.compactMode,
      setActiveSection: s.setActiveSection,
      setSearchQuery: s.setSearchQuery,
      toggleCompactMode: s.toggleCompactMode,
    }))
  );
  
  const scrollRef = useRef<HTMLElement>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const activeSectionRef = useRef(activeSection);
  activeSectionRef.current = activeSection;
  
  // Define categories for the sidebar
  const categories = useMemo(() => [
    {
      id: 'app',
      label: 'App Settings',
      sections: [
        { id: 'profiles', label: 'Profiles', icon: User, description: 'Manage and switch style profiles' },
        { id: 'general', label: 'General', icon: Settings2, description: 'Application-wide settings' },
      ]
    },
    {
      id: 'design',
      label: 'Interface Design',
      sections: interfaceDesignSections.map(s => ({
        id: s.id,
        label: s.label,
        icon: s.icon,
        description: s.description
      }))
    }
  ], []);

  const allSections = useMemo(() => categories.flatMap(c => c.sections), [categories]);

  // Keyboard shortcut for search (Ctrl+K / Cmd+K)
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchExpanded(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  
  // Arrow key navigation in sidebar
  useEffect(() => {
    if (!open || searchExpanded) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const sectionIds = allSections.map(s => s.id);
        const currentIndex = sectionIds.indexOf(activeSectionRef.current);
        const nextIndex = e.key === 'ArrowDown' 
          ? Math.min(currentIndex + 1, sectionIds.length - 1)
          : Math.max(currentIndex - 1, 0);
        startTransition(() => setActiveSection(sectionIds[nextIndex]));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, searchExpanded, setActiveSection, allSections]);
  
  const { config, isLoading, isPending, updateConfig } = useActiveMessageStyle();
  
  const handleChange = useCallback((key: string, value: unknown) => {
    const parts = key.split('.');
    if (parts.length === 2) {
      const [section, prop] = parts;
      updateConfig({ [section]: { [prop]: value } });
    }
  }, [updateConfig]);

  if (isLoading || !config) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullscreen={isMobile}>
          <div className="flex items-center justify-center h-80 text-zinc-500">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const configRecord = config as unknown as Record<string, unknown>;

  const renderContent = () => {
    if (searchExpanded && searchQuery) {
      return (
        <SearchResults
          query={searchQuery}
          config={configRecord}
          onChange={handleChange}
          isMobile={isMobile}
          onNavigate={(sectionId) => {
            startTransition(() => setActiveSection(sectionId));
            setSearchExpanded(false);
            setSearchQuery('');
          }}
        />
      );
    }

    if (activeSection === 'profiles') {
      return <ProfileSection />;
    }

    if (activeSection === 'general') {
      return <GeneralSettings />;
    }

    const designSection = interfaceDesignSections.find(s => s.id === activeSection);
    if (designSection) {
      return (
        <SectionContent
          sectionId={designSection.id}
          compactMode={compactMode}
          config={configRecord}
          onChange={handleChange}
          section={designSection}
          isMobile={isMobile}
        />
      );
    }

    return null;
  };

  // Mobile layout
  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent fullscreen className="p-0 gap-0 overflow-hidden flex flex-col">
          <SettingsMobileHeader
            compactMode={compactMode}
            toggleCompactMode={toggleCompactMode}
            isPending={isPending}
          />

          <MobileSectionNav allSections={allSections} />

          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 bg-zinc-950/20"
          >
            {renderContent()}
          </main>
          
          <ConfirmDialog />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 overflow-hidden flex flex-col h-[85vh] max-w-5xl">
        <SettingsHeader
          compactMode={compactMode}
          toggleCompactMode={toggleCompactMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchExpanded={searchExpanded}
          setSearchExpanded={setSearchExpanded}
          isPending={isPending}
        />

        <div className="flex flex-1 min-h-0">
          <SettingsSidebar
            categories={categories}
            activeSection={activeSection}
            setActiveSection={setActiveSection}
            setSearchExpanded={setSearchExpanded}
            setSearchQuery={setSearchQuery}
          />

          <main 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 bg-zinc-950/20"
          >
            {renderContent()}
          </main>
        </div>
        
        <ConfirmDialog />
      </DialogContent>
    </Dialog>
  );
}
