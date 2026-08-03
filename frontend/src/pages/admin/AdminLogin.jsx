import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/Logo';

const AdminLogin = () => {
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('admin@swelldesignla.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  if (!loading && user) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/admin');
    } catch (_) {
      toast.error('Invalid email or password.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--brand-cream)] px-4" data-testid="admin-login-page">
      <div className="w-full max-w-md card-cream p-8">
        <div className="flex items-center justify-center mb-6"><Logo size={64} /></div>
        <h1 className="font-serif text-3xl text-center">Studio sign-in</h1>
        <p className="text-sm text-center text-[color:var(--brand-text-muted)] mt-2">Access your admin dashboard.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="eyebrow block mb-2">EMAIL</label><input required type="email" className="input-cream" value={email} onChange={e => setEmail(e.target.value)} data-testid="admin-login-email" /></div>
          <div><label className="eyebrow block mb-2">PASSWORD</label><input required type="password" className="input-cream" value={password} onChange={e => setPassword(e.target.value)} data-testid="admin-login-password" /></div>
          <button type="submit" disabled={busy} className="btn-primary w-full" data-testid="admin-login-submit">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
