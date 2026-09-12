import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/logo.jpg';
import { Field, Input } from '../components/Field.jsx';
import { Button } from '../components/Button.jsx';
import styles from './Login.module.css';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const dest = location.state?.from || '/sorteos';

  const [dni, setDni] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={dest} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const clean = dni.replace(/\D/g, '');
    if (!/^\d{7,8}$/.test(clean)) {
      setError('DNI inválido');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await login(clean);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo ingresar');
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <div className={styles.brand}>
          <img src={logo} alt="" className={styles.mark} />
          <span>Panel de administración</span>
        </div>
        <p className={styles.sub}>Acceso para administradores.</p>
        <Field label="DNI" error={error}>
          {(p) => (
            <Input
              {...p}
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              inputMode="numeric"
              placeholder="12345678"
              autoFocus
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={busy} className={styles.submit}>
          Ingresar
        </Button>
      </form>
    </div>
  );
}
