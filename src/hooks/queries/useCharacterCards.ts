/**
 * React Query hooks for character cards CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CharacterCardRecordMeta } from '../../types/characterCard';
import { characterCards } from '../../api/characterCards';

// ============ Query Keys ============
export const characterCardKeys = {
  all: ['character-cards'] as const,
  lists: () => [...characterCardKeys.all, 'list'] as const,
  list: () => [...characterCardKeys.lists()] as const,
  details: () => [...characterCardKeys.all, 'detail'] as const,
  detail: (id: string) => [...characterCardKeys.details(), id] as const,
};

// ============ List All Cards ============
export function useCharacterCards() {
  return useQuery({
    queryKey: characterCardKeys.list(),
    queryFn: () => characterCards.list(),
    staleTime: 30_000,
  });
}

// ============ Update Token Count (computed client-side) ============
export function useUpdateCardTokenCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, token_count }: { id: string; token_count: number }) =>
      characterCards.updateTokenCount(id, token_count),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<CharacterCardRecordMeta[] | undefined>(characterCardKeys.list(), (prev) => {
        if (!prev) return prev;
        return prev.map((c) =>
          c.id === variables.id
            ? { ...c, token_count: data.token_count, token_count_updated_at: data.token_count_updated_at }
            : c
        );
      });
    },
  });
}

// ============ Get Single Card ============
export function useCharacterCard(id: string | null) {
  return useQuery({
    queryKey: id ? characterCardKeys.detail(id) : ['null'],
    queryFn: () => {
      if (!id) throw new Error('No card ID provided');
      return characterCards.get(id);
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}

// ============ Create Card ============
export function useCreateCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (card: Record<string, unknown>) => characterCards.create(card),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Update Card ============
export function useUpdateCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, card }: { id: string; card: Record<string, unknown> }) =>
      characterCards.update(id, card),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(data.id) });
    },
  });
}

// ============ Update Avatar ============
export function useUpdateCardAvatar() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      characterCards.updateAvatar(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(variables.id) });
    },
  });
}

// ============ Remove Avatar ============
export function useDeleteCardAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => characterCards.deleteAvatar(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.invalidateQueries({ queryKey: characterCardKeys.detail(id) });
    },
  });
}

// ============ Delete Card ============
export function useDeleteCharacterCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => characterCards.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
      queryClient.removeQueries({ queryKey: characterCardKeys.detail(id) });
    },
  });
}

// ============ Import PNG ============
export function useImportPngCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => characterCards.importPng(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Import JSON ============
export function useImportJsonCard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (json: Record<string, unknown>) => characterCards.importJson(json),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: characterCardKeys.lists() });
    },
  });
}

// ============ Helpers ============
export function getAvatarUrl(id: string): string {
  return `/api${characterCards.getAvatarUrl(id)}`;
}

export function getAvatarUrlVersioned(id: string, version?: string | null): string {
  return `/api${characterCards.getAvatarUrl(id, version)}`;
}

export function getExportPngUrl(id: string): string {
  return `/api${characterCards.getExportPngUrl(id)}`;
}

export function getExportJsonUrl(id: string): string {
  return `/api${characterCards.getExportJsonUrl(id)}`;
}
