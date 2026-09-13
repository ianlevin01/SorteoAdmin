import { NavLink, Outlet } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/logo.jpg';
import styles from './Layout.module.css';

const NAV = [
  { to: '/sorteos', label: 'Sorteos' },
  { to: '/pedidos', label: 'Pedidos' },
];

export function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img src={logo} alt="" className={styles.brandMark} />
          <span>Panel</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(styles.navLink, isActive && styles.navLinkActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.user}>
          <span className={styles.userName}>{user?.firstName} {user?.lastName}</span>
          <button type="button" className={styles.logout} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
