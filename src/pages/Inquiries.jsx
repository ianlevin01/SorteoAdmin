import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInquiries } from '../hooks/useAdmin.js';
import { formatDateTime } from '../lib/format.js';
import styles from './Inquiries.module.css';

const TABS = [
  { key: 'open', label: 'Abiertas' },
  { key: 'closed', label: 'Cerradas' },
];

export default function Inquiries() {
  const [tab, setTab] = useState('open');
  const inquiries = useInquiries(tab);
  const navigate = useNavigate();

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Consultas</h1>
        <p className={styles.subtitle}>
          Conversaciones que el asistente derivó a un asesor humano. Acá ves el resumen que armó la
          IA, no el chat completo.
        </p>
      </header>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={t.key === tab ? styles.tabActive : styles.tab}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {inquiries.isLoading && <p className={styles.msg}>Cargando…</p>}
      {inquiries.isError && <p className={styles.error}>{inquiries.error?.message}</p>}

      {inquiries.data?.length === 0 && (
        <div className={styles.empty}>
          <p>{tab === 'open' ? 'No hay consultas abiertas por ahora.' : 'No hay consultas cerradas.'}</p>
        </div>
      )}

      {inquiries.data?.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Resumen</th>
                <th>Último mensaje</th>
                <th>Iniciada</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.data.map((i) => (
                <tr key={i.inquiryId} className={styles.row} onClick={() => navigate(`/consultas/${i.inquiryId}`)}>
                  <td>
                    <div className={styles.name}>{i.name || '—'}</div>
                    <div className={styles.muted}>DNI {i.dni}{i.whatsapp ? ` · ${i.whatsapp}` : ''}</div>
                  </td>
                  <td className={styles.summaryCell}>{i.summary}</td>
                  <td>
                    <span className={i.lastMessageFrom === 'admin' ? styles.fromAdmin : styles.fromCustomer}>
                      {i.lastMessageFrom === 'admin' ? 'Respondiste vos' : 'Esperando respuesta'}
                    </span>
                    <div className={styles.muted}>{formatDateTime(i.lastMessageAt)}</div>
                  </td>
                  <td className={styles.muted}>{formatDateTime(i.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
