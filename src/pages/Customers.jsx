import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchCustomers } from '../hooks/useAdmin.js';
import { formatDate } from '../lib/format.js';
import styles from './Customers.module.css';

export default function Customers() {
  const [query, setQuery] = useState('');
  const customers = useSearchCustomers(query);
  const navigate = useNavigate();

  return (
    <div>
      <header className={styles.head}>
        <h1 className={styles.title}>Clientes</h1>
        <p className={styles.subtitle}>Buscá por nombre, DNI, email o WhatsApp.</p>
      </header>

      <div className={styles.searchWrap}>
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente…"
          autoFocus
        />
      </div>

      {customers.isLoading && <p className={styles.msg}>Cargando…</p>}
      {customers.isError && <p className={styles.error}>{customers.error?.message}</p>}

      {customers.data?.length === 0 && (
        <div className={styles.empty}>
          <p>{query ? 'No encontramos ningún cliente con eso.' : 'Todavía no hay clientes registrados.'}</p>
        </div>
      )}

      {customers.data?.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Contacto</th>
                <th>Localidad</th>
                <th>Registrado</th>
              </tr>
            </thead>
            <tbody>
              {customers.data.map((c) => (
                <tr key={c.dni} className={styles.row} onClick={() => navigate(`/clientes/${c.dni}`)}>
                  <td>
                    <div className={styles.name}>
                      {c.firstName} {c.lastName}
                      {c.role === 'admin' && <span className={styles.adminTag}>admin</span>}
                    </div>
                  </td>
                  <td className={styles.muted}>{c.dni}</td>
                  <td>
                    <div>{c.email}</div>
                    <div className={styles.muted}>{c.whatsapp}</div>
                  </td>
                  <td className={styles.muted}>
                    {c.city}
                    {c.province ? `, ${c.province}` : ''}
                  </td>
                  <td className={styles.muted}>{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
