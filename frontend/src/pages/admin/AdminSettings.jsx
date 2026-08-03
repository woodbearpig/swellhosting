import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

export const AdminSettings = () => {
  const [subs, setSubs] = useState([]);
  useEffect(() => { api.get('/admin/newsletter').then(r => setSubs(r.data)); }, []);

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div><p className="eyebrow">SYSTEM</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Settings</h1></div>

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

      <div className="card-cream p-6">
        <p className="font-serif text-xl mb-2">Admin credentials</p>
        <p className="text-sm text-[color:var(--brand-text-muted)]">Your admin password is set via the <code>ADMIN_PASSWORD</code> environment variable. Change it in your VPS <code>backend/.env</code> and restart the backend. On next startup, the password will be updated automatically.</p>
      </div>
    </div>
  );
};

export default AdminSettings;
