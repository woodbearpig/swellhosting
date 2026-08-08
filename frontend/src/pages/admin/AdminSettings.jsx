import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  KeyRound, Save, User as UserIcon, Mail, Eye, EyeOff,
  Send, Info, CheckCircle2, XCircle, Copy, ExternalLink,
} from 'lucide-react';
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
      if (data.token) localStorage.setItem('swell_admin_token', data.token);
      toast.success(data.changed ? 'Credentials updated. Use these next time you sign in.' : 'No changes to save.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
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
        <PasswordField
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Verify it's you"
          autoComplete="current-password"
          required
          testId="admin-credentials-current-password"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button type="submit" className="btn-primary" disabled={busy} data-testid="admin-credentials-submit">
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
};

/** Small copyable field — mirrors the pattern used on the Integrations page. */
const CopyRow = ({ label, value }) => (
  <div>
    <label className="eyebrow block mb-1">{label}</label>
    <div className="flex gap-2">
      <input readOnly className="input-cream flex-1 text-sm font-mono" value={value} />
      <button
        type="button"
        className="btn-secondary"
        onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}
        title="Copy to clipboard"
      >
        <Copy className="h-4 w-4" />
      </button>
    </div>
  </div>
);

/**
 * SmtpEmailCard — shows current SMTP config at-a-glance, offers a one-click
 * test-send, and includes a collapsible "Send as info@ from Gmail" step-by-step
 * setup guide (client-facing).
 */
const SmtpEmailCard = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showGmailGuide, setShowGmailGuide] = useState(false);
  const [showEnvSample, setShowEnvSample] = useState(false);

  useEffect(() => {
    api.get('/admin/settings/smtp-config')
      .then(r => setConfig(r.data))
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, []);

  useEffect(() => { if (user?.email && !testTo) setTestTo(user.email); }, [user, testTo]);

  const configComplete = useMemo(() => !!(
    config && config.host && config.port && config.user && config.from_email && config.password_set
  ), [config]);

  const runTest = async () => {
    if (!testTo || !testTo.includes('@')) { toast.error('Enter a valid recipient email'); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/admin/settings/test-smtp', { to: testTo.trim() });
      setTestResult(data);
      if (data.ok) toast.success(`Test sent to ${data.delivered_to} — check the inbox.`);
      else toast.error('Test failed. See details below.');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Test request failed';
      setTestResult({ ok: false, error: detail });
      toast.error(detail);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="card-cream p-6 space-y-5" data-testid="admin-smtp-card">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-full bg-[color:var(--brand-sage-tint)] flex items-center justify-center shrink-0">
          <Mail className="h-5 w-5 text-[color:var(--brand-sage-deep)]" />
        </div>
        <div className="flex-1">
          <p className="font-serif text-xl">SMTP email</p>
          <p className="text-sm text-[color:var(--brand-text-muted)]">
            The address the website uses to send inquiry confirmations, consultation invites, and new-lead alerts.
          </p>
        </div>
      </div>

      {/* Config summary */}
      {loadingConfig ? (
        <div className="text-sm text-[color:var(--brand-text-muted)]">Loading configuration…</div>
      ) : (
        <div className="rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)]/50 p-4">
          <div className="flex items-center gap-2 mb-3">
            {configComplete ? (
              <><CheckCircle2 className="h-4 w-4 text-[color:var(--brand-sage-deep)]" /><span className="text-sm font-medium">Configured and ready</span></>
            ) : (
              <><XCircle className="h-4 w-4 text-[color:var(--brand-coral)]" /><span className="text-sm font-medium">Not fully configured</span></>
            )}
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">Host</dt><dd className="font-mono text-xs truncate">{config?.host || <span className="italic text-[color:var(--brand-coral)]">(not set)</span>}</dd></div>
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">Port</dt><dd className="font-mono text-xs">{config?.port || <span className="italic text-[color:var(--brand-coral)]">(not set)</span>}</dd></div>
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">User</dt><dd className="font-mono text-xs truncate">{config?.user || <span className="italic text-[color:var(--brand-coral)]">(not set)</span>}</dd></div>
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">Password</dt><dd className="font-mono text-xs">{config?.password_set ? '•••••••• (set)' : <span className="italic text-[color:var(--brand-coral)]">(not set)</span>}</dd></div>
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">Sends as</dt><dd className="font-mono text-xs truncate">{config?.from_email || <span className="italic text-[color:var(--brand-coral)]">(not set)</span>}</dd></div>
            <div className="flex gap-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">From name</dt><dd className="font-mono text-xs truncate">{config?.from_name || '—'}</dd></div>
            <div className="flex gap-2 sm:col-span-2"><dt className="text-[color:var(--brand-text-muted)] w-24 shrink-0">Alerts to</dt><dd className="font-mono text-xs truncate">{config?.business_email || <span className="italic text-[color:var(--brand-coral)]">(not set — new-inquiry alerts won't be sent)</span>}</dd></div>
          </dl>
          <p className="text-xs text-[color:var(--brand-text-muted)] mt-3">
            These values live in <code>backend/.env</code> on your VPS. To change them: SSH in, edit the file, then run <code>./deploy.sh</code>.{' '}
            <button type="button" onClick={() => setShowEnvSample(v => !v)} className="link-underline">
              {showEnvSample ? 'Hide' : 'Show'} .env template
            </button>
          </p>
          {showEnvSample && (
            <pre className="bg-[color:var(--brand-cream)] border border-[color:var(--brand-border)] p-3 rounded-lg text-xs mt-3 overflow-auto">{`SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@swelldesignla.com
SMTP_PASS=your-mailbox-password
SMTP_FROM=info@swelldesignla.com
SMTP_FROM_NAME=swell design + media
BUSINESS_EMAIL=info@swelldesignla.com`}</pre>
          )}
        </div>
      )}

      {/* Send a test email */}
      <div className="space-y-2">
        <label className="eyebrow block">SEND A TEST EMAIL</label>
        <div className="flex gap-2">
          <input
            type="email"
            className="input-cream flex-1"
            value={testTo}
            onChange={e => setTestTo(e.target.value)}
            placeholder="where-to-send-test@example.com"
            data-testid="admin-smtp-test-to"
          />
          <button
            type="button"
            onClick={runTest}
            disabled={testing || !testTo}
            className="btn-primary shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="admin-smtp-test-send"
          >
            <Send className="h-4 w-4" /> {testing ? 'Sending…' : 'Send test'}
          </button>
        </div>
        <p className="text-xs text-[color:var(--brand-text-muted)]">
          Sends a real email to the address above using your SMTP settings. If it arrives, all site emails will work too.
        </p>

        {testResult && (
          <div
            className={`mt-2 p-3 rounded-lg text-sm ${
              testResult.ok
                ? 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]'
                : 'bg-[color:var(--brand-blush-tint)] text-[color:var(--brand-text)]'
            }`}
            data-testid="admin-smtp-test-result"
          >
            {testResult.ok ? (
              <p><CheckCircle2 className="h-4 w-4 inline -mt-0.5 mr-1" /> Delivered to <strong>{testResult.delivered_to}</strong> from <strong>{testResult.from}</strong> via {testResult.host}:{testResult.port}.</p>
            ) : (
              <div>
                <p className="font-medium mb-1"><XCircle className="h-4 w-4 inline -mt-0.5 mr-1" /> Test failed{testResult.stage ? ` (at stage: ${testResult.stage})` : ''}</p>
                <p className="text-xs opacity-90 leading-relaxed">{testResult.error}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gmail "send as info@" guide */}
      <div className="border-t border-[color:var(--brand-border)] pt-4">
        <button
          type="button"
          onClick={() => setShowGmailGuide(v => !v)}
          className="link-underline text-sm"
          data-testid="admin-smtp-gmail-guide-toggle"
        >
          <Info className="h-4 w-4 inline mr-1" /> {showGmailGuide ? 'Hide' : 'Show'} step-by-step: reply as info@ from Gmail
        </button>

        {showGmailGuide && (
          <div className="mt-3 rounded-xl border border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)]/50 p-4 space-y-3" data-testid="admin-smtp-gmail-guide">
            <p className="text-sm text-[color:var(--brand-text-muted)]">
              This lets you compose <em>from</em> <b>info@swelldesignla.com</b> inside your regular Gmail account,
              so replies to inquiries look professional (and threads stay in one place).
            </p>

            <div className="space-y-2 text-sm text-[color:var(--brand-text-muted)]">
              <p className="text-[color:var(--brand-text)] font-medium">One-time setup (≈10 min):</p>
              <ol className="space-y-2 list-decimal pl-5 leading-relaxed">
                <li>In Gmail, click the <b>gear icon</b> (top right) → <b>See all settings</b>.</li>
                <li>Open the <b>Accounts and Import</b> tab.</li>
                <li>Under <b>"Send mail as"</b>, click <b>Add another email address</b>.</li>
                <li>
                  Fill in the popup:
                  <ul className="list-disc pl-5 mt-1 space-y-0.5">
                    <li>Name: <b>swell design + media</b></li>
                    <li>Email address: <b>info@swelldesignla.com</b></li>
                    <li>Uncheck <b>"Treat as an alias"</b> so replies keep the info@ From line.</li>
                  </ul>
                  Click <b>Next Step</b>.
                </li>
                <li>
                  On the next screen enter the SMTP details (copy from below):
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <CopyRow label="SMTP SERVER" value={config?.host || 'smtp.hostinger.com'} />
              <CopyRow label="PORT" value={String(config?.port || '587')} />
              <CopyRow label="USERNAME" value={config?.user || 'info@swelldesignla.com'} />
              <div>
                <label className="eyebrow block mb-1">PASSWORD</label>
                <input readOnly className="input-cream text-sm font-mono" value="(the mailbox password you set in Hostinger)" />
              </div>
            </div>
            <p className="text-xs text-[color:var(--brand-text-muted)]">
              Select <b>Secured connection using TLS</b> (recommended), then click <b>Add Account</b>.
            </p>

            <div className="space-y-2 text-sm text-[color:var(--brand-text-muted)]">
              <ol start={6} className="space-y-2 list-decimal pl-5 leading-relaxed">
                <li>Gmail sends a verification email to <b>info@swelldesignla.com</b>. Because that address forwards to your Gmail, the verification email will land in your Gmail inbox within a minute.</li>
                <li>Open that email and click the confirmation link (or copy the confirmation code into the popup that's still open).</li>
                <li>Back in Gmail, when composing or replying, click the <b>From</b> line at the top of the compose window — you'll see the option to send as <b>info@swelldesignla.com</b>.</li>
                <li>Optional: also in <b>Accounts and Import</b>, set <b>"When replying to a message"</b> to <b>"Reply from the same address the message was sent to"</b> so any reply to an inquiry automatically goes out as info@.</li>
              </ol>
              <p className="text-xs">Prefer official docs? <a className="link-underline" href="https://support.google.com/mail/answer/22370" target="_blank" rel="noreferrer">Google's guide <ExternalLink className="inline h-3 w-3" /></a></p>
            </div>
          </div>
        )}
      </div>
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

      <BookingRulesCard />

      <SmtpEmailCard />

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
