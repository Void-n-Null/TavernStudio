/**
 * GreetingSection - First message and alternate greetings with swipe preview.
 */

import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, GripVertical, Maximize2, Minimize2 } from 'lucide-react';
import { MacroHighlightTextarea } from '../MacroHighlightTextarea';
import { Button } from '../../ui/button';
import { cn } from '../../../lib/utils';
import { parseMarkdown } from '../../../utils/streamingMarkdown';

interface GreetingSectionProps {
  firstMessage: string;
  alternateGreetings: string[];
  characterName: string;
  userLabel?: string;
  onChange: (field: 'first_mes' | 'alternate_greetings', value: string | string[]) => void;
}

export function GreetingSection({
  firstMessage,
  alternateGreetings,
  characterName,
  userLabel = 'User',
  onChange,
}: GreetingSectionProps) {
  const [selectedAltIndex, setSelectedAltIndex] = useState<number | null>(null);
  const [expandedFirst, setExpandedFirst] = useState(false);
  const [expandedAlt, setExpandedAlt] = useState(false);
  
  const allGreetings = [firstMessage, ...alternateGreetings];
  const [previewIndex, setPreviewIndex] = useState(0);

  const renderPreview = (text: string) => {
    const char = characterName?.trim() ? characterName.trim() : 'Character';
    const user = userLabel?.trim() ? userLabel.trim() : 'User';
    return (text || '')
      .replace(/\{\{char\}\}/gi, char)
      .replace(/\{\{user\}\}/gi, user);
  };
  
  const handleAddAlternate = () => {
    onChange('alternate_greetings', [...alternateGreetings, '']);
    setSelectedAltIndex(alternateGreetings.length);
  };
  
  const handleUpdateAlternate = (index: number, value: string) => {
    const updated = [...alternateGreetings];
    updated[index] = value;
    onChange('alternate_greetings', updated);
  };
  
  const handleRemoveAlternate = (index: number) => {
    const updated = alternateGreetings.filter((_, i) => i !== index);
    onChange('alternate_greetings', updated);
    if (selectedAltIndex === index) {
      setSelectedAltIndex(null);
    } else if (selectedAltIndex !== null && selectedAltIndex > index) {
      setSelectedAltIndex(selectedAltIndex - 1);
    }
  };

  return (
    <div className="space-y-5">
      {/* Swipe Preview */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Greeting Preview</span>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <button
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
              disabled={previewIndex === 0}
              className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {previewIndex + 1} / {allGreetings.length}
            </span>
            <button
              onClick={() => setPreviewIndex(Math.min(allGreetings.length - 1, previewIndex + 1))}
              disabled={previewIndex >= allGreetings.length - 1}
              className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="relative min-h-[100px] rounded-lg bg-zinc-950/50 p-3">
          <div className="absolute left-2 top-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {previewIndex === 0 ? 'First Message' : `Alt ${previewIndex}`}
          </div>
          <div className="pt-5">
            {allGreetings[previewIndex] ? (
              <div className="message-content text-sm">
                <div
                  dangerouslySetInnerHTML={{
                    __html: parseMarkdown(renderPreview(allGreetings[previewIndex])),
                  }}
                />
              </div>
            ) : (
              <div className="text-sm italic text-zinc-600">Empty greeting...</div>
            )}
          </div>
        </div>
        
        {/* Swipe dots */}
        {allGreetings.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {allGreetings.map((_, i) => (
              <button
                key={i}
                onClick={() => setPreviewIndex(i)}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  i === previewIndex ? 'bg-violet-500' : 'bg-zinc-700 hover:bg-zinc-600'
                )}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* First Message Editor */}
      <div className="relative">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">First Message</label>
          <button
            onClick={() => setExpandedFirst(!expandedFirst)}
            className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
            title={expandedFirst ? 'Minimize' : 'Maximize'}
          >
            {expandedFirst ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
        <MacroHighlightTextarea
          value={firstMessage}
          onChange={(v) => onChange('first_mes', v)}
          placeholder="*{{char}} waves at you* Hello there, {{user}}!"
          rows={expandedFirst ? 15 : 5}
          maxRows={expandedFirst ? 30 : 10}
        />
      </div>
      
      {/* Alternate Greetings */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-medium text-zinc-300">
            Alternate Greetings
            {alternateGreetings.length > 0 && (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                ({alternateGreetings.length})
              </span>
            )}
          </label>
          <Button size="sm" variant="outline" onClick={handleAddAlternate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Greeting
          </Button>
        </div>
        
        {alternateGreetings.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-center">
            <p className="text-sm text-zinc-500">No alternate greetings yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Add alternatives that users can swipe between when starting a chat
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alternateGreetings.map((greeting, index) => (
              <div
                key={index}
                className={cn(
                  'rounded-lg border transition-colors',
                  selectedAltIndex === index 
                    ? 'border-violet-500/50 bg-violet-500/5' 
                    : 'border-zinc-800 bg-zinc-900/30'
                )}
              >
                <div className="flex items-center gap-2 border-b border-zinc-800/50 px-3 py-2">
                  <GripVertical className="h-4 w-4 cursor-grab text-zinc-600" />
                  <span className="text-xs font-medium text-zinc-400">Alt {index + 1}</span>
                  <div className="flex-1" />
                  <button
                    onClick={() => setExpandedAlt(expandedAlt ? false : true)}
                    className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                  >
                    {expandedAlt ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleRemoveAlternate(index)}
                    className="rounded p-1 text-zinc-500 hover:bg-red-900/30 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="p-3">
                  <MacroHighlightTextarea
                    value={greeting}
                    onChange={(v) => handleUpdateAlternate(index, v)}
                    placeholder="An alternative first message..."
                    rows={expandedAlt && selectedAltIndex === index ? 10 : 3}
                    maxRows={expandedAlt ? 20 : 6}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

