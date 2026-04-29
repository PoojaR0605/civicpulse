import { useState, useEffect } from 'react';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import CitizenPortal    from './pages/CitizenPortal';

export default function App() {
  const [user, setUser]     = useState(null);
  const [page, setPage]     = useState('login'); // login | register | dashboard | citizen
  const [hydrated, setHydrated] = useState(false);

  // Fix #8 — restore session on refresh
  useEffect(() => {
    const saved = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (saved && token) {
      const u = JSON.parse(saved);
      setUser(u);
      setPage(u.role === 'citizen' ? 'citizen' : 'dashboard');
    }
    setHydrated(true);
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    setPage(u.role === 'citizen' ? 'citizen' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPage('login');
  };

  if (!hydrated) return null; // prevent flash

  if (!user) {
    if (page === 'register') return <RegisterPage onRegistered={handleLogin} onBack={() => setPage('login')} />;
    return <LoginPage onLogin={handleLogin} onRegister={() => setPage('register')} />;
  }

  if (user.role === 'citizen') return <CitizenPortal user={user} onLogout={handleLogout} />;
  return <DashboardPage user={user} onLogout={handleLogout} />;
}