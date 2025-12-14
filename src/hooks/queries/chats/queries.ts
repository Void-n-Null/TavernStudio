import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { chats } from '../../../api/client';

export function useChatList() {
  return useQuery({
    queryKey: queryKeys.chats.list(),
    queryFn: () => chats.list(),
  });
}

export function useChat(chatId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.chats.detail(chatId ?? ''),
    queryFn: () => chats.get(chatId!),
    enabled: !!chatId,
  });
}
