                            import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { chats } from '../../../api/chats';
import type { ChatNode, Speaker } from '../../../types/chat';
import { useDefaultChatId } from './defaultChat';

type UnknownArray = unknown;

const EMPTY_NODE_IDS: string[] = [];

function sameStringArray(a: UnknownArray, b: UnknownArray): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sameChatNode(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aa = a as ChatNode;
  const bb = b as ChatNode;
  if (!aa.id || !bb.id) return false;
  if (aa.id !== bb.id) return false;
  if (aa.client_id !== bb.client_id) return false;
  if (aa.parent_id !== bb.parent_id) return false;
  if (aa.active_child_index !== bb.active_child_index) return false;
  if (aa.speaker_id !== bb.speaker_id) return false;
  if (aa.message !== bb.message) return false;
  if (aa.is_bot !== bb.is_bot) return false;
  if (aa.created_at !== bb.created_at) return false;
  if (aa.updated_at !== bb.updated_at) return false;
  if (!Array.isArray(aa.child_ids) || !Array.isArray(bb.child_ids)) return false;
  if (aa.child_ids.length !== bb.child_ids.length) return false;
  for (let i = 0; i < aa.child_ids.length; i++) {
    if (aa.child_ids[i] !== bb.child_ids[i]) return false;
  }
  return true;
}

function sameSpeaker(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const aa = a as Speaker;
  const bb = b as Speaker;
  if (!aa.id || !bb.id) return false;
  return (
    aa.id === bb.id &&
    aa.name === bb.name &&
    aa.avatar_url === bb.avatar_url &&
    aa.color === bb.color &&
    aa.is_user === bb.is_user
  );
}

export function useChatActivePathNodeIds(): string[] {
  const { data: defaultChatData } = useDefaultChatId();
  const chatId = defaultChatData?.id;

  const { data } = useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    queryFn: () => chats.get(chatId!),
    enabled: !!chatId,
    notifyOnChangeProps: ['data'],
    select: (chat): string[] => {
      const rootId = chat.rootId;
      if (!rootId) return [];

      const byId = new Map(chat.nodes.map((n) => [n.id, n]));
      const ids: string[] = [];

      let currentId: string | null = rootId;
      while (currentId) {
        const node = byId.get(currentId);
        if (!node) break;
        ids.push(currentId);

        const idx = node.active_child_index;
        if (node.child_ids.length > 0 && idx !== null && idx >= 0 && idx < node.child_ids.length) {
          currentId = node.child_ids[idx];
        } else {
          currentId = null;
        }
      }

      return ids;
    },
    structuralSharing: (oldData, newData) => (sameStringArray(oldData, newData) ? oldData : newData),
  });

  return data ?? EMPTY_NODE_IDS;
}

export function useChatNode(nodeId: string | null | undefined): ChatNode | null {
  const { data: defaultChatData } = useDefaultChatId();
  const chatId = defaultChatData?.id;

  const { data } = useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    queryFn: () => chats.get(chatId!),
    enabled: !!chatId && !!nodeId,
    notifyOnChangeProps: ['data'],
    select: (chat) => chat.nodes.find((n) => n.id === nodeId) ?? null,
    structuralSharing: (oldData, newData) => (sameChatNode(oldData, newData) ? oldData : newData),
  });

  return data ?? null;
}

export function useChatSpeaker(speakerId: string | null | undefined): Speaker | null {
  const { data: defaultChatData } = useDefaultChatId();
  const chatId = defaultChatData?.id;

  const { data } = useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    queryFn: () => chats.get(chatId!),
    enabled: !!chatId && !!speakerId,
    notifyOnChangeProps: ['data'],
    select: (chat) => chat.speakers.find((s) => s.id === speakerId) ?? null,
    structuralSharing: (oldData, newData) => (sameSpeaker(oldData, newData) ? oldData : newData),
  });

  return data ?? null;
}
