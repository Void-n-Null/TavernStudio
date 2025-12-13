/**
 * Character Forge - The creative heart of TavernStudio.
 * 
 * Combines library browsing, character display, and editing into one
 * spectacular experience. When users land here, they should feel like creators.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useCharacterForgeStore } from '../store/characterForgeStore';
import { CharacterGalleryHeader } from '../components/character-forge/CharacterGalleryHeader';
import { CharacterGalleryGrid } from '../components/character-forge/CharacterGalleryGrid';
import { CharacterDetailPanel } from '../components/character-forge/CharacterDetailPanel';
import { CharacterEditor } from '../components/character-forge/CharacterEditor';
import { ToastContainer } from '../components/ui/toast';

const DEFAULT_GALLERY_WIDTH = 384; // matches prior lg:w-96
const GALLERY_MIN_WIDTH = 260;
const GALLERY_HARD_MAX_WIDTH = 860;
const DETAIL_MIN_WIDTH = 360;

export function CharacterForge() {
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const layoutRef = useRef<HTMLDivElement>(null);
  const resizePointerIdRef = useRef<number | null>(null);
  
  const {
    selectedCardId,
    mode,
    selectCard,
    setMode,
    enterEditMode,
    gallerySidebarWidth,
    setGallerySidebarWidth,
    isGalleryFullscreen,
    setGalleryFullscreen,
  } = useCharacterForgeStore();
  
  // Sync URL params to store state
  useEffect(() => {
    const isEditRoute = location.pathname.endsWith('/edit');
    
    if (id) {
      if (selectedCardId !== id) {
        selectCard(id);
      }
      if (isEditRoute && mode !== 'edit') {
        setMode('edit');
      } else if (!isEditRoute && mode === 'edit') {
        setMode('view');
      }

      // If you land on a specific character (deep-link), gallery-fullscreen makes no sense.
      if (isGalleryFullscreen) setGalleryFullscreen(false);
    } else {
      if (selectedCardId !== null) {
        selectCard(null);
      }
    }
  }, [id, location.pathname, selectedCardId, mode, selectCard, setMode, isGalleryFullscreen, setGalleryFullscreen]);

  // Fullscreen gallery is for browsing. If you actually select/edit/create, drop back to split view.
  useEffect(() => {
    if (!isGalleryFullscreen) return;
    if (mode !== 'view') setGalleryFullscreen(false);
  }, [isGalleryFullscreen, mode, setGalleryFullscreen]);

  // If we ever leave the page mid-drag, don't strand the browser in "no-select + col-resize".
  useEffect(() => {
    return () => {
      resizePointerIdRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, []);
  
  // Navigate when store state changes (for programmatic navigation)
  const handleSelectCard = (cardId: string | null) => {
    if (cardId) {
      // Clicking a character should undo fullscreen browsing.
      if (isGalleryFullscreen) setGalleryFullscreen(false);
      navigate(`/forge/${cardId}`);
    } else {
      navigate('/forge');
    }
  };
  
  const handleEditCard = (cardId: string) => {
    if (isGalleryFullscreen) setGalleryFullscreen(false);
    enterEditMode(cardId);
    navigate(`/forge/${cardId}/edit`);
  };
  
  const handleExitEdit = () => {
    if (selectedCardId) {
      navigate(`/forge/${selectedCardId}`);
    } else {
      navigate('/forge');
    }
  };
  
  const handleCreateNew = () => {
    if (isGalleryFullscreen) setGalleryFullscreen(false);
    setMode('create');
  };

  const clampGalleryWidth = useCallback((nextWidth: number) => {
    const rect = layoutRef.current?.getBoundingClientRect();
    const dynamicMax = rect ? Math.floor(rect.width - DETAIL_MIN_WIDTH) : GALLERY_HARD_MAX_WIDTH;
    const maxWidth = Math.max(GALLERY_MIN_WIDTH, Math.min(GALLERY_HARD_MAX_WIDTH, dynamicMax));
    return Math.min(maxWidth, Math.max(GALLERY_MIN_WIDTH, Math.floor(nextWidth)));
  }, []);

  const handleResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isGalleryFullscreen) return;
    resizePointerIdRef.current = e.pointerId;
    e.preventDefault();
    e.stopPropagation();

    // Capture pointer so we keep receiving move/up even if the cursor leaves the handle.
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [isGalleryFullscreen]);

  const handleResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerIdRef.current == null) return;
    if (e.pointerId !== resizePointerIdRef.current) return;
    const rect = layoutRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = clampGalleryWidth(e.clientX - rect.left);
    setGallerySidebarWidth(next);
  }, [clampGalleryWidth, setGallerySidebarWidth]);

  const endResize = useCallback(() => {
    resizePointerIdRef.current = null;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }, []);

  const handleResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerIdRef.current == null) return;
    if (e.pointerId !== resizePointerIdRef.current) return;
    endResize();
  }, [endResize]);

  const handleResizePointerCancel = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (resizePointerIdRef.current == null) return;
    if (e.pointerId !== resizePointerIdRef.current) return;
    endResize();
  }, [endResize]);

  return (
    <div className="forge-page flex h-screen flex-col overflow-hidden bg-zinc-950">
      {/* Atmospheric background */}
      <div 
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 80, 200, 0.15), transparent),
            radial-gradient(ellipse 60% 40% at 80% 100%, rgba(80, 120, 200, 0.1), transparent),
            linear-gradient(to bottom, #09090b, #0c0c10)
          `,
        }}
      />
      
      {/* Main content */}
      <div ref={layoutRef} className="relative z-10 flex h-full min-w-0">
        {/* Left Panel: Gallery */}
        <div
          className={
            isGalleryFullscreen
              ? 'relative flex flex-1 flex-col bg-zinc-950/80 backdrop-blur-sm'
              : 'relative flex shrink-0 flex-col border-r border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm'
          }
          style={isGalleryFullscreen ? undefined : { width: gallerySidebarWidth }}
        >
          <CharacterGalleryHeader onCreateNew={handleCreateNew} />
          <CharacterGalleryGrid
            selectedId={selectedCardId}
            onSelect={handleSelectCard}
            onEdit={handleEditCard}
          />

          {/* Drag handle */}
          {!isGalleryFullscreen && (
            <div
              className="group absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none"
              onDoubleClick={() => setGallerySidebarWidth(clampGalleryWidth(DEFAULT_GALLERY_WIDTH))}
              onPointerDown={handleResizePointerDown}
              onPointerMove={handleResizePointerMove}
              onPointerUp={handleResizePointerUp}
              onPointerCancel={handleResizePointerCancel}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize gallery sidebar"
              tabIndex={0}
            >
              <div className="absolute right-0 top-0 h-full w-px bg-zinc-800/60 group-hover:bg-violet-500/40" />
            </div>
          )}
        </div>
        
        {/* Right Panel: Detail or Editor */}
        {!isGalleryFullscreen && (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {mode === 'create' ? (
            <CharacterEditor
              cardId={null}
              onClose={() => setMode('view')}
              onSaved={(newId) => {
                // After first save, stay in the editor (edit route) so users can keep saving.
                enterEditMode(newId);
                navigate(`/forge/${newId}/edit`);
              }}
            />
          ) : mode === 'edit' && selectedCardId ? (
            <CharacterEditor
              cardId={selectedCardId}
              onClose={handleExitEdit}
              // Saving should not exit editing; keep the user in-place.
              onSaved={() => {}}
            />
          ) : selectedCardId ? (
            <CharacterDetailPanel
              cardId={selectedCardId}
              onEdit={() => handleEditCard(selectedCardId)}
              onClose={() => handleSelectCard(null)}
            />
          ) : (
            <EmptyState onCreateNew={handleCreateNew} />
          )}
        </div>
        )}
      </div>
      
      <ToastContainer />
    </div>
  );
}

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div 
        className="mb-6 text-8xl opacity-20"
        style={{ 
          fontFamily: '"Instrument Serif", Georgia, serif',
          background: 'linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        ⚔
      </div>
      <h2 
        className="mb-3 text-3xl font-bold tracking-tight text-zinc-100"
        style={{ fontFamily: '"Instrument Serif", Georgia, serif' }}
      >
        The Forge Awaits
      </h2>
      <p className="mb-8 max-w-md text-sm leading-relaxed text-zinc-500">
        Select a character from your collection to view their details, 
        or forge a new creation from scratch.
      </p>
      <button
        onClick={onCreateNew}
        className="group relative overflow-hidden rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
      >
        <span className="relative z-10">Create New Character</span>
        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
      </button>
    </div>
  );
}

