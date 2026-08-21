import { useEffect, useState, useCallback, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { Activity, Cpu, MemoryStick, HardDrive, Database, Inbox, FolderOpen, RefreshCw, AlertTriangle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

/**
 * AdminSystemPage — read-only health dashboard for the env-defined super
 * admin. Combines server-level resource metrics (RAM/CPU/disk/uptime),
 * app-level volume metrics (inquiries, media library, content counts),
 * and MongoDB storage stats. Auto-refreshes every 30s.
 *
 * Access control:
 *   • Client-side: redirects non-super admins to /admin (cosmetic only).
 *   • Server-side: /api/admin/system-stats returns 404 for anyone but the
 *     env-configured super admin. This is the real enforcement.
 */
const AUTO_REFRESH_MS = 30_000;

// ---------- formatters ----------
const fmtBytes = (n) => {
  if (n == null) return '—';
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
};

const fmtDuration = (seconds) => {
  if (!seconds || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const pctColor = (pct) => {
  if (pct >= 85) return 'text-red-600';
  if (pct >= 60) return 'text-amber-600';
  return 'text-[color:var(--brand-sage-deep)]';
};

// ---------- primitives ----------
const StatBar = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, Number(pct) || 0));
  const color = clamped >= 85 ? 'bg-red-500' : clamped >= 60 ? 'bg-amber-500' : 'bg-[color:var(--brand-sage-deep)]';
  return (
    <div className="w-full h-2 rounded-full bg-[color:var(--brand-border)]/40 overflow-hidden" data-testid="stat-bar">
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${clamped}%` }} />
    </div>
  );
};

const StatCard = ({ icon: Icon, title, primary, secondary, pct, testId }) => (
  <div className="card-cream p-5 space-y-3" data-testid={testId}>
    <div className="flex items-center justify-between">
      <p className="eyebrow flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /> {title}</p>
      {pct != null && <span className={`text-xs font-medium ${pctColor(pct)}`}>{pct}%</span>}
    </div>
    <p className="font-serif text-2xl">{primary}</p>
    {secondary && <p className="text-xs text-[color:var(--brand-text-muted)]">{secondary}</p>}
    {pct != null && <StatBar pct={pct} />}
  </div>
);

// ---------- page ----------
const AdminSystemPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const timer = useRef(null);

  const fetchStats = useCallback(async ({ silent } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/admin/system-stats');
      setStats(data);
      setLastFetched(new Date());
    } catch (e) {
      // 404 here means someone bypassed the client-side gate; the backend
      // is refusing to acknowledge the endpoint exists.
      if (e?.response?.status === 404) {
        setError('This page is not available for your account.');
      } else {
        setError(e?.response?.data?.detail || 'Could not load system stats');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user?.is_super_admin) return;
    fetchStats();
    timer.current = setInterval(() => fetchStats({ silent: true }), AUTO_REFRESH_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [user?.is_super_admin, fetchStats]);

  if (authLoading) return <div>Loading…</div>;
  // Cosmetic client-side gate. Real gate is on the backend.
  if (!user?.is_super_admin) return <Navigate to="/admin" replace />;

  const s = stats?.server;
  const a = stats?.app;
  const m = stats?.mongo;

  return (
    <div className="space-y-6" data-testid="admin-system-page">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> SUPPORT · SUPER ADMIN</p>
          <h1 className="font-serif text-3xl mt-1">System health</h1>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
            Live server, app volume, and database stats. Auto-refreshes every 30 seconds. Only visible to the support account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetched && (
            <span className="text-xs text-[color:var(--brand-text-muted)] hidden sm:inline">Updated {lastFetched.toLocaleTimeString()}</span>
          )}
          <button
            type="button"
            onClick={() => fetchStats().then(() => toast.success('Refreshed'))}
            disabled={loading}
            className="btn-secondary text-sm !h-9"
            data-testid="admin-system-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3" data-testid="admin-system-error">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading && !stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="card-cream p-5 h-32 animate-pulse" />)}
        </div>
      ) : stats ? (
        <>
          {/* Server row */}
          <section>
            <p className="eyebrow mb-2">SERVER</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                icon={MemoryStick}
                title="Memory"
                primary={`${fmtBytes(s?.ram_used_bytes)}`}
                secondary={`of ${fmtBytes(s?.ram_total_bytes)} · ${fmtBytes(s?.ram_available_bytes)} free`}
                pct={s?.ram_pct}
                testId="admin-system-ram"
              />
              <StatCard
                icon={Cpu}
                title={`CPU (${s?.cpu_cores} cores)`}
                primary={`${s?.cpu_pct_1m ?? '—'}%`}
                secondary={`1m ${s?.cpu_pct_1m}% · 5m ${s?.cpu_pct_5m}% · 15m ${s?.cpu_pct_15m}%`}
                pct={s?.cpu_pct_1m}
                testId="admin-system-cpu"
              />
              <StatCard
                icon={HardDrive}
                title="Disk"
                primary={`${fmtBytes(s?.disk_used_bytes)}`}
                secondary={`of ${fmtBytes(s?.disk_total_bytes)} · ${fmtBytes(s?.disk_free_bytes)} free`}
                pct={s?.disk_pct}
                testId="admin-system-disk"
              />
              <StatCard
                icon={Clock}
                title="Uptime"
                primary={fmtDuration(s?.uptime_seconds)}
                secondary="Since last reboot"
                testId="admin-system-uptime"
              />
            </div>
          </section>

          {/* App volume */}
          <section>
            <p className="eyebrow mb-2">APP VOLUME</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                icon={Inbox}
                title="Inquiries"
                primary={a?.inquiries_total ?? 0}
                secondary={`${a?.inquiries_last_7d ?? 0} last 7d · ${a?.inquiries_last_30d ?? 0} last 30d`}
                testId="admin-system-inquiries"
              />
              <StatCard
                icon={FolderOpen}
                title="Media library"
                primary={fmtBytes(a?.uploads_bytes)}
                secondary={`${a?.uploads_files ?? 0} files on disk · ${a?.counts?.media_assets ?? 0} assets in DB`}
                testId="admin-system-media"
              />
              <StatCard
                icon={Database}
                title="MongoDB"
                primary={fmtBytes(m?.storage_size)}
                secondary={`${m?.objects ?? 0} docs across ${m?.collections ?? 0} collections`}
                testId="admin-system-mongo"
              />
              <div className="card-cream p-5 space-y-2" data-testid="admin-system-inquiry-breakdown">
                <p className="eyebrow flex items-center gap-1.5"><Inbox className="h-3.5 w-3.5" /> INQUIRY STATUS</p>
                {(a?.status_breakdown || []).length === 0 ? (
                  <p className="text-sm text-[color:var(--brand-text-muted)]">No inquiries yet.</p>
                ) : (
                  <ul className="text-sm space-y-1">
                    {(a?.status_breakdown || []).slice(0, 5).map(row => (
                      <li key={row.status} className="flex justify-between">
                        <span className="capitalize text-[color:var(--brand-text-muted)]">{row.status}</span>
                        <span className="font-medium">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* Content counts table */}
          <section>
            <p className="eyebrow mb-2">CONTENT INVENTORY</p>
            <div className="card-cream p-5" data-testid="admin-system-content-counts">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(a?.counts || {}).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-[color:var(--brand-surface-2)]/40 p-3">
                    <p className="text-xs text-[color:var(--brand-text-muted)] capitalize">{k.replace(/_/g, ' ')}</p>
                    <p className="font-serif text-xl mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <p className="text-xs text-[color:var(--brand-text-muted)]">
            Generated at {stats.generated_at}
          </p>
        </>
      ) : null}
    </div>
  );
};

export default AdminSystemPage;
