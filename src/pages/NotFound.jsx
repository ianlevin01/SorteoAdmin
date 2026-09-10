import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{ padding: '2rem 0' }}>
      <h1 style={{ fontSize: 'var(--text-2xl)' }}>404</h1>
      <p style={{ color: 'var(--color-text-muted)', margin: '0.5rem 0 1rem' }}>
        No encontramos esta página.
      </p>
      <Link to="/sorteos">Volver a Sorteos</Link>
    </div>
  );
}
