import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, useOrdersSummary } from '../hooks/useAdmin.js';
import { formatMoney, formatInt, formatDateTime, numbersLabel } from '../lib/format.js';
import styles from './Orders.module.css';

const STATUS_LABEL = {
  pending_payment: 'Pendiente de pago',
  receipt_submitted: 'Para revisar',
  receipt_rejected: 'Rechazo automático',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
  failed: 'Falló',
};

const TABS = [
  { key: 'receipt_submitted', label: 'Para revisar' },
  { key: 'pending_payment', label: 'Pendientes de pago' },
  { key: 'receipt_rejected', label: 'Rechazo automático' },
  { key: 'approved', label: 'Aprobados' },
  { key: 'rejected', label: 'Rechazados' },
  { key: 'all', label: 'Todos' },
];

export default function Orders() {
  const [tab, setTab] = useState('receipt_submitted');
  const summary = useOrdersSummary();
  const orders = useOrders(tab);
  const navigate = useNavigate();

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Pedidos</h1>
      </header>

      <div className={styles.stats}>
        <Stat label="Recaudado (aprobados)" value={summary.data ? formatMoney(summary.data.totalRevenue) : '…'} />
        <Stat label="Compradores" value={summary.data ? formatInt(summary.data.buyersCount) : '…'} />
        <Stat
          label="Para revisar"
          value={summary.data ? formatInt(summary.data.pendingReviewCount) : '…'}
          warn={Boolean(summary.data?.pendingReviewCount)}
        />
        <Stat label="Total de pedidos" value={summary.data ? formatInt(summary.data.totalOrders) : '…'} />
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === tab ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'receipt_submitted' && summary.data?.pendingReviewCount > 0 && (
              <> ({summary.data.pendingReviewCount})</>
            )}
          </button>
        ))}
      </div>

      {orders.isLoading && <p className={styles.msg}>Cargando…</p>}
      {orders.isError && <p className={styles.error}>{orders.error?.message}</p>}

      {orders.data?.length === 0 && (
        <div className={styles.empty}>
          <p>No hay pedidos en este filtro.</p>
        </div>
      )}

      {orders.data?.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Comprador</th>
                <th>Sorteo</th>
                <th className={styles.num}>Números</th>
                <th className={styles.num}>Monto</th>
                <th>Estado</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((o) => (
                <tr
                  key={o.orderId}
                  className={styles.row}
                  onClick={() => navigate(`/pedidos/${o.orderId}`)}
                >
                  <td>
                    <div className={styles.name}>{o.buyerName || '—'}</div>
                    <div className={styles.muted}>DNI {o.dni}</div>
                  </td>
                  <td>{o.raffleTitle}</td>
                  <td className={styles.num}>{numbersLabel(o.chances)}</td>
                  <td className={styles.num}>{formatMoney(o.amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${styles[o.status] || ''}`}>
                      {STATUS_LABEL[o.status] || o.status}
                    </span>
                  </td>
                  <td className={styles.muted}>{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={warn ? `${styles.statValue} ${styles.warn}` : styles.statValue}>{value}</span>
    </div>
  );
}
