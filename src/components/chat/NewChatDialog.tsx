/**
 * NewChatDialog - Modal dialog for creating a new chat.
 * 
 * Allows user to:
 * - Enter a chat name
 * - Select one or more characters (required)
 * - Optionally select a persona/profile
 * 
 * Creates initial messages with character's first_mes and alternate_greetings.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { CharacterPicker } from './CharacterPicker';
import { useCreateChat } from '../../hooks/queries/chats';
import { useProfileList } from '../../hooks/queries/profiles';
import { useCharacterCards } from '../../hooks/queries/useCharacterCards';
import { characterCards } from '../../api/characterCards';
import { chats } from '../../api/chats';
import { showToast } from '../ui/toast';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Extract first_mes and alternate_greetings from character card raw_json
function extractGreetings(rawJson: string): { firstMessage: string; alternates: string[] } {
  try {
    const parsed = JSON.parse(rawJson);
    // V2/V3 cards have data.first_mes, V1 has first_mes at root
    const data = parsed?.data ?? parsed;
    const firstMessage = String(data?.first_mes ?? '').trim();
    const alternates = Array.isArray(data?.alternate_greetings) 
      ? data.alternate_greetings.filter((g: unknown) => typeof g === 'string' && g.trim())
      : [];
    return { firstMessage, alternates };
  } catch {
    return { firstMessage: '', alternates: [] };
  }
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const navigate = useNavigate();
  const createChat = useCreateChat();
  const { data: profiles } = useProfileList();
  const { data: characters } = useCharacterCards();

  const [chatName, setChatName] = useState('');
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setChatName('');
      setSelectedCharacterIds([]);
      setSelectedPersonaId(null);
      setIsCreating(false);
    }
  }, [open]);

  // Auto-generate chat name based on selected characters
  useEffect(() => {
    if (selectedCharacterIds.length === 0 || chatName.trim()) return;
    
    const selectedNames = selectedCharacterIds
      .map((id) => characters?.find((c) => c.id === id)?.name)
      .filter(Boolean);
    
    if (selectedNames.length > 0) {
      if (selectedNames.length === 1) {
        setChatName(`Chat with ${selectedNames[0]}`);
      } else if (selectedNames.length === 2) {
        setChatName(`Chat with ${selectedNames[0]} & ${selectedNames[1]}`);
      } else {
        setChatName(`Chat with ${selectedNames[0]} & ${selectedNames.length - 1} others`);
      }
    }
  }, [selectedCharacterIds, characters, chatName]);

  const handleCreate = async () => {
    if (selectedCharacterIds.length === 0) {
      showToast({ message: 'Please select at least one character', type: 'error' });
      return;
    }

    const name = chatName.trim() || 'New Chat';
    setIsCreating(true);

    try {
      // 1. Create the chat
      const newChat = await createChat.mutateAsync({
        name,
        character_ids: selectedCharacterIds,
        persona_id: selectedPersonaId || undefined,
      });

      // 2. Create a user speaker for the conversation
      // Use selected profile name or default to "User"
      const selectedProfile = profiles?.find(p => p.id === selectedPersonaId);
      const userName = selectedProfile?.name || 'User';
      await createUserSpeaker(userName);

      // 3. For each selected character, fetch their card and add initial message(s)
      for (const charId of selectedCharacterIds) {
        try {
          // Get character metadata for name and avatar info
          const charMeta = characters?.find(c => c.id === charId);
          if (!charMeta) continue;
          
          // Fetch the full character card to get raw_json
          const card = await characterCards.get(charId);
          const { firstMessage } = extractGreetings(card.raw_json);
          
          if (firstMessage) {
            // Create a speaker for this character with their avatar
            const speakerId = await createCharacterSpeaker(
              charId, 
              charMeta.name, 
              Boolean(charMeta.has_png)
            );
            
            // Add first message as a root node (parentId = null)
            await chats.addMessage(newChat.id, null, firstMessage, speakerId, true);
          }
        } catch (err) {
          console.error(`Failed to add initial message for character ${charId}:`, err);
          // Continue with other characters
        }
      }

      onOpenChange(false);
      showToast({ message: 'Chat created!', type: 'success' });
      navigate(`/chats/${newChat.id}`);
    } catch (err) {
      showToast({
        message: err instanceof Error ? err.message : 'Failed to create chat',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canCreate = selectedCharacterIds.length > 0 && !isCreating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
              <MessageSquarePlus className="h-4 w-4 text-violet-400" />
            </div>
            New Chat
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Start a conversation with one or more characters
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-6 py-4">
          {/* Chat Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-300">
              Chat Name
            </label>
            <input
              type="text"
              placeholder="Enter a name for this chat..."
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 backdrop-blur-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {/* Character Selection */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Sparkles className="h-4 w-4 text-violet-400" />
              Select Characters
              <span className="text-violet-400">*</span>
            </label>
            <CharacterPicker
              selectedIds={selectedCharacterIds}
              onSelectionChange={setSelectedCharacterIds}
              minSelection={1}
            />
          </div>

          {/* Persona Selection (optional) */}
          {profiles && profiles.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-300">
                Your Persona{' '}
                <span className="text-xs font-normal text-zinc-500">(optional)</span>
              </label>
              <select
                value={selectedPersonaId || ''}
                onChange={(e) => setSelectedPersonaId(e.target.value || null)}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-200 backdrop-blur-sm focus:border-violet-500/50 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                <option value="">No persona</option>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                    {profile.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-zinc-500">
                Choose a profile to use as your identity in this chat
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800/50 bg-zinc-900/30 px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!canCreate}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/20 transition-all hover:bg-violet-500 hover:shadow-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isCreating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Creating...
              </>
            ) : (
              <>
                <MessageSquarePlus className="h-4 w-4" />
                Create Chat
              </>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to create a speaker for a character (is_user: false)
async function createCharacterSpeaker(
  characterId: string, 
  characterName: string,
  hasPng: boolean
): Promise<string> {
  // Create new speaker for this character
  // Use the character's avatar URL if they have one
  const avatarUrl = hasPng ? `/api/character-cards/${characterId}/avatar` : undefined;
  
  const res = await fetch('/api/speakers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: characterName,
      avatar_url: avatarUrl,
      is_user: false,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to create speaker for character');
  }

  const speaker = await res.json();
  return speaker.id;
}

// Helper to create a user speaker (is_user: true)
async function createUserSpeaker(userName: string): Promise<string> {
  const res = await fetch('/api/speakers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: userName,
      is_user: true,
      // Could add avatar URL here if profiles have avatars
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to create user speaker');
  }

  const speaker = await res.json();
  return speaker.id;
}
