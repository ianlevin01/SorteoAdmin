import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import clsx from 'clsx';
import {
  useRaffle,
  useRaffleStats,
  useRaffleTickets,
  useBlockNumbers,
  useAssignNumbers,
} from '../hooks/useAdmin.js';
import { Button } from '../components/Button.jsx';
import { Field, Textarea, Input } from '../components/Field.jsx';
import { formatDate, formatDateTime, formatInt, formatMoney, padTicket } from '../lib/format.js';
import styles from './RaffleDetail.module.css';

const NUM_STATUS_LABEL = {
  available: 'Disponible',
  reserved: 'Reservado (sin pagar todavía)',
  confirmed: 'Confirmado',
};

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

      {r.mode === 'pick' && <NumbersGridCard raffleId={raffleId} totalNumbers={r.totalNumbers} />}

      {r.mode === 'pick' && <AssignNumbersCard raffleId={raffleId} totalNumbers={r.totalNumbers} />}

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

const GRID_PAGE_SIZE = 200;

/**
 * Solo para CONSULTAR: no reserva ni compra nada, es la misma idea que la
 * grilla de números de la página pública pero para que el admin vea de un
 * vistazo qué está disponible, reservado (alguien lo está por pagar) o ya
 * confirmado — y quién es el titular, cosa que la página pública no muestra.
 */
function NumbersGridCard({ raffleId, totalNumbers }) {
  const ticketsQuery = useRaffleTickets(raffleId);
  const [page, setPage] = useState(0);
  const [jump, setJump] = useState('');
  const [selected, setSelected] = useState(null);
  const total = totalNumbers || 0;

  const byNumber = useMemo(() => {
    const map = new Map();
    for (const t of ticketsQuery.data || []) map.set(t.number, t);
    return map;
  }, [ticketsQuery.data]);

  const statusOf = (n) => {
    const t = byNumber.get(n);
    if (!t) return 'available';
    if (t.confirmed) return 'confirmed';
    if (t.reservedUntil && t.reservedUntil > new Date().toISOString()) return 'reserved';
    return 'available'; // reserva vencida sin pagar: ya está libre de nuevo
  };

  // Cuenta sobre los tickets reales (no recorre 0..total, que en un sorteo
  // gigante podría ser un montón de números): lo que no tiene ticket
  // ocupado se asume disponible.
  const counts = useMemo(() => {
    const now = new Date().toISOString();
    const c = { confirmed: 0, reserved: 0 };
    for (const t of ticketsQuery.data || []) {
      if (t.confirmed) c.confirmed += 1;
      else if (t.reservedUntil && t.reservedUntil > now) c.reserved += 1;
    }
    return { ...c, available: Math.max(0, total - c.confirmed - c.reserved) };
  }, [ticketsQuery.data, total]);

  const pageCount = Math.max(1, Math.ceil(total / GRID_PAGE_SIZE));
  const from = page * GRID_PAGE_SIZE;
  const to = Math.min(total, from + GRID_PAGE_SIZE);
  const pageNumbers = Array.from({ length: Math.max(0, to - from) }, (_, i) => from + i);

  const onJump = (e) => {
    e.preventDefault();
    const n = Number(jump);
    if (!Number.isInteger(n) || n < 0 || n >= total) return;
    setPage(Math.floor(n / GRID_PAGE_SIZE));
    setSelected(n);
  };

  const selectedTicket = selected != null ? byNumber.get(selected) : null;
  const selectedStatus = selected != null ? statusOf(selected) : null;

  return (
    <section className={styles.card}>
      <h2 className={styles.section}>Disponibilidad de números</h2>
      <p className={styles.prose}>
        Solo para consultar (no reserva ni asigna nada al tocar un número): mostrá qué
        números están disponibles, reservados o ya confirmados, igual que se ve en la
        página, pero acá además ves quién es el titular.
      </p>

      <div className={styles.gridLegend}>
        <span>
          <i className={clsx(styles.dot, styles.dotAvailable)} /> Disponible ({formatInt(counts.available)})
        </span>
        <span>
          <i className={clsx(styles.dot, styles.dotReserved)} /> Reservado ({formatInt(counts.reserved)})
        </span>
        <span>
          <i className={clsx(styles.dot, styles.dotConfirmed)} /> Confirmado ({formatInt(counts.confirmed)})
        </span>
      </div>

      {ticketsQuery.isLoading && <p className={styles.msg}>Cargando números…</p>}
      {ticketsQuery.isError && <p className={styles.err}>No pudimos cargar los números.</p>}

      {!ticketsQuery.isLoading && !ticketsQuery.isError && (
        <>
          <form onSubmit={onJump} className={styles.jumpForm}>
            <Input
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              placeholder="Ir al número…"
              inputMode="numeric"
            />
            <Button type="submit" variant="secondary" size="sm">
              Ir
            </Button>
          </form>

          <div className={styles.numGrid}>
            {pageNumbers.map((n) => {
              const status = statusOf(n);
              return (
                <button
                  key={n}
                  type="button"
                  className={clsx(
                    styles.numCell,
                    styles[`num_${status}`],
                    selected === n && styles.numSelected,
                  )}
                  onClick={() => setSelected(n)}
                  title={`#${padTicket(n, total)} — ${NUM_STATUS_LABEL[status]}`}
                >
                  {padTicket(n, total)}
                </button>
              );
            })}
          </div>

          <div className={styles.pager}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Anteriores
            </Button>
            <span className={styles.pagerLabel}>
              {formatInt(from)}–{formatInt(Math.max(from, to - 1))} de {formatInt(total)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguientes →
            </Button>
          </div>

          {selected != null && (
            <div className={styles.numDetail}>
              <strong>#{padTicket(selected, total)}</strong> — {NUM_STATUS_LABEL[selectedStatus]}
              {selectedTicket?.holderName && <> · {selectedTicket.holderName}</>}
              {selectedTicket?.offline ? (
                <>
                  {' '}
                  · <span className={styles.muted}>venta offline</span>
                </>
              ) : (
                selectedTicket?.dni && (
                  <>
                    {' '}
                    · DNI {selectedTicket.dni}
                  </>
                )
              )}
              {selectedTicket?.adminAssigned && (
                <>
                  {' '}
                  · <span className={styles.muted}>asignado por admin</span>
                </>
              )}
              {selectedStatus === 'reserved' && selectedTicket?.reservedUntil && (
                <> · reservado hasta {formatDateTime(selectedTicket.reservedUntil)}</>
              )}
              {selectedTicket?.orderId && (
                <>
                  {' '}
                  · <Link to={`/pedidos/${selectedTicket.orderId}`}>Ver pedido →</Link>
                </>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AssignNumbersCard({ raffleId, totalNumbers }) {
  const [text, setText] = useState('');
  const [dni, setDni] = useState('');
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [result, setResult] = useState(null);
  const assign = useAssignNumbers(raffleId);

  const onSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    setResult(null);
    const cleanDni = dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(cleanDni)) {
      setFormError('DNI inválido (7 u 8 dígitos)');
      return;
    }
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
    assign.mutate(
      { numbers, dni: cleanDni, name: name.trim() || undefined, note: note.trim() || undefined },
      {
        onSuccess: (data) => {
          setResult(data);
          setText('');
        },
      },
    );
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.section}>Asignar números a una persona</h2>
      <p className={styles.prose}>
        Para darle uno o más números a alguien puntual (regalo, corrección, venta con
        datos reales) aunque todavía no se haya registrado en el sitio. Quedan a nombre
        de su DNI: si en algún momento se registra con ese mismo DNI, va a ver estos
        números en "Mis números" — no hace falta crearle una cuenta ahora. Solo se
        pueden asignar números completamente disponibles: si alguno ya está reservado
        (aunque sea sin pagar todavía) o ya tiene una compra, no se asigna NINGUNO y te
        avisamos cuáles son.
      </p>
      <form onSubmit={onSubmit} className={styles.blockForm}>
        <Field label="DNI de la persona" hint="7 u 8 dígitos, sin puntos.">
          {(p) => (
            <Input {...p} value={dni} onChange={(e) => setDni(e.target.value)} placeholder="12345678" inputMode="numeric" />
          )}
        </Field>
        <Field label="Nombre" hint="Opcional, para identificarla en el panel.">
          {(p) => (
            <Input {...p} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" />
          )}
        </Field>
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
            <Input {...p} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Regalo por..." />
          )}
        </Field>
        {formError && <p className={styles.err}>{formError}</p>}
        {assign.isError && <p className={styles.err}>{assign.error.message}</p>}
        <Button type="submit" loading={assign.isPending}>
          Asignar números
        </Button>
      </form>
      {result && (
        <div className={styles.blockResult}>
          <p>
            ✓ {result.numbers.length} número{result.numbers.length === 1 ? '' : 's'} asignado
            {result.numbers.length === 1 ? '' : 's'} al DNI {result.dni}: {result.numbers.join(', ')}
          </p>
        </div>
      )}
    </section>
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
