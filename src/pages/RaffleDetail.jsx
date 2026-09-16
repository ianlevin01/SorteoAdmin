import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useRaffle, useRaffleStats, useBlockNumbers } from '../hooks/useAdmin.js';
import { Button } from '../components/Button.jsx';
import { Field, Textarea, Input } from '../components/Field.jsx';
import { formatDate, formatInt, formatMoney } from '../lib/format.js';
import styles from './RaffleDetail.module.css';

/** "1, 2, 5-10, 42" -> { numbers: [1,2,5,6,7,8,9,10,42], invalid: [] } */
function parseNumberRanges(input) {
  const numbers = new Set();
  const invalid = [];
  const parts = input.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const part of parts) {
    const range = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]);
      const b = Number(range[2]);
      const [lo, hi] = a <= b ? [a, b] : [b, a];
      for (let n = lo; n <= hi; n += 1) numbers.add(n);
    } else if (/^\d+$/.test(part)) {
      numbers.add(Number(part));
    } else {
      invalid.push(part);
    }
  }
  return { numbers: [...numbers].sort((a, b) => a - b), invalid };
}

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

      {r.mode === 'pick' && <BlockNumbersCard raffleId={raffleId} totalNumbers={r.totalNumbers} />}

      {r.prizeDescription && (
        <section className={styles.card}>
          <h2 className={styles.section}>Qué se sortea</h2>
          <p className={styles.prose}>{r.prizeDescription}</p>
        </section>
      )}
    </div>
  );
}

function BlockNumbersCard({ raffleId, totalNumbers }) {
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);
  const block = useBlockNumbers(raffleId);

  const onSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setResult(null);
    const { numbers, invalid } = parseNumberRanges(text);
    if (invalid.length) {
      setFormError(`No entendí esto: ${invalid.join(', ')}`);
      return;
    }
    if (!numbers.length) {
      setFormError('Escribí al menos un número');
      return;
    }
    if (totalNumbers != null && numbers.some((n) => n < 0 || n >= totalNumbers)) {
      setFormError(`Hay números fuera de rango (tiene que ser entre 0 y ${totalNumbers - 1})`);
      return;
    }
    block.mutate(
      { numbers, note: note.trim() || undefined },
      { onSuccess: (data) => { setResult(data); setText(''); } },
    );
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.section}>Marcar números como ya vendidos</h2>
      <p className={styles.prose}>
        Para un sorteo que ya se venía vendiendo fuera del sistema (en persona, por
        WhatsApp, etc.) antes de cargarlo acá. Estos números quedan tomados para
        siempre — nadie va a poder elegirlos — pero sin un comprador real cargado,
        así que no van a aparecer en "Mis números" de nadie.
      </p>
      <form onSubmit={onSubmit} className={styles.blockForm}>
        <Field label="Números" hint="Separados por coma o renglón. Podés usar rangos, ej: 1, 2, 5-10, 42">
          {(p) => (
            <Textarea
              {...p}
              rows={4}
              placeholder={'1, 2, 5-10, 42'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </Field>
        <Field label="Nota" hint="Opcional, para tu propio registro.">
          {(p) => (
            <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Venta en el local" />
          )}
        </Field>
        {formError && <p className={styles.err}>{formError}</p>}
        {block.isError && <p className={styles.err}>{block.error.message}</p>}
        <Button type="submit" loading={block.isPending}>
          Marcar como vendidos
        </Button>
      </form>
      {result && (
        <div className={styles.blockResult}>
          <p>
            ✓ {result.blocked.length} número{result.blocked.length === 1 ? '' : 's'} marcado
            {result.blocked.length === 1 ? '' : 's'}
            {result.blocked.length > 0 ? `: ${result.blocked.join(', ')}` : ''}
          </p>
          {result.skipped.length > 0 && (
            <p className={styles.err}>
              {result.skipped.length} ya tenían una compra o reserva real y NO se tocaron:{' '}
              {result.skipped.join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
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
