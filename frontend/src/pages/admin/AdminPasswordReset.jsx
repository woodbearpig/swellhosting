import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { Logo } from '@/components/Logo';

/**
 * Forgot-password + reset-password screens.
 *
 * Two-step self-service flow so a client who locks themselves out of the
 * admin can recover without needing to contact support:
 *   1. /admin/forgot-password  — enter email, receive reset link via SMTP
 *   2. /admin/reset-password?token=... — set a new password
 *
 * The super-admin backdoor (env-based, invisible to the client) is a
 * separate safety net managed by the developer/support person — it does
 * NOT flow through this UI.
 */

// --------------------------------------------------------------------------
// Step 1: Request a reset link
// --------------------------------------------------------------------------
export const AdminForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      // Backend intentionally returns the same generic 200 response whether
      // or not the email matches an account — so we mirror that here and
      // simply show a "check your inbox" success state either way.
      await api.post('/auth/request-password-reset', { email: email.trim() });
      setSent(true);
    } catch {
      toast.error("We couldn't send the reset email. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--brand-cream)] px-4" data-testid="admin-forgot-password-page">
      <div className="w-full max-w-md card-cream p-8">
        <div className="flex items-center justify-center mb-6"><Logo size={64} /></div>
        {sent ? (
          <div className="text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-[color:var(--brand-sage-deep)]" />
            <h1 className="font-serif text-2xl mt-3">Check your inbox</h1>
            <p className="text-sm text-[color:var(--brand-text-muted)] mt-3 leading-relaxed">
              If an account exists for <b>{email}</b>, we've just emailed you a link to choose a new password. The link expires in 1 hour and can only be used once.
            </p>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-4">
              Don't see it? Check your spam folder, or wait a minute and try again.
            </p>
            <Link
              to="/admin/login"
              className="btn-secondary mt-6 inline-flex"
              data-testid="admin-forgot-password-back"
            >
              <ArrowLeft className="h-4 w-4" /> Back to sign-in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl text-center">Forgot your password?</h1>
            <p className="text-sm text-center text-[color:var(--brand-text-muted)] mt-2">
              Enter the email you use to sign in and we'll send you a link to choose a new one.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="eyebrow block mb-2">EMAIL</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--brand-text-muted)]" />
                  <input
                    required
                    type="email"
                    className="input-cream pl-10"
                    placeholder="you@yourdomain.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    data-testid="admin-forgot-password-email"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="btn-primary w-full"
                data-testid="admin-forgot-password-submit"
              >
                {busy ? 'Sending…' : 'Send reset link'}
              </button>
              <div className="text-center pt-1">
                <Link
                  to="/admin/login"
                  className="text-xs text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-sage-deep)] hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="h-3 w-3" /> Back to sign-in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

// --------------------------------------------------------------------------
// Step 2: Set a new password using a link from email
// --------------------------------------------------------------------------
export const AdminResetPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) toast.error("That link isn't complete. Try requesting a new one.");
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) { toast.error('Missing reset token.'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { toast.error("Those passwords don't match."); return; }
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
      toast.success('Password updated. Please sign in with your new password.');
      setTimeout(() => navigate('/admin/login'), 2500);
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Could not reset password.';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[color:var(--brand-cream)] px-4" data-testid="admin-reset-password-page">
      <div className="w-full max-w-md card-cream p-8">
        <div className="flex items-center justify-center mb-6"><Logo size={64} /></div>
        {done ? (
          <div className="text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-[color:var(--brand-sage-deep)]" />
            <h1 className="font-serif text-2xl mt-3">Password updated</h1>
            <p className="text-sm text-[color:var(--brand-text-muted)] mt-3">
              Redirecting you to the sign-in page…
            </p>
            <Link to="/admin/login" className="btn-primary mt-5 inline-flex">Sign in now</Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl text-center">Choose a new password</h1>
            <p className="text-sm text-center text-[color:var(--brand-text-muted)] mt-2">
              At least 8 characters. Something you'll remember, but hard to guess.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="eyebrow block mb-2">NEW PASSWORD</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    className="input-cream pr-11"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    minLength={8}
                    data-testid="admin-reset-password-new"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)] hover:bg-[color:var(--brand-sage-tint)]/50 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-2">CONFIRM PASSWORD</label>
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  className="input-cream"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  data-testid="admin-reset-password-confirm"
                />
              </div>
              <button
                type="submit"
                disabled={busy || !token || !password || !confirm}
                className="btn-primary w-full"
                data-testid="admin-reset-password-submit"
              >
                {busy ? 'Updating…' : 'Update password'}
              </button>
              <div className="text-center pt-1">
                <Link to="/admin/login" className="text-xs text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-sage-deep)] hover:underline">
                  Back to sign-in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
