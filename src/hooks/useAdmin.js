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

export function useDeleteRaffle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (raffleId) => api(`/admin/raffles/${raffleId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'raffles'] }),
  });
}

// ---------------- Pedidos ----------------

export function useOrdersSummary() {
  return useQuery({
    queryKey: ['admin', 'orders-summary'],
    queryFn: () => api('/admin/orders-summary'),
    refetchInterval: 30_000,
  });
}

export function useOrders(status) {
  return useQuery({
    queryKey: ['admin', 'orders', status],
    queryFn: () => api(`/admin/orders?status=${encodeURIComponent(status)}`),
  });
}

export function useOrder(orderId) {
  return useQuery({
    queryKey: ['admin', 'order', orderId],
    queryFn: () => api(`/admin/orders/${orderId}`),
    enabled: Boolean(orderId),
  });
}

export function useOrderReceiptUrl(orderId, hasReceipt) {
  return useQuery({
    queryKey: ['admin', 'order', orderId, 'receipt-url'],
    queryFn: () => api(`/admin/orders/${orderId}/receipt-url`),
    enabled: Boolean(orderId) && Boolean(hasReceipt),
    staleTime: 4 * 60_000, // la URL firmada dura un rato; no la pedimos de más
  });
}

function invalidateOrder(qc, orderId) {
  qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
  qc.invalidateQueries({ queryKey: ['admin', 'orders-summary'] });
  qc.invalidateQueries({ queryKey: ['admin', 'order', orderId] });
}

export function useApproveOrder(orderId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/admin/orders/${orderId}/approve`, { method: 'POST' }),
    onSuccess: () => invalidateOrder(qc, orderId),
  });
}

export function useRejectOrder(orderId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason) => api(`/admin/orders/${orderId}/reject`, { method: 'POST', body: { reason } }),
    onSuccess: () => invalidateOrder(qc, orderId),
  });
}

// ---------------- Sorteos "elegí tu número": números ya vendidos ----------------

export function useBlockNumbers(raffleId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ numbers, note }) =>
      api(`/admin/raffles/${raffleId}/numbers/block`, { method: 'POST', body: { numbers, note } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'raffle', raffleId, 'stats'] });
      qc.invalidateQueries({ queryKey: ['raffle-numbers', raffleId] });
    },
  });
}

// ---------------- Consultas (chat con la IA escalado a un asesor) ----------------

export function useInquiries(status = 'open') {
  return useQuery({
    queryKey: ['admin', 'inquiries', status],
    queryFn: () => api(`/admin/inquiries?status=${encodeURIComponent(status)}`),
    // Para notar una consulta nueva sin tener que recargar la página.
    refetchInterval: 15_000,
  });
}

export function useInquiry(inquiryId) {
  return useQuery({
    queryKey: ['admin', 'inquiry', inquiryId],
    queryFn: () => api(`/admin/inquiries/${inquiryId}`),
    enabled: Boolean(inquiryId),
    refetchInterval: (query) => (query.state.data?.inquiry?.status === 'open' ? 5000 : false),
  });
}

function invalidateInquiry(qc, inquiryId) {
  qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] });
  qc.invalidateQueries({ queryKey: ['admin', 'inquiry', inquiryId] });
}

export function useReplyInquiry(inquiryId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text) => api(`/admin/inquiries/${inquiryId}/messages`, { method: 'POST', body: { text } }),
    onSuccess: () => invalidateInquiry(qc, inquiryId),
  });
}

export function useCloseInquiry(inquiryId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api(`/admin/inquiries/${inquiryId}/close`, { method: 'POST' }),
    onSuccess: () => invalidateInquiry(qc, inquiryId),
  });
}
