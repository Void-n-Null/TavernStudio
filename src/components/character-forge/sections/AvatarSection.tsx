/**
 * AvatarSection - Avatar image upload and preview.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, User, X } from 'lucide-react';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { showToast } from '../../ui/toast';
import { AvatarCropDialog } from './AvatarCropDialog';

interface AvatarSectionProps {
  avatarUrl: string | null;
  onAvatarChange: (file: File) => void | Promise<void>;
  onAvatarRemove: () => void | Promise<void>;
  isUploading?: boolean;
}

export function AvatarSection({ 
  avatarUrl, 
  onAvatarChange, 
  onAvatarRemove,
  isUploading 
}: AvatarSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // local preview of most recently uploaded image
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  
  const displayUrl = previewUrl || avatarUrl;

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [previewUrl, pendingUrl]);

  const pendingFileName = useMemo(() => pendingFile?.name || 'avatar.png', [pendingFile]);
  
  const openCropperForFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast({ message: 'Please select an image file', type: 'error' });
      return;
    }
    
    // Create an object URL for the cropper
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingUrl(url);
    setCropOpen(true);
  };

  const applyFile = async (file: File) => {
    // Local preview (immediate feedback, avoids server cache issues)
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Upload
    await Promise.resolve(onAvatarChange(file));

    // Close cropper + cleanup pending URL
    setCropOpen(false);
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingUrl(null);
    setPendingFile(null);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    openCropperForFile(file);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };
  
  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          openCropperForFile(file);
          return;
        }
      }
    }

    // Optional power-user: allow pasting data URLs
    const text = e.clipboardData.getData('text/plain');
    if (text?.startsWith('data:image/')) {
      e.preventDefault();
      try {
        const [meta, b64] = text.split(',');
        const mime = meta.match(/data:(image\/[^;]+);base64/)?.[1] || 'image/png';
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const file = new File([bytes], 'pasted-image', { type: mime });
        openCropperForFile(file);
      } catch {
        showToast({ message: 'Failed to paste image data', type: 'error' });
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-zinc-300">Character Avatar</div>
      
      <div className="flex items-start gap-4">
        {/* Preview */}
        <div 
          ref={dropRef}
          className={cn(
            'relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border-2 border-dashed transition-colors outline-none',
            dragActive 
              ? 'border-violet-500 bg-violet-500/10' 
              : 'border-zinc-700 bg-zinc-900/50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onPaste={handlePaste}
          tabIndex={0}
          role="button"
          aria-label="Avatar drop zone (click to upload, Ctrl+V to paste)"
          onClick={() => {
            dropRef.current?.focus();
            inputRef.current?.click();
          }}
        >
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt="Avatar preview"
                className="h-full w-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-zinc-600">
              <User className="h-10 w-10" />
              <span className="mt-1 text-xs">No image</span>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => openCropperForFile(e.target.files?.[0])}
            className="hidden"
          />
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload Image
          </Button>
          
          {displayUrl && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                if (isUploading) return;
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
                await Promise.resolve(onAvatarRemove());
              }}
              disabled={isUploading}
              className="text-red-400 hover:text-red-300"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
          
          <p className="mt-1 text-xs text-zinc-500">
            Click to upload, drag+drop, or focus and press <span className="font-mono">Ctrl+V</span>.
            <br />
            You’ll be prompted to crop before upload.
          </p>
        </div>
      </div>

      {pendingUrl && pendingFile && (
        <AvatarCropDialog
          open={cropOpen}
          imageUrl={pendingUrl}
          fileName={pendingFileName}
          onCancel={() => {
            setCropOpen(false);
            if (pendingUrl) URL.revokeObjectURL(pendingUrl);
            setPendingUrl(null);
            setPendingFile(null);
          }}
          onUseOriginal={async () => {
            if (!pendingFile) return;
            await applyFile(pendingFile);
          }}
          onApply={applyFile}
        />
      )}
    </div>
  );
}

