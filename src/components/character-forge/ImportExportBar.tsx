/**
 * ImportExportBar - Import and export actions for character cards.
 */

import { useRef } from 'react';
import { Download, Copy, FileJson, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { showToast } from '../ui/toast';

interface ImportExportBarProps {
  cardId: string | null;
  hasPng: boolean;
  getRawJson: () => string;
  onImportPng: (file: File) => Promise<void>;
  onImportJson: (json: Record<string, unknown>) => Promise<void>;
  onExportPng: () => void;
  onExportJson: () => void;
  isImporting?: boolean;
}

export function ImportExportBar({
  cardId,
  hasPng,
  getRawJson,
  onImportPng,
  onImportJson,
  onExportPng,
  onExportJson,
  isImporting,
}: ImportExportBarProps) {
  const pngInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  
  const handlePngSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await onImportPng(file);
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Import failed', 
        type: 'error' 
      });
    }
    
    if (pngInputRef.current) {
      pngInputRef.current.value = '';
    }
  };
  
  const handleJsonSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await onImportJson(json);
    } catch (err) {
      showToast({ 
        message: err instanceof Error ? err.message : 'Invalid JSON file', 
        type: 'error' 
      });
    }
    
    if (jsonInputRef.current) {
      jsonInputRef.current.value = '';
    }
  };
  
  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(getRawJson());
      showToast({ message: 'Copied to clipboard', type: 'success' });
    } catch {
      showToast({ message: 'Failed to copy', type: 'error' });
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
      {/* Hidden file inputs */}
      <input
        ref={pngInputRef}
        type="file"
        accept="image/png"
        onChange={handlePngSelect}
        className="hidden"
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleJsonSelect}
        className="hidden"
      />
      
      {/* Import buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Import:</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => pngInputRef.current?.click()}
          disabled={isImporting}
          className="h-7 px-2 text-xs"
        >
          <ImageIcon className="mr-1 h-3.5 w-3.5" />
          PNG
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => jsonInputRef.current?.click()}
          disabled={isImporting}
          className="h-7 px-2 text-xs"
        >
          <FileJson className="mr-1 h-3.5 w-3.5" />
          JSON
        </Button>
      </div>
      
      <div className="mx-2 h-4 w-px bg-zinc-800" />
      
      {/* Export buttons */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-500">Export:</span>
        {hasPng && cardId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onExportPng}
            className="h-7 px-2 text-xs"
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            PNG
          </Button>
        )}
        {cardId && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onExportJson}
            className="h-7 px-2 text-xs"
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            JSON
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopyJson}
          className="h-7 px-2 text-xs"
        >
          <Copy className="mr-1 h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
    </div>
  );
}

