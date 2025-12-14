import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../../lib/queryClient';
import { chats, type ChatMeta, type ChatFull } from '../../../api/client';
import type { ChatNode } from '../../../types/chat';

export function useCreateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => chats.create(name),
    onSuccess: (newChat) => {
      queryClient.setQueryData<ChatMeta[]>(queryKeys.chats.list(), (old) => (old ? [newChat, ...old] : [newChat]));
    },
  });
}

export function useUpdateChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => chats.update(id, name),
    onSuccess: (_, { id, name }) => {
      queryClient.setQueryData<ChatMeta[]>(queryKeys.chats.list(), (old) => old?.map((c) => (c.id === id ? { ...c, name } : c)));
      queryClient.invalidateQueries({ queryKey: queryKeys.chats.detail(id) });
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => chats.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<ChatMeta[]>(queryKeys.chats.list(), (old) => old?.filter((c) => c.id !== id));
      queryClient.removeQueries({ queryKey: queryKeys.chats.detail(id) });
    },
  });
}

export function useAddMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      parentId: string | null;
      content: string;
      speakerId: string;
      isBot: boolean;
      createdAt?: number;
      id?: string;
    }) => chats.addMessage(chatId, params.parentId, params.content, params.speakerId, params.isBot, params.createdAt, params.id),

    onMutate: (params) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });

      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));

      const tempId = params.id ?? `__temp_${crypto.randomUUID()}`;

      if (previous) {
        const createdAt = params.createdAt ?? Date.now();

        const newNode: ChatNode = {
          id: tempId,
          client_id: tempId,
          parent_id: params.parentId,
          child_ids: [],
          active_child_index: null,
          speaker_id: params.speakerId,
          message: params.content,
          is_bot: params.isBot,
          created_at: createdAt,
        };

        const updatedNodes = previous.nodes.map((node) => {
          if (node.id === params.parentId) {
            return {
              ...node,
              child_ids: [...node.child_ids, tempId],
              active_child_index: node.child_ids.length,
            };
          }
          return node;
        });

        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: [...updatedNodes, newNode],
          tailId: tempId,
        });
      }

      return { previous, tempId };
    },

    onSuccess: (response, params, context) => {
      const realId = response.id;
      const realCreatedAt = response.created_at;
      const tempId = context?.tempId;
      if (!tempId) return;

      queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), (current) => {
        if (!current) return current as any;

        if (realId === tempId) {
          return {
            ...current,
            nodes: current.nodes.map((node) =>
              node.id === realId ? { ...node, created_at: realCreatedAt, client_id: node.client_id ?? tempId } : node
            ),
          };
        }

        return {
          ...current,
          nodes: current.nodes.map((node) => {
            if (node.id === tempId) {
              return { ...node, id: realId, created_at: realCreatedAt, client_id: node.client_id ?? tempId };
            }
            if (node.id === params.parentId) {
              return {
                ...node,
                child_ids: node.child_ids.map((cid) => (cid === tempId ? realId : cid)),
              };
            }
            return node;
          }),
          tailId: current.tailId === tempId ? realId : current.tailId,
        };
      });
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}

export function useEditMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, content }: { nodeId: string; content: string }) => chats.editMessage(chatId, nodeId, content),

    onMutate: async ({ nodeId, content }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });

      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));

      if (previous) {
        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: previous.nodes.map((node) => (node.id === nodeId ? { ...node, message: content, updated_at: Date.now() } : node)),
        });
      }

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}

export function useDeleteMessage(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nodeId: string) => {
      if (nodeId.startsWith('__temp_')) {
        return Promise.resolve({ success: true });
      }
      return chats.deleteMessage(chatId, nodeId);
    },

    onMutate: (nodeId) => {
      void queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });

      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));

      if (previous) {
        const deletedNode = previous.nodes.find((n) => n.id === nodeId || n.client_id === nodeId) ?? null;
        const targetId = deletedNode?.id ?? nodeId;

        const toDelete = new Set<string>();
        const collectDescendants = (id: string) => {
          toDelete.add(id);
          const node = previous.nodes.find((n) => n.id === id);
          node?.child_ids.forEach(collectDescendants);
        };
        collectDescendants(targetId);

        const parentId = deletedNode?.parent_id ?? null;

        const updatedNodes = previous.nodes
          .filter((n) => !toDelete.has(n.id))
          .map((node) => {
            if (node.id === parentId) {
              const newChildIds = node.child_ids.filter((cid) => cid !== targetId);
              return {
                ...node,
                child_ids: newChildIds,
                active_child_index:
                  newChildIds.length > 0 ? Math.min(node.active_child_index ?? 0, newChildIds.length - 1) : null,
              };
            }
            return node;
          });

        let newTailId = previous.rootId;
        if (newTailId) {
          const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));
          let current = nodeMap.get(newTailId);
          while (current && current.child_ids.length > 0 && current.active_child_index !== null) {
            newTailId = current.child_ids[current.active_child_index];
            current = nodeMap.get(newTailId);
          }
        }

        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: updatedNodes,
          tailId: newTailId,
        });
      }

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}

export function useSwitchBranch(chatId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (targetLeafId: string) => chats.switchBranch(chatId, targetLeafId),

    onMutate: async (targetLeafId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chats.detail(chatId) });

      const previous = queryClient.getQueryData<ChatFull>(queryKeys.chats.detail(chatId));

      if (previous) {
        const nodeMap = new Map(previous.nodes.map((n) => [n.id, { ...n }]));
        let currentId: string | null = targetLeafId;

        while (currentId) {
          const node = nodeMap.get(currentId);
          if (!node?.parent_id) break;

          const parent = nodeMap.get(node.parent_id);
          if (!parent) break;

          const childIndex = parent.child_ids.indexOf(currentId);
          if (childIndex !== -1) {
            parent.active_child_index = childIndex;
          }

          currentId = node.parent_id;
        }

        queryClient.setQueryData<ChatFull>(queryKeys.chats.detail(chatId), {
          ...previous,
          nodes: Array.from(nodeMap.values()),
          tailId: targetLeafId,
        });
      }

      return { previous };
    },

    onError: (_, __, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.chats.detail(chatId), context.previous);
      }
    },
  });
}
