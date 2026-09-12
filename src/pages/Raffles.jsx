import { Link } from 'react-router-dom';
import { useRaffles } from '../hooks/useAdmin.js';
import { Button } from '../components/Button.jsx';
import { formatDate, formatInt } from '../lib/format.js';
import styles from './Raffles.module.css';

const STATUS = {
  draft: { label: 'Borrador', cls: 'draft' },
  active: { label: 'Activo', cls: 'active' },
  paused: { label: 'Pausado', cls: 'paused' },
  finished: { label: 'Finalizado', cls: 'finished' },
};

export default function Raffles() {
  const { data: raffles, isLoading, isError, error } = useRaffles();

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Sorteos</h1>
        <Button as={Link} to="/sorteos/nuevo">
          + Nuevo sorteo
        </Button>
      </header>

      {isLoading && <p className={styles.msg}>Cargando…</p>}
      {isError && <p className={styles.error}>{error?.message}</p>}

      {raffles && raffles.length === 0 && (
        <div className={styles.empty}>
          <p>Todavía no hay sorteos.</p>
          <Button as={Link} to="/sorteos/nuevo">
            Crear el primero
          </Button>
        </div>
      )}

      {raffles && raffles.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sorteo</th>
                <th>Estado</th>
                <th>Sorteo el</th>
                <th className={styles.num}>Números</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {raffles.map((r) => {
                const st = STATUS[r.status] || STATUS.draft;
                return (
                  <tr key={r.raffleId}>
                    <td>
                      <Link to={`/sorteos/${r.raffleId}`} className={styles.name}>
                        {r.title}
                      </Link>
                      {r.mode === 'pick' && <span className={styles.featured}>Elegí tu número</span>}
                      {r.featured && <span className={styles.featured}>Destacado</span>}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles[st.cls]}`}>{st.label}</span>
                    </td>
                    <td className={styles.muted}>
                      {r.drawDate ? formatDate(r.drawDate) : '—'}
                    </td>
                    <td className={styles.num}>
                      {r.mode === 'pick' ? '—' : formatInt(r.assignedCount || 0)} / {formatInt(r.totalNumbers || 0)}
                    </td>
                    <td className={styles.actions}>
                      <Link to={`/sorteos/${r.raffleId}/editar`}>Editar</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
