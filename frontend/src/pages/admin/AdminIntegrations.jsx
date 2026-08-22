import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, ExternalLink, RefreshCw, Trash2, Copy, Link as LinkIcon, Info, FileText, Download } from 'lucide-react';
import { api } from '@/lib/api';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';

const Section = ({ title, subtitle, children }) => (
  <section className="card-cream p-6 space-y-4">
    <div>
      <p className="font-serif text-2xl leading-tight">{title}</p>
      {subtitle && <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const StepList = ({ steps }) => (
  <ol className="space-y-2 text-sm text-[color:var(--brand-text-muted)] list-decimal pl-5">
    {steps.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
  </ol>
);

const CopyField = ({ label, value }) => (
  <div>
    <label className="eyebrow block mb-1">{label}</label>
    <div className="flex gap-2">
      <input readOnly className="input-cream flex-1 text-sm font-mono" value={value} />
      <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied'); }}><Copy className="h-4 w-4" /></button>
    </div>
  </div>
);

export const AdminIntegrations = () => {
  const [params, setParams] = useSearchParams();
  const [gcalStatus, setGcalStatus] = useState(null);
  const [gcalForm, setGcalForm] = useState({ client_id: '', client_secret: '' });
  const [igStatus, setIgStatus] = useState(null);
  const [igForm, setIgForm] = useState({ ig_business_account_id: '', access_token: '' });
  const [igLookup, setIgLookup] = useState(null);
  const [showGcalSetup, setShowGcalSetup] = useState(false);
  const [showIgSetup, setShowIgSetup] = useState(false);

  const redirectUri = `${BACKEND_URL}/api/integrations/google/callback`;

  const loadStatuses = async () => {
    try {
      const [g, i] = await Promise.all([
        api.get('/admin/integrations/google/status'),
        api.get('/admin/integrations/instagram/status'),
      ]);
      setGcalStatus(g.data);
      setIgStatus(i.data);
      if (g.data.client_id) setGcalForm(f => ({ ...f, client_id: g.data.client_id }));
      if (i.data.ig_business_account_id) setIgForm(f => ({ ...f, ig_business_account_id: i.data.ig_business_account_id }));
    } catch (_) {}
  };

  useEffect(() => { loadStatuses(); }, []);

  // Handle OAuth callback status
  useEffect(() => {
    if (params.get('gcal_connected')) {
      toast.success('Google Calendar connected!');
      setParams({});
      loadStatuses();
    }
    const err = params.get('gcal_error');
    if (err) {
      toast.error(`Google Calendar connection failed: ${err}`);
      setParams({});
    }
  }, [params]);

  // === Google Calendar handlers ===
  const saveGcalCreds = async () => {
    if (!gcalForm.client_id || !gcalForm.client_secret) { toast.error('Fill both fields'); return; }
    try {
      await api.post('/admin/integrations/google/settings', gcalForm);
      toast.success('Credentials saved. Now click Connect to authorize.');
      setGcalForm(f => ({ ...f, client_secret: '' }));
      loadStatuses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Save failed'); }
  };

  const connectGoogle = async () => {
    try {
      const { data } = await api.get('/admin/integrations/google/authorize');
      window.location.href = data.authorization_url;
    } catch (e) { toast.error(e.response?.data?.detail || 'Could not start OAuth'); }
  };

  const disconnectGoogle = async () => {
    if (!window.confirm('Disconnect Google Calendar? Existing consultation events will remain in your calendar.')) return;
    await api.post('/admin/integrations/google/disconnect', {});
    toast.success('Disconnected');
    loadStatuses();
  };

  // === Instagram handlers ===
  const saveIgSettings = async () => {
    if (!igForm.ig_business_account_id || !igForm.access_token) { toast.error('Fill both fields'); return; }
    try {
      const { data } = await api.post('/admin/integrations/instagram/settings', igForm);
      toast.success(`Connected as @${data.username || 'Instagram'} — fetched ${data.post_count || 0} posts`);
      setIgForm(f => ({ ...f, access_token: '' }));
      loadStatuses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Validation failed'); }
  };

  const lookupIg = async () => {
    if (!igForm.access_token) { toast.error('Paste your access token first, then click Lookup'); return; }
    try {
      const { data } = await api.post('/admin/integrations/instagram/lookup', { access_token: igForm.access_token });
      setIgLookup(data.pages);
      if (data.pages.length === 0) toast.error('No connected Instagram Business account found for this token.');
    } catch (e) { toast.error(e.response?.data?.detail || 'Lookup failed'); }
  };

  const refreshInstagram = async () => {
    try {
      const { data } = await api.post('/admin/integrations/instagram/refresh', {});
      toast.success(`Refreshed — ${data.count || 0} posts cached`);
      loadStatuses();
    } catch (e) { toast.error(e.response?.data?.detail || 'Refresh failed'); }
  };

  const disconnectInstagram = async () => {
    if (!window.confirm('Disconnect Instagram and clear cached posts?')) return;
    await api.post('/admin/integrations/instagram/disconnect', {});
    toast.success('Disconnected');
    loadStatuses();
  };

  return (
    <div className="space-y-6" data-testid="admin-integrations-page">
      <div>
        <p className="eyebrow">SYSTEM</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Integrations</h1>
        <p className="text-[color:var(--brand-text-muted)] mt-2">Connect Google Calendar to auto-sync bookings, and Instagram to show your latest posts on the homepage.</p>
      </div>

      {/* GOOGLE CALENDAR */}
      <Section
        title="Google Calendar"
        subtitle="Auto-adds new consultations to your calendar and blocks conflicting time slots."
      >
        <div className="flex items-center gap-3">
          {gcalStatus?.connected ? (
            <><CheckCircle2 className="h-5 w-5 text-[color:var(--brand-sage-deep)]" /> <span className="font-medium">Connected as {gcalStatus.email}</span></>
          ) : (
            <><XCircle className="h-5 w-5 text-[color:var(--brand-text-muted)]" /> <span>Not connected</span></>
          )}
        </div>

        <button onClick={() => setShowGcalSetup(v => !v)} className="text-sm link-underline">
          <Info className="h-4 w-4 inline mr-1" /> {showGcalSetup ? 'Hide' : 'Show'} step-by-step setup guide
        </button>

        {/* Client-facing PDF guide */}
        <div className="rounded-2xl border border-[color:var(--brand-line)] bg-[color:var(--brand-surface-2)] p-4 flex items-start gap-3" data-testid="oauth-pdf-guide-card">
          <FileText className="h-5 w-5 mt-0.5 text-[color:var(--brand-sage-deep)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight">OAuth setup guide for client (PDF)</p>
            <p className="text-sm text-[color:var(--brand-text-muted)] mt-1">
              A 12-page PDF walkthrough you can email your client — plain English, with a troubleshooting section.
            </p>
          </div>
          <a
            href="/docs/oauth-setup-guide.pdf"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary shrink-0"
            data-testid="oauth-pdf-guide-download"
          >
            <Download className="h-4 w-4" /> Download PDF
          </a>
        </div>

        {showGcalSetup && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-2xl bg-[color:var(--brand-surface-2)] p-5 space-y-4">
            <p className="font-medium">One-time setup (about 5 minutes):</p>
            <StepList steps={[
              <>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1">Google Cloud Console <ExternalLink className="h-3 w-3" /></a> and create a new project (name it anything, e.g. "Swell Bookings").</>,
              <>In the left menu: <b>APIs & Services → Library</b>. Search for <b>Google Calendar API</b> and click <b>Enable</b>.</>,
              <><b>APIs & Services → OAuth consent screen</b>. Choose <b>External</b>, click <b>Create</b>. Fill in App name, your email, and developer contact. Save and continue.</>,
              <>On the <b>Scopes</b> step, click <b>Add or Remove Scopes</b>, search for and add: <code>calendar.events</code> and <code>calendar.readonly</code>. Save.</>,
              <>On <b>Test users</b>, add your own Google email as a test user. Save.</>,
              <><b>APIs & Services → Credentials → Create Credentials → OAuth client ID</b>. Application type: <b>Web application</b>. Name: anything.</>,
              <>Under <b>Authorized redirect URIs</b>, add the URL shown below (copy exactly). Then click <b>Create</b>.</>,
              <>Copy your <b>Client ID</b> and <b>Client Secret</b> from the popup — paste them in the form below.</>,
              <>Click <b>Save credentials</b>, then <b>Connect Google Calendar</b>. Google will ask you to sign in and grant permission — that's it!</>,
            ]} />
            <CopyField label="AUTHORIZED REDIRECT URI" value={redirectUri} />
          </motion.div>
        )}

        {!gcalStatus?.connected && (
          <div className="space-y-3">
            {gcalStatus?.env_configured ? (
              <div className="rounded-2xl bg-[color:var(--brand-sage-tint)] p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-[color:var(--brand-sage-deep)] shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-1">OAuth is pre-configured — one-click connect available</p>
                  <p className="text-sm text-[color:var(--brand-text-muted)] mb-3">Click below, sign in with Gmail, and grant Calendar access.</p>
                  <button onClick={connectGoogle} className="btn-primary" data-testid="gcal-connect-oneclick">
                    <LinkIcon className="h-4 w-4" /> Sign in with Google
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm space-y-2">
                  <p className="font-medium">Manual OAuth credentials — fallback only</p>
                  <p className="text-[color:var(--brand-text-muted)]">Recommended: put <code className="text-xs font-mono">GOOGLE_CLIENT_ID</code> and <code className="text-xs font-mono">GOOGLE_CLIENT_SECRET</code> in your server's <code className="text-xs font-mono">.env</code> (see PDF above). This section then disappears and you get a one-click "Sign in with Google" button.</p>
                  <p className="text-[color:var(--brand-text-muted)]">Can't SSH right now? Paste the same two values here as a browser-based fallback.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="eyebrow block mb-1">CLIENT ID</label><input className="input-cream" value={gcalForm.client_id} onChange={e => setGcalForm(f => ({ ...f, client_id: e.target.value }))} placeholder="xxxxx.apps.googleusercontent.com" data-testid="gcal-client-id" /></div>
                  <div><label className="eyebrow block mb-1">CLIENT SECRET</label><input type="password" className="input-cream" value={gcalForm.client_secret} onChange={e => setGcalForm(f => ({ ...f, client_secret: e.target.value }))} placeholder="GOCSPX-…" data-testid="gcal-client-secret" /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={saveGcalCreds} className="btn-secondary" data-testid="gcal-save">Save credentials</button>
                  {gcalStatus?.client_id && gcalStatus?.has_client_secret && (
                    <button onClick={connectGoogle} className="btn-primary" data-testid="gcal-connect"><LinkIcon className="h-4 w-4" /> Connect Google Calendar</button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {gcalStatus?.connected && (
          <div className="flex gap-2">
            <button onClick={connectGoogle} className="btn-secondary">Reconnect (change account)</button>
            <button onClick={disconnectGoogle} className="btn-secondary text-red-600" data-testid="gcal-disconnect"><Trash2 className="h-4 w-4" /> Disconnect</button>
          </div>
        )}
      </Section>

      {/* INSTAGRAM */}
      <Section
        title="Instagram feed"
        subtitle="Shows your latest 12 Instagram posts on the homepage. Refreshes hourly."
      >
        <div className="flex items-center gap-3">
          {igStatus?.configured ? (
            <><CheckCircle2 className="h-5 w-5 text-[color:var(--brand-sage-deep)]" /> <span className="font-medium">@{igStatus.username || igStatus.ig_business_account_id}</span> <span className="text-sm text-[color:var(--brand-text-muted)]">· {igStatus.post_count} posts cached</span></>
          ) : (
            <><XCircle className="h-5 w-5 text-[color:var(--brand-text-muted)]" /> <span>Not connected</span></>
          )}
        </div>
        {igStatus?.last_error && <p className="text-sm text-red-600">Last error: {igStatus.last_error}</p>}

        <button onClick={() => setShowIgSetup(v => !v)} className="text-sm link-underline">
          <Info className="h-4 w-4 inline mr-1" /> {showIgSetup ? 'Hide' : 'Show'} step-by-step setup guide
        </button>

        {showIgSetup && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="rounded-2xl bg-[color:var(--brand-surface-2)] p-5 space-y-4">
            <p className="font-medium">One-time setup (about 10 minutes):</p>
            <StepList steps={[
              <>Your Instagram must be a <b>Professional</b> account (Business or Creator). Open the Instagram app → <b>Edit profile</b> → <b>Switch to Professional Account</b> if not already.</>,
              <>Create a Facebook Page for your business (if you don't have one) at <a className="link-underline" href="https://facebook.com/pages/create" target="_blank" rel="noreferrer">facebook.com/pages/create</a>.</>,
              <>In the Instagram app: <b>Edit profile</b> → <b>Page</b> → connect it to your Facebook Page.</>,
              <>Go to <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1">developers.facebook.com <ExternalLink className="h-3 w-3" /></a> and click <b>My Apps → Create App</b>. Use case: <b>Other</b>, type: <b>Business</b>.</>,
              <>In your app dashboard, add products: <b>Facebook Login for Business</b> and <b>Instagram</b>.</>,
              <>Open <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="link-underline inline-flex items-center gap-1">Graph API Explorer <ExternalLink className="h-3 w-3" /></a>. Select your app, then click <b>Generate Access Token</b>.</>,
              <>In the permissions dialog, add: <code>instagram_basic</code>, <code>pages_show_list</code>, <code>pages_read_engagement</code>. Grant access with the Facebook account that manages your Instagram.</>,
              <>Copy the generated <b>User Access Token</b> (this is short-lived). Paste it into the field below and click <b>Look up my Instagram account</b>. We'll find your Business Account ID and validate the token.</>,
              <><b>Recommended:</b> Use <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" rel="noreferrer" className="link-underline">Access Token Debugger</a> to <b>Extend Access Token</b> to 60 days before pasting.</>,
              <>After 60 days the token expires — just repeat step 6–9 to renew.</>,
            ]} />
          </motion.div>
        )}

        <div className="space-y-3">
          <div><label className="eyebrow block mb-1">LONG-LIVED ACCESS TOKEN</label>
            <div className="flex gap-2">
              <input type="password" className="input-cream flex-1" value={igForm.access_token} onChange={e => setIgForm(f => ({ ...f, access_token: e.target.value }))} placeholder="EAAG…" data-testid="ig-token" />
              <button onClick={lookupIg} className="btn-secondary">Look up ID</button>
            </div>
          </div>

          {igLookup && igLookup.length > 0 && (
            <div className="card-cream p-4 space-y-2">
              <p className="text-sm font-medium">Found Instagram accounts:</p>
              {igLookup.map(p => (
                <button key={p.ig_business_account_id} onClick={() => { setIgForm(f => ({ ...f, ig_business_account_id: p.ig_business_account_id })); setIgLookup(null); toast.success(`Selected @${p.username}`); }} className="w-full text-left flex items-center justify-between hover:bg-[color:var(--brand-sage-tint)] p-2 rounded">
                  <span>@{p.username} <span className="text-xs text-[color:var(--brand-text-muted)]">· Page: {p.page_name}</span></span>
                  <span className="text-xs font-mono">{p.ig_business_account_id}</span>
                </button>
              ))}
            </div>
          )}

          <div><label className="eyebrow block mb-1">IG BUSINESS ACCOUNT ID</label><input className="input-cream" value={igForm.ig_business_account_id} onChange={e => setIgForm(f => ({ ...f, ig_business_account_id: e.target.value }))} placeholder="17841…" data-testid="ig-account-id" /></div>

          <div className="flex gap-2">
            <button onClick={saveIgSettings} className="btn-primary" data-testid="ig-save">Save & fetch posts</button>
            {igStatus?.configured && (
              <>
                <button onClick={refreshInstagram} className="btn-secondary" data-testid="ig-refresh"><RefreshCw className="h-4 w-4" /> Refresh feed</button>
                <button onClick={disconnectInstagram} className="btn-secondary text-red-600"><Trash2 className="h-4 w-4" /> Disconnect</button>
              </>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default AdminIntegrations;
