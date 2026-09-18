import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useOrder,
  useOrderReceiptUrl,
  useApproveOrder,
  useRejectOrder,
  useCustomer,
} from '../hooks/useAdmin.js';
import { Field, Textarea } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import { formatMoney, formatDateTime, numbersLabel, padTicket } from '../lib/format.js';
import styles from './OrderDetail.module.css';

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

const CAN_APPROVE = ['pending_payment', 'receipt_submitted', 'receipt_rejected'];

const CHECK_LABELS = {
  document: 'Comprobante',
  amount: 'Monto',
  recipient: 'Destinatario',
  sender: 'Cuenta emisora (debe ser del comprador)',
  date: 'Fecha',
};

const EXTRACTED_LABELS = {
  amount: 'Monto leído',
  currency: 'Moneda',
  recipientName: 'Nombre destinatario',
  recipientAlias: 'Alias destinatario',
  recipientCbu: 'CBU destinatario',
  senderName: 'Nombre emisor',
  senderTaxId: 'CUIT/CUIL emisor',
  dateText: 'Fecha del comprobante',
  operationId: 'N° de operación',
  bank: 'Banco / billetera',
};

function orderNumbersList(numbers) {
  if (!numbers) return [];
  if (Array.isArray(numbers.list)) return numbers.list;
  return Array.from({ length: numbers.count }, (_, i) => numbers.start + i);
}

function numbersSummary(o) {
  const list = orderNumbersList(o.numbers);
  if (!list.length) return '—';
  if (list.length <= 15) return list.map((n) => padTicket(n)).join(', ');
  return `${list.slice(0, 15).map((n) => padTicket(n)).join(', ')}… (+${list.length - 15})`;
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const order = useOrder(orderId);
  const o = order.data;
  const customer = useCustomer(o?.dni);
  const c = customer.data?.user;

  const receiptUrl = useOrderReceiptUrl(orderId, Boolean(o?.receipt?.key));
  const approve = useApproveOrder(orderId);
  const reject = useRejectOrder(orderId);
  const [reason, setReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [receiptUrl.data?.url]);

  if (order.isLoading) return <p className={styles.msg}>Cargando…</p>;
  if (order.isError || !o) {
    return (
      <p className={styles.msg}>
        No se encontró el pedido. <Link to="/pedidos">Volver</Link>
      </p>
    );
  }

  const v = o.verification;
  const checks = v?.checks ? Object.entries(CHECK_LABELS).filter(([k]) => v.checks[k]) : [];
  const extracted = v?.extracted
    ? Object.entries(EXTRACTED_LABELS).filter(([k]) => v.extracted[k] != null && v.extracted[k] !== '')
    : [];

  const canReview = CAN_APPROVE.includes(o.status);

  return (
    <div>
      <div className={styles.crumbs}>
        <Link to="/pedidos">Pedidos</Link> / {o.orderId}
      </div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{o.buyerName || 'Comprador'}</h1>
          <p className={styles.meta}>
            DNI {o.dni} · {o.raffleTitle} · {formatDateTime(o.createdAt)}
          </p>
          <p className={styles.contactLine}>
            {c?.email && <span>{c.email}</span>}
            {c?.whatsapp && (
              <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer">
                {c.whatsapp}
              </a>
            )}
            {c?.address && <span>{c.address}</span>}
            {(c?.city || c?.province) && (
              <span>
                {c.city}
                {c.city && c.province ? ', ' : ''}
                {c.province}
              </span>
            )}
            <Link to={`/clientes/${o.dni}`}>Ver perfil completo →</Link>
          </p>
        </div>
        <span className={`${styles.badge} ${styles[o.status] || ''}`}>
          {STATUS_LABEL[o.status] || o.status}
        </span>
      </header>

      <div className={styles.layout}>
        <div>
          <section className={styles.card}>
            <h2 className={styles.section}>Comprobante</h2>
            {!o.receipt ? (
              <div className={styles.empty}>Todavía no subió un comprobante.</div>
            ) : receiptUrl.isLoading ? (
              <p className={styles.msg}>Cargando comprobante…</p>
            ) : receiptUrl.data?.url ? (
              o.receipt.contentType === 'application/pdf' ? (
                <div className={styles.receiptBox}>
                  <a
                    className={styles.receiptLink}
                    href={receiptUrl.data.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir comprobante (PDF) ↗
                  </a>
                </div>
              ) : imgFailed ? (
                <div className={styles.receiptBox}>
                  <a
                    className={styles.receiptLink}
                    href={receiptUrl.data.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    No pudimos mostrar una vista previa. Abrir el archivo ↗
                  </a>
                </div>
              ) : (
                <div className={styles.receiptBox}>
                  <a href={receiptUrl.data.url} target="_blank" rel="noreferrer">
                    <img
                      src={receiptUrl.data.url}
                      alt="Comprobante"
                      className={styles.receiptImg}
                      onError={() => setImgFailed(true)}
                    />
                  </a>
                </div>
              )
            ) : (
              <p className={styles.error}>No se pudo obtener el comprobante.</p>
            )}
          </section>

          {v && (
            <section className={styles.card}>
              <h2 className={styles.section}>Revisión del comprobante</h2>
              {checks.length > 0 && (
                <ul className={styles.checklist}>
                  {checks.map(([key, label]) => (
                    <li key={key} className={v.checks[key].pass ? styles.checkOk : styles.checkBad}>
                      <span className={styles.checkIcon}>{v.checks[key].pass ? '✓' : '✕'}</span>
                      <span>
                        <strong>{label}.</strong> {v.checks[key].detail}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {extracted.length > 0 && (
                <table className={styles.extracted}>
                  <tbody>
                    {extracted.map(([key, label]) => (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{key === 'amount' ? formatMoney(v.extracted[key]) : String(v.extracted[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {v.issues?.length > 0 && (
                <ul className={styles.issues}>
                  {v.issues.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              )}
              {!checks.length && !extracted.length && !v.issues?.length && (
                <p className={styles.msg}>Todavía no hay datos de revisión para este comprobante.</p>
              )}
            </section>
          )}
        </div>

        <div>
          <section className={styles.card}>
            <h2 className={styles.section}>Pedido</h2>
            <dl className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <dt>Monto</dt>
                <dd>{formatMoney(o.amount)}</dd>
              </div>
              <div className={styles.summaryItem}>
                <dt>Cantidad</dt>
                <dd>{numbersLabel(o.chances)}</dd>
              </div>
              <div className={styles.summaryItem} style={{ gridColumn: '1 / -1' }}>
                <dt>Números</dt>
                <dd>{numbersSummary(o)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.card}>
            <h2 className={styles.section}>Decisión</h2>
            {!canReview ? (
              <p className={styles.reviewed}>
                {o.status === 'approved' &&
                  `Aprobado ${o.approvedBy === 'auto' ? 'sin revisión manual' : `por ${o.approvedBy || '—'}`} el ${formatDateTime(o.approvedAt)}.`}
                {o.status === 'rejected' &&
                  `Rechazado por ${o.reviewedBy || '—'} el ${formatDateTime(o.reviewedAt)}. ${o.rejectionReason || ''}`}
                {(o.status === 'expired' || o.status === 'cancelled' || o.status === 'failed') &&
                  (o.rejectionReason || 'Este pedido ya no está activo.')}
              </p>
            ) : (
              <div className={styles.actions}>
                {approve.isError && <p className={styles.error}>{approve.error.message}</p>}
                {reject.isError && <p className={styles.error}>{reject.error.message}</p>}
                {!showReject ? (
                  <div className={styles.actionRow}>
                    <Button variant="success" loading={approve.isPending} onClick={() => approve.mutate()}>
                      Aprobar
                    </Button>
                    <Button variant="danger" onClick={() => setShowReject(true)}>
                      Rechazar
                    </Button>
                  </div>
                ) : (
                  <>
                    <Field label="Motivo del rechazo" hint="Se guarda en el pedido; no hace falta ser muy técnico.">
                      {(p) => (
                        <Textarea
                          {...p}
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Ej: el monto no coincide con lo que corresponde pagar"
                        />
                      )}
                    </Field>
                    <div className={styles.actionRow}>
                      <Button
                        variant="danger"
                        loading={reject.isPending}
                        onClick={() =>
                          reject.mutate(reason, { onSuccess: () => setShowReject(false) })
                        }
                      >
                        Confirmar rechazo
                      </Button>
                      <Button variant="ghost" onClick={() => setShowReject(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <Button variant="ghost" onClick={() => navigate(-1)}>
            ← Volver
          </Button>
        </div>
      </div>
    </div>
  );
}
