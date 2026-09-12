import { Link, useParams } from 'react-router-dom';
import { useRaffle, useRaffleStats } from '../hooks/useAdmin.js';
import { Button } from '../components/Button.jsx';
import { formatDate, formatInt, formatMoney } from '../lib/format.js';
import styles from './RaffleDetail.module.css';

export default function RaffleDetail() {
  const { raffleId } = useParams();
  const raffle = useRaffle(raffleId);
  const stats = useRaffleStats(raffleId);

  if (raffle.isLoading) return <p className={styles.msg}>Cargando…</p>;
  if (raffle.isError || !raffle.data) {
    return (
      <p className={styles.msg}>
        No se encontró el sorteo. <Link to="/sorteos">Volver</Link>
      </p>
    );
  }

  const r = raffle.data;
  const s = stats.data;

  return (
    <div>
      <div className={styles.crumbs}>
        <Link to="/sorteos">Sorteos</Link> / {r.title}
      </div>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>{r.title}</h1>
          <p className={styles.meta}>
            {r.status} · {r.mode === 'pick' ? 'elegí tu número' : 'números correlativos'}
            {r.drawDate && ` · sorteo el ${formatDate(r.drawDate)}`}{' '}
            {r.featured && '· destacado'}
          </p>
        </div>
        <Button as={Link} to={`/sorteos/${raffleId}/editar`} variant="secondary">
          Editar
        </Button>
      </header>

      <div className={styles.stats}>
        <Stat label="Números entregados" value={s ? formatInt(s.numbersAssigned) : '…'} sub={s?.totalNumbers ? `de ${formatInt(s.totalNumbers)}` : ''} />
        <Stat label="Confirmados (pagados)" value={s ? formatInt(s.numbersConfirmed) : '…'} />
        <Stat label="Participantes" value={s ? formatInt(s.participants) : '…'} sub="personas distintas" />
        <Stat label="Avance" value={s?.progress != null ? `${s.progress}%` : '—'} />
      </div>

      {r.mode === 'pick' ? (
        <section className={styles.card}>
          <h2 className={styles.section}>Precio por número</h2>
          <p className={styles.prose}>
            {formatMoney(r.pricePerNumber || 0)} por número, elegible entre 0 y{' '}
            {formatInt((r.totalNumbers || 1) - 1)}.
          </p>
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.section}>Opciones de compra</h2>
          <table className={styles.tiers}>
            <thead>
              <tr>
                <th>Números</th>
                <th>Precio</th>
                <th>Precio x número</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...(r.chanceTiers || [])]
                .sort((a, b) => a.chances - b.chances)
                .map((t) => (
                  <tr key={t.id}>
                    <td>{formatInt(t.chances)}</td>
                    <td>{formatMoney(t.price)}</td>
                    <td className={styles.muted}>{formatMoney(t.price / t.chances)}</td>
                    <td>{t.popular && <span className={styles.pop}>Más elegido</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}

      {r.prizeDescription && (
        <section className={styles.card}>
          <h2 className={styles.section}>Qué se sortea</h2>
          <p className={styles.prose}>{r.prizeDescription}</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}
