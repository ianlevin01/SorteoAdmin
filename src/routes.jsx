import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { Layout } from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Raffles from './pages/Raffles.jsx';
import RaffleForm from './pages/RaffleForm.jsx';
import RaffleDetail from './pages/RaffleDetail.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Inquiries from './pages/Inquiries.jsx';
import InquiryDetail from './pages/InquiryDetail.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import NotFound from './pages/NotFound.jsx';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/ingresar" state={{ from: location.pathname }} replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/ingresar" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/sorteos" replace />} />
        <Route path="sorteos" element={<Raffles />} />
        <Route path="sorteos/nuevo" element={<RaffleForm />} />
        <Route path="sorteos/:raffleId" element={<RaffleDetail />} />
        <Route path="sorteos/:raffleId/editar" element={<RaffleForm />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="pedidos/:orderId" element={<OrderDetail />} />
        <Route path="consultas" element={<Inquiries />} />
        <Route path="consultas/:inquiryId" element={<InquiryDetail />} />
        <Route path="clientes" element={<Customers />} />
        <Route path="clientes/:dni" element={<CustomerDetail />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
