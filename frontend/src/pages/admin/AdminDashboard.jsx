import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Inbox, CalendarClock, Users, TrendingUp, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const StatCard = ({ icon: Icon, label, value, hint }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-cream p-5">
    <div className="flex items-center justify-between">
      <p className="eyebrow">{label}</p>
      <Icon className="h-4 w-4 text-[color:var(--brand-sage-deep)]" />
    </div>
    <p className="font-serif text-3xl mt-2">{value}</p>
    {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">{hint}</p>}
  </motion.div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [upcoming, setUpcoming] = useState([]);

  useEffect(() => {
    (async () => {
      const [s, i, c] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/inquiries'),
        api.get('/admin/consultations'),
      ]);
      setStats(s.data);
      setRecent(i.data.slice(0, 5));
      const today = new Date().toISOString().slice(0, 10);
      setUpcoming(c.data.filter(x => x.date >= today && x.status === 'scheduled').slice(0, 5));
    })();
  }, []);

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <div>
        <p className="eyebrow">DASHBOARD</p>
        <h1 className="font-serif text-3xl sm:text-4xl mt-1">Good to have you back.</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Inbox} label="NEW INQUIRIES" value={stats?.new_inquiries ?? '–'} hint={`${stats?.total_inquiries ?? 0} total`} />
        <StatCard icon={CalendarClock} label="TODAY'S CONSULTS" value={stats?.today_consultations ?? '–'} hint={`${stats?.upcoming_consultations ?? 0} upcoming`} />
        <StatCard icon={Users} label="CLIENTS" value={stats?.total_clients ?? '–'} />
        <StatCard icon={TrendingUp} label="CONVERSION" value={`${stats?.conversion_rate ?? 0}%`} hint="inquiry → booked" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-serif text-xl">Recent inquiries</p>
            <Link to="/admin/inquiries" className="link-underline text-sm">View all</Link>
          </div>
          {recent.length === 0 && <p className="text-sm text-[color:var(--brand-text-muted)]">No inquiries yet. Once one comes in, it'll appear here.</p>}
          <ul className="divide-y divide-[color:var(--brand-border)]">
            {recent.map(i => (
              <li key={i.id}>
                <Link to={`/admin/inquiries/${i.id}`} className="flex items-center justify-between py-3 gap-3">
                  <div>
                    <p className="font-medium">{i.client_name || 'Anonymous'} <span className="text-[color:var(--brand-text-muted)] font-normal">· {(i.event_type || 'inquiry').replace('_', ' ')}</span></p>
                    <p className="text-xs text-[color:var(--brand-text-muted)]">{formatDate(i.created_at)}</p>
                  </div>
                  <span className="badge-soft">{(i.status || 'new').replace('_', ' ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-cream p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-serif text-xl">Upcoming consultations</p>
            <Link to="/admin/consultations" className="link-underline text-sm">View calendar</Link>
          </div>
          {upcoming.length === 0 && <p className="text-sm text-[color:var(--brand-text-muted)]">No upcoming consultations.</p>}
          <ul className="divide-y divide-[color:var(--brand-border)]">
            {upcoming.map(c => (
              <li key={c.id} className="flex items-center justify-between py-3 gap-3">
                <div>
                  <p className="font-medium">{c.client_name}</p>
                  <p className="text-xs text-[color:var(--brand-text-muted)]">{c.date} at {c.time} · {c.consultation_type.replace('_', ' ')}</p>
                </div>
                <span className="badge-soft">{c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card-cream p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[color:var(--brand-sage-deep)] mt-1" />
          <div>
            <p className="font-serif text-xl">Quick tips</p>
            <ul className="text-sm text-[color:var(--brand-text-muted)] mt-2 space-y-1.5 list-disc pl-4">
              <li>Upload new gallery photos regularly to keep your site fresh.</li>
              <li>Update your availability weekly to keep bookings accurate.</li>
              <li>Reply to new inquiries within 1–2 business days for the highest conversion.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
