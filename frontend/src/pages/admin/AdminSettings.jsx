import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Save, User as UserIcon, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { BookingRulesCard } from '@/pages/admin/BookingRulesCard';

const ChangeCredentialsCard = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setNewEmail(user.email || '');
      setNewName(user.name || '');
    }
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!currentPassword) { toast.error('Enter your current password to confirm'); return; }
    if (newPassword && newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword && newPassword !== confirmPassword) { toast.error('New password and confirmation do not match'); return; }

    setBusy(true);
    try {
      const payload = { current_password: currentPassword };
      if (newEmail && newEmail !== user?.email) payload.new_email = newEmail.trim();
      if (newName !== user?.name) payload.new_name = newName;
      if (newPassword) payload.new_password = newPassword;

      const { data } = await api.post('/admin/auth/change-credentials', payload);
      if (data.token) {
        localStorage.setItem('swell_admin_token', data.token);
      }
      toast.success(data.changed ? 'Credentials updated. Use these next time you sign in.' : 'No changes to save.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Delay a moment so the toast is seen; user record will refresh on next /auth/me call
      setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not update credentials');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card-cream p-6 space-y-4" data-testid="admin-change-credentials-form">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--brand-sage-tint)] flex items-center justify-center shrink-0">
          <KeyRound className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl">Change your login credentials</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">Update your admin email, display name, or password. You'll need to enter your current password to confirm the change.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="eyebrow block mb-1">DISPLAY NAME</label>
          <div className="relative">
            <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--brand-text-muted)]" />
            <input
              className="input-cream pl-9"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Your name"
              data-testid="admin-credentials-name"
            />
          </div>
        </div>
        <div>
          <label className="eyebrow block mb-1">EMAIL (LOGIN)</label>
          <div className="relative">
            <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--brand-text-muted)]" />
            <input
              type="email"
              className="input-cream pl-9"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="you@domain.com"
              data-testid="admin-credentials-email"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-[color:var(--brand-border)] pt-4 space-y-3">
        <div>
          <label className="eyebrow block mb-1">NEW PASSWORD (LEAVE BLANK TO KEEP)</label>
          <input
            type="password"
            className="input-cream"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            data-testid="admin-credentials-new-password"
          />
        </div>
        {newPassword && (
          <div>
            <label className="eyebrow block mb-1">CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              className="input-cream"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Retype the new password"
              autoComplete="new-password"
              data-testid="admin-credentials-confirm-password"
            />
          </div>
        )}
      </div>

      <div className="border-t border-[color:var(--brand-border)] pt-4">
        <label className="eyebrow block mb-1">CURRENT PASSWORD (REQUIRED)</label>
        <input
          type="password"
          className="input-cream"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Verify it's you"
          autoComplete="current-password"
          required
          data-testid="admin-credentials-current-password"
        />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <p className="text-xs text-[color:var(--brand-text-muted)]">
          Locked out? SSH into your VPS, set <code>ADMIN_FORCE_RESET=1</code> in <code>backend/.env</code>, redeploy — the seed will reset your password from <code>ADMIN_PASSWORD</code>. Remove the flag afterwards.
        </p>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="admin-credentials-submit">
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

export const AdminSettings = () => {
  const [subs, setSubs] = useState([]);
  useEffect(() => { api.get('/admin/newsletter').then(r => setSubs(r.data)); }, []);

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div><p className="eyebrow">SYSTEM</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Settings</h1></div>

      <ChangeCredentialsCard />

      <BookingRulesCard />

      <div className="card-cream p-6">
        <p className="font-serif text-xl mb-2">SMTP email</p>
        <p className="text-sm text-[color:var(--brand-text-muted)]">Confirmation emails are sent from the address configured in your server's environment variables. To finalize email delivery, update these values in your VPS <code>backend/.env</code> file and restart the backend:</p>
        <pre className="bg-[color:var(--brand-surface-2)] p-4 rounded-lg text-xs mt-3 overflow-auto">SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=hello@swelldesignla.com
SMTP_FROM_NAME=swell design + media
BUSINESS_EMAIL=hello@swelldesignla.com</pre>
        <p className="text-xs text-[color:var(--brand-text-muted)] mt-2">Tip: Hostinger users can find their SMTP host and port in their email hosting panel.</p>
      </div>

      <div className="card-cream p-6">
        <p className="font-serif text-xl mb-2">Newsletter subscribers ({subs.length})</p>
        <div className="divide-y divide-[color:var(--brand-border)]">
          {subs.map(s => (<div key={s.id} className="py-2 flex items-center justify-between text-sm"><span>{s.email}</span><span className="text-[color:var(--brand-text-muted)] text-xs">{formatDate(s.created_at)} · {s.source}</span></div>))}
          {subs.length === 0 && <p className="text-sm text-[color:var(--brand-text-muted)] py-6 text-center">No subscribers yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
