import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export function PromptEngineeringModalFooter({
  isMobile,
  isDirty,
  isSaving,
  onDiscard,
  onSave,
}: {
  isMobile: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className={cn(
      "sticky bottom-0 border-t transition-all duration-300 bg-zinc-950/80 backdrop-blur-xl",
      isDirty ? "border-blue-500/30" : "border-zinc-800/40"
    )}>
      <div className={cn('p-4 flex gap-3', isMobile ? 'flex-col' : 'justify-end')}>
        <Button
          variant="outline"
          type="button"
          onClick={onDiscard}
          disabled={!isDirty}
          className={cn(
            "rounded-xl border-zinc-800 hover:bg-zinc-900 transition-all",
            isMobile && 'w-full'
          )}
        >
          Discard Changes
        </Button>
        <Button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className={cn(
            "rounded-xl px-8 transition-all",
            isDirty 
              ? "bg-blue-600 hover:bg-blue-500 text-white active:scale-95" 
              : "bg-zinc-800 text-zinc-500",
            isMobile && 'w-full'
          )}
        >
          {isSaving ? 'Saving...' : 'Save Preset'}
        </Button>
      </div>
    </div>
  );
}
