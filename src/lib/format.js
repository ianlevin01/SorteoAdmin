import { format, formatDistanceToNowStrict, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

const money0 = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const int = new Intl.NumberFormat('es-AR');

export const formatMoney = (n) => money0.format(Number(n) || 0);
export const formatInt = (n) => int.format(Number(n) || 0);

export const chancesLabel = (n) => `${formatInt(n)} ${Number(n) === 1 ? 'chance' : 'chances'}`;
export const numbersLabel = (n) => `${formatInt(n)} ${Number(n) === 1 ? 'número' : 'números'}`;

/** Ancho de dígitos para mostrar un número de ticket segun el total del sorteo. */
export const ticketWidth = (totalNumbers) =>
  Math.max(4, String(Math.max(1, (totalNumbers || 1) - 1)).length);

export const padTicket = (n, totalNumbers) =>
  String(n).padStart(ticketWidth(totalNumbers), '0');

export const formatDate = (iso) =>
  iso ? format(new Date(iso), "d 'de' MMMM 'de' yyyy", { locale: es }) : '';

export const formatDateTime = (iso) =>
  iso ? format(new Date(iso), "d MMM yyyy · HH:mm'h'", { locale: es }) : '';

export const isFinishedDate = (iso) => (iso ? isPast(new Date(iso)) : false);

export const timeUntil = (iso) =>
  iso ? formatDistanceToNowStrict(new Date(iso), { locale: es, addSuffix: true }) : '';
