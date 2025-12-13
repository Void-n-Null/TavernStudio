import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ForgeMode = 'view' | 'edit' | 'create';
export type SortField = 'name' | 'updated_at' | 'created_at';
export type ViewMode = 'grid' | 'list';

interface CharacterForgeState {
  // Selection
  selectedCardId: string | null;
  mode: ForgeMode;
  
  // Filtering & Search
  searchQuery: string;
  filterTags: string[];
  sortBy: SortField;
  sortDirection: 'asc' | 'desc';
  viewMode: ViewMode;

  // Layout (UI prefs)
  gallerySidebarWidth: number;
  isGalleryFullscreen: boolean;
  
  // Actions
  selectCard: (id: string | null) => void;
  setMode: (mode: ForgeMode) => void;
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  clearFilters: () => void;
  setSortBy: (field: SortField) => void;
  toggleSortDirection: () => void;
  setViewMode: (mode: ViewMode) => void;

  setGallerySidebarWidth: (width: number) => void;
  setGalleryFullscreen: (value: boolean) => void;
  toggleGalleryFullscreen: () => void;
  
  // Convenience
  enterEditMode: (id: string) => void;
  enterCreateMode: () => void;
  exitToView: () => void;
}

const DEFAULT_GALLERY_SIDEBAR_WIDTH = 384; // matches prior lg:w-96

export const useCharacterForgeStore = create<CharacterForgeState>()(
  persist(
    (set) => ({
      selectedCardId: null,
      mode: 'view',
      searchQuery: '',
      filterTags: [],
      sortBy: 'updated_at',
      sortDirection: 'desc',
      viewMode: 'grid',

      gallerySidebarWidth: DEFAULT_GALLERY_SIDEBAR_WIDTH,
      isGalleryFullscreen: false,

      selectCard: (id) => set({ selectedCardId: id, mode: id ? 'view' : 'view' }),
      setMode: (mode) => set({ mode }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),

      toggleTag: (tag) =>
        set((state) => ({
          filterTags: state.filterTags.includes(tag)
            ? state.filterTags.filter((t) => t !== tag)
            : [...state.filterTags, tag],
        })),

      clearFilters: () => set({ searchQuery: '', filterTags: [] }),
      setSortBy: (sortBy) => set({ sortBy }),
      toggleSortDirection: () =>
        set((state) => ({
          sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
        })),
      setViewMode: (viewMode) => set({ viewMode }),

      setGallerySidebarWidth: (width) => set({ gallerySidebarWidth: width }),
      setGalleryFullscreen: (value) => set({ isGalleryFullscreen: value }),
      toggleGalleryFullscreen: () => set((s) => ({ isGalleryFullscreen: !s.isGalleryFullscreen })),

      enterEditMode: (id) => set({ selectedCardId: id, mode: 'edit' }),
      enterCreateMode: () => set({ selectedCardId: null, mode: 'create' }),
      exitToView: () => set((state) => ({ mode: state.selectedCardId ? 'view' : 'view' })),
    }),
    {
      name: 'character-forge',
      partialize: (state) => ({
        viewMode: state.viewMode,
        gallerySidebarWidth: state.gallerySidebarWidth,
        isGalleryFullscreen: state.isGalleryFullscreen,
      }),
    }
  )
);

