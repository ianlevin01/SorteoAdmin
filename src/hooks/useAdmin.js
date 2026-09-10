import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export function useRaffles() {
  return useQuery({
    queryKey: ['admin', 'raffles'],
    queryFn: () => api('/admin/raffles'),
  });
}

export function useRaffle(raffleId) {
  return useQuery({
    queryKey: ['admin', 'raffle', raffleId],
    queryFn: () => api(`/admin/raffles/${raffleId}`),
    enabled: Boolean(raffleId),
  });
}

export function useRaffleStats(raffleId) {
  return useQuery({
    queryKey: ['admin', 'raffle', raffleId, 'stats'],
    queryFn: () => api(`/admin/raffles/${raffleId}/stats`),
    enabled: Boolean(raffleId),
  });
}

export function useCreateRaffle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api('/admin/raffles', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'raffles'] }),
  });
}

export function useUpdateRaffle(raffleId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api(`/admin/raffles/${raffleId}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}
