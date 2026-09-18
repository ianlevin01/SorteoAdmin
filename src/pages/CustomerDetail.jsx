import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { useCustomer } from '../hooks/useAdmin.js';
import { Button } from '../components/Button.jsx';
import { formatDate, formatDateTime, formatMoney, numbersLabel } from '../lib/format.js';
import styles from './CustomerDetail.module.css';

const STATUS_LABEL = {
  pending_payment: 'Pendiente de pago',
  receipt_submitted: 'Para revisar',
  receipt_rejected: 'Rechazo automático',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  expired: 'Vencido',
  cancelled: 'Cancelado',
};

function numbersSummary(numbers) {
  if (!numbers) return '—';
  const list = Array.isArray(numbers.list) ? numbers.list : null;
  if (list) return list.length <= 10 ? list.join(', ') : `${list.slice(0, 10).join(', ')}… (+${list.length - 10})`;
  return `${numbers.start}–${numbers.start + numbers.count - 1}`;
}

export default function CustomerDetail() {
  const { dni } = useParams();
  const navigate = useNavigate();
  const query = useCustomer(dni);

  if (query.isLoading) return <p className={styles.msg}>Cargando…</p>;
  if (query.isError || !query.data) {
    return (
      <p className={styles.msg}>
        No se encontró el cliente. <Link to="/clientes">Volver</Link>
      </p>
    );
  }

  const { user: c, orders } = query.data;

  return (
    <div>
      <div className={styles.crumbs}>
        <Link to="/clientes">Clientes</Link> / {c.firstName} {c.lastName}
      </div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>
            {c.firstName} {c.lastName}
          </h1>
          <p className={styles.meta}>
            DNI {c.dni} · Cliente desde {formatDate(c.createdAt)}
          </p>
        </div>
        {c.role === 'admin' && <span className={styles.adminBadge}>Administrador</span>}
      </header>

      <div className={styles.layout}>
        <div>
          <section className={styles.card}>
            <h2 className={styles.section}>Datos personales</h2>
            <dl className={styles.dataGrid}>
              <Item label="Email" value={c.email} />
              <Item
                label="WhatsApp"
                value={c.whatsapp && <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer">{c.whatsapp}</a>}
              />
              <Item label="Fecha de nacimiento" value={c.birthDate && formatDate(c.birthDate)} />
              <Item label="Dirección" value={c.address} full />
              <Item label="Localidad" value={c.city} />
              <Item label="Provincia" value={c.province} />
              <Item label="Código postal" value={c.postalCode} />
            </dl>
          </section>
        </div>

        <div>
          <section className={styles.card}>
            <h2 className={styles.section}>Pedidos ({orders.length})</h2>
            {orders.length === 0 ? (
              <p className={styles.msg}>Todavía no hizo ningún pedido.</p>
            ) : (
              <div className={styles.ordersList}>
                {orders.map((o) => (
                  <button
                    key={o.orderId}
                    type="button"
                    className={styles.orderRow}
                    onClick={() => navigate(`/pedidos/${o.orderId}`)}
                  >
                    <div>
                      <div className={styles.orderRaffle}>{o.raffleTitle}</div>
                      <div className={styles.muted}>
                        {numbersLabel(o.chances)} · {numbersSummary(o.numbers)}
                      </div>
                      <div className={styles.muted}>{formatDateTime(o.createdAt)}</div>
                    </div>
                    <div className={styles.orderRight}>
                      <span className={clsx(styles.badge, styles[o.status] || '')}>
                        {STATUS_LABEL[o.status] || o.status}
                      </span>
                      <span className={styles.orderAmount}>{formatMoney(o.amount)}</span>
                    </div>
                  </button>
                ))}
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

function Item({ label, value, full }) {
  if (!value) return null;
  return (
    <div className={clsx(styles.item, full && styles.itemFull)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
