import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, Save, User as UserIcon, Mail, Eye, EyeOff, ShieldAlert, Users, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { BookingRulesCard } from '@/pages/admin/BookingRulesCard';

/**
 * PasswordField — masked input with a right-side eye toggle so the owner
 * can peek at what they've typed. Useful for confirming password-manager
 * autofills or catching typos during a credential change.
 */
const PasswordField = ({ value, onChange, placeholder, autoComplete, testId, required }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className="input-cream pr-11"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        data-testid={testId}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)] hover:bg-[color:var(--brand-sage-tint)]/50 transition-colors"
        aria-label={visible ? 'Hide password' : 'Show password'}
        title={visible ? 'Hide password' : 'Show password'}
        data-testid={testId ? `${testId}-toggle` : undefined}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

const ChangeCredentialsCard = () => {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { ok, diag }
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (user) {
      setNewEmail(user.email || '');
      setNewName(user.name || '');
    }
  }, [user]);

  const runVerify = async () => {
    setVerifyResult(null);
    if (!currentPassword) { toast.error('Type your current password first, then click Test.'); return; }
    setVerifying(true);
    try {
      const { data } = await api.post('/admin/auth/verify-password', { current_password: currentPassword });
      setVerifyResult(data);
      if (data.match) toast.success("Current password verified — it's correct.");
      else if (data.match_after_trim) toast.error('Password matches only after trimming whitespace. Check for accidental leading/trailing spaces.');
      else toast.error('Password does NOT match the stored hash. See the diagnostic panel below.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verify request failed');
    } finally {
      setVerifying(false);
    }
  };

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
          <PasswordField
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            autoComplete="new-password"
            testId="admin-credentials-new-password"
          />
        </div>
        {newPassword && (
          <div>
            <label className="eyebrow block mb-1">CONFIRM NEW PASSWORD</label>
            <PasswordField
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Retype the new password"
              autoComplete="new-password"
              testId="admin-credentials-confirm-password"
            />
          </div>
        )}
      </div>

      <div className="border-t border-[color:var(--brand-border)] pt-4">
        <label className="eyebrow block mb-1">CURRENT PASSWORD (REQUIRED)</label>
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <PasswordField
              value={currentPassword}
              onChange={e => { setCurrentPassword(e.target.value); setVerifyResult(null); }}
              placeholder="Verify it's you"
              autoComplete="current-password"
              required
              testId="admin-credentials-current-password"
            />
          </div>
          <button
            type="button"
            onClick={runVerify}
            disabled={verifying || !currentPassword}
            className="btn-secondary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Check whether this password matches your stored hash — nothing is saved."
            data-testid="admin-credentials-test-button"
          >
            {verifying ? 'Testing…' : 'Test'}
          </button>
        </div>
        {verifyResult && (
          <div
            className={`mt-2 p-3 rounded-lg text-xs ${
              verifyResult.match
                ? 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]'
                : 'bg-[color:var(--brand-blush-tint)] text-[color:var(--brand-text)]'
            }`}
            data-testid="admin-credentials-verify-result"
          >
            <p className="font-medium mb-1">
              {verifyResult.match ? '✓ Password matches.' : '✗ Password does not match.'}
            </p>
            <ul className="space-y-0.5 leading-relaxed">
              <li>Characters received by server: <strong>{verifyResult.received_length}</strong></li>
              {verifyResult.has_leading_or_trailing_whitespace && (
                <li className="text-[color:var(--brand-coral)] font-medium">⚠ Contains leading/trailing whitespace ({verifyResult.received_trimmed_length} chars after trim)</li>
              )}
              <li>Admin account found: <strong>{verifyResult.admin_found ? 'yes' : 'no'}</strong></li>
              {verifyResult.stored_email && <li>Stored email: <strong>{verifyResult.stored_email}</strong></li>}
              {!verifyResult.match && verifyResult.match_after_trim && (
                <li className="text-[color:var(--brand-coral)] font-medium">→ Matches after trim — a whitespace character is being included.</li>
              )}
              {!verifyResult.match && !verifyResult.match_after_trim && verifyResult.admin_found && (
                <li>→ The characters you typed do not match the hash stored for <strong>{verifyResult.stored_email}</strong>. If you're certain the password is right, the stored hash may have drifted (see recovery tip below).</li>
              )}
            </ul>
          </div>
        )}
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

/**
 * AdminUsersAuditCard — lists every row in `admin_users`, flags duplicates on `id`,
 * and offers a one-click cleanup that keeps a single row (chosen by email) with a
 * fresh password. Also creates unique indexes so this can't happen again.
 *
 * Written to solve a specific real-world bug: earlier ADMIN_FORCE_RESET runs with a
 * changed ADMIN_EMAIL created duplicate admin rows, causing MongoDB's find_one
 * to arbitrarily return the wrong one for password change while login used the
 * right one.
 */
const AdminUsersAuditCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [keepEmail, setKeepEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/auth/admins-audit');
      setAudit(data);
      if (data.admins?.length && !keepEmail) {
        // Default the "keep_email" to the caller's own email if present, else first row.
        const mine = data.admins.find(a => a.id === data.token_sub);
        setKeepEmail(mine?.email || data.admins[0]?.email || user?.email || '');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Could not load admin users');
    } finally {
      setLoading(false);
    }
  };

  const consolidate = async () => {
    if (!keepEmail || !keepEmail.includes('@')) { toast.error('Enter a valid email to keep'); return; }
    if (!newPassword || newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (!currentPassword) { toast.error('Enter your current password to authorize cleanup'); return; }
    if (!window.confirm(`This will KEEP the admin row with email "${keepEmail}", rewrite its password, and DELETE every other admin row. Continue?`)) return;

    setBusy(true);
    try {
      const { data } = await api.post('/admin/auth/consolidate-admins', {
        keep_email: keepEmail,
        new_password: newPassword,
        current_password: currentPassword,
      });
      if (data.token) localStorage.setItem('swell_admin_token', data.token);
      toast.success(`Cleaned up. Removed ${data.deleted_other_admins + (data.deleted_id_duplicates || 0)} extra row(s). Logging in again with new credentials…`);
      setNewPassword('');
      setCurrentPassword('');
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Consolidation failed');
    } finally {
      setBusy(false);
    }
  };

  const hasDuplicates = audit && (Object.keys(audit.duplicate_id_values || {}).length > 0 || (audit.count > 1));

  return (
    <div className="card-cream p-6 space-y-4" data-testid="admin-users-audit-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--brand-blush-tint)] flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-[color:var(--brand-coral)]" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl">Admin users audit</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">
            Diagnostic view of every admin row in the database. If you're stuck on
            "current password is incorrect" this will show whether duplicates exist,
            and offer a one-click cleanup.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary !h-9 shrink-0" data-testid="admin-users-audit-load">
          {loading ? 'Loading…' : audit ? 'Refresh' : 'Load'}
        </button>
      </div>

      {audit && (
        <div className="space-y-3">
          <div className="text-xs text-[color:var(--brand-text-muted)]">
            Token points to: <code>{audit.token_sub}</code> ({audit.token_email || 'no email in token'})
          </div>

          {hasDuplicates && (
            <div className="rounded-xl bg-[color:var(--brand-blush-tint)] p-3 text-sm flex items-start gap-2" data-testid="admin-users-audit-warning">
              <ShieldAlert className="h-4 w-4 text-[color:var(--brand-coral)] mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Multiple admin rows detected ({audit.count} total)</p>
                <p className="text-xs mt-0.5">This is why password changes fail — MongoDB may pick a different row than the one you logged in with. Use the cleanup form below to consolidate.</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[color:var(--brand-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--brand-surface-2)] text-xs uppercase tracking-wider text-[color:var(--brand-text-muted)]">
                <tr>
                  <th className="text-left px-3 py-2">id</th>
                  <th className="text-left px-3 py-2">email</th>
                  <th className="text-left px-3 py-2">name</th>
                  <th className="text-left px-3 py-2">role</th>
                  <th className="text-left px-3 py-2">created_at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--brand-border)]">
                {audit.admins.map((a, idx) => {
                  const isCaller = a.id === audit.token_sub;
                  return (
                    <tr key={idx} className={isCaller ? 'bg-[color:var(--brand-sage-tint)]/40' : ''} data-testid={`admin-users-audit-row-${idx}`}>
                      <td className="px-3 py-2 font-mono text-xs">
                        {a.id || <span className="italic text-[color:var(--brand-text-muted)]">(none)</span>}
                        {isCaller && <span className="ml-2 badge-soft">this session</span>}
                      </td>
                      <td className="px-3 py-2">
                        {a.email
                          ? <button type="button" className="link-underline" onClick={() => setKeepEmail(a.email)}>{a.email}</button>
                          : <span className="italic text-[color:var(--brand-text-muted)]">(empty)</span>}
                      </td>
                      <td className="px-3 py-2">{a.name || '—'}</td>
                      <td className="px-3 py-2 text-xs">{a.role || '—'}</td>
                      <td className="px-3 py-2 text-xs text-[color:var(--brand-text-muted)]">{a.created_at ? formatDate(a.created_at) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {audit.count > 1 || (audit.admins[0] && !audit.admins[0].email) ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="btn-secondary text-xs !h-9"
                data-testid="admin-users-audit-cleanup-toggle"
              >
                <Trash2 className="h-3.5 w-3.5" /> {expanded ? 'Hide cleanup form' : 'Open cleanup form'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[color:var(--brand-text-muted)] italic">
              Only one clean admin row. If you still can't change your password, use the ADMIN_FORCE_RESET recovery.
            </p>
          )}

          {expanded && (
            <div className="rounded-xl border border-[color:var(--brand-border)] p-4 space-y-3 bg-[color:var(--brand-surface-2)]/50" data-testid="admin-users-audit-cleanup-form">
              <p className="text-sm">
                Choose the admin email to keep (click any email in the table above to fill this),
                set a new password, and confirm with the current password of the row you're logged in with.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow block mb-1">EMAIL TO KEEP</label>
                  <input className="input-cream" value={keepEmail} onChange={e => setKeepEmail(e.target.value)} placeholder="admin@your-domain.com" data-testid="admin-users-audit-keep-email" />
                </div>
                <div>
                  <label className="eyebrow block mb-1">NEW PASSWORD (8+ CHARS)</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input-cream pr-11"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      data-testid="admin-users-audit-new-password"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-[color:var(--brand-text-muted)] hover:text-[color:var(--brand-text)] hover:bg-[color:var(--brand-sage-tint)]/50 transition-colors" aria-label={showPw ? 'Hide' : 'Show'}>
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="eyebrow block mb-1">CURRENT PASSWORD (of your logged-in row)</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-cream pr-11"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    data-testid="admin-users-audit-current-password"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={consolidate}
                  disabled={busy}
                  className="btn-primary"
                  data-testid="admin-users-audit-consolidate"
                >
                  <Trash2 className="h-4 w-4" /> {busy ? 'Cleaning up…' : 'Consolidate & set new password'}
                </button>
              </div>
              <p className="text-xs text-[color:var(--brand-text-muted)]">
                This deletes every admin row except the one matching "email to keep", then rewrites its
                password to your new value and adds unique indexes on <code>id</code> and <code>email</code>
                to prevent future duplicates.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AdminSettings = () => {
  const [subs, setSubs] = useState([]);
  useEffect(() => { api.get('/admin/newsletter').then(r => setSubs(r.data)); }, []);

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div><p className="eyebrow">SYSTEM</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Settings</h1></div>

      <ChangeCredentialsCard />

      <AdminUsersAuditCard />

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
