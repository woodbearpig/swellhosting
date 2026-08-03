import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { SectionHeader } from '@/components/SectionEyebrow';
import { useSite } from '@/context/SiteContext';
import { api } from '@/lib/api';

const ContactPage = () => {
  const { site } = useSite();
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/inquiries', {
        client_name: form.name,
        client_email: form.email,
        client_phone: form.phone,
        event_type: 'other',
        inspiration_notes: form.message,
        source: 'contact_form',
      });
      toast.success('Thanks! We received your message and will be in touch soon.');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch (_) {
      toast.error('Something went wrong. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="container-narrow py-14 sm:py-20" data-testid="contact-page">
      {site?.contact_page_show_header !== false && (
        <SectionHeader eyebrow="CONTACT" title="Say hi" subtitle="Have a quick question, or want to skip the wizard? Send us a note." />
      )}
      <div className={`mt-10 grid grid-cols-1 gap-8 ${site?.contact_page_show_info_block !== false && site?.contact_page_show_form !== false ? 'lg:grid-cols-5' : ''}`}>
        {site?.contact_page_show_info_block !== false && (
        <div className={`card-cream p-6 space-y-4 ${site?.contact_page_show_form !== false ? 'lg:col-span-2' : ''}`} data-testid="contact-info-block">
          {site?.contact_email && (<div className="flex items-start gap-3"><Mail className="h-5 w-5 mt-1 text-[color:var(--brand-sage-deep)]" /><div><p className="eyebrow mb-0.5">EMAIL</p><a href={`mailto:${site.contact_email}`} className="link-underline">{site.contact_email}</a></div></div>)}
          {site?.contact_phone && (<div className="flex items-start gap-3"><Phone className="h-5 w-5 mt-1 text-[color:var(--brand-sage-deep)]" /><div><p className="eyebrow mb-0.5">PHONE</p><p>{site.contact_phone}</p></div></div>)}
          {site?.contact_location && (<div className="flex items-start gap-3"><MapPin className="h-5 w-5 mt-1 text-[color:var(--brand-sage-deep)]" /><div><p className="eyebrow mb-0.5">SERVING</p><p>{site.contact_location}</p></div></div>)}
          {site?.contact_hours && (<div className="flex items-start gap-3"><Clock className="h-5 w-5 mt-1 text-[color:var(--brand-sage-deep)]" /><div><p className="eyebrow mb-0.5">HOURS</p><p>{site.contact_hours}</p></div></div>)}
        </div>
        )}
        {site?.contact_page_show_form !== false && (
        <form onSubmit={submit} className={`card-cream p-6 space-y-4 ${site?.contact_page_show_info_block !== false ? 'lg:col-span-3' : ''}`} data-testid="contact-form">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="eyebrow block mb-2">NAME</label><input required className="input-cream" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} data-testid="contact-name" /></div>
            <div><label className="eyebrow block mb-2">EMAIL</label><input required type="email" className="input-cream" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} data-testid="contact-email" /></div>
          </div>
          <div><label className="eyebrow block mb-2">PHONE (optional)</label><input className="input-cream" value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} data-testid="contact-phone" /></div>
          <div><label className="eyebrow block mb-2">MESSAGE</label><textarea required className="input-cream textarea-cream" rows={5} value={form.message} onChange={e => setForm(f => ({...f, message: e.target.value}))} data-testid="contact-message" /></div>
          <button type="submit" disabled={busy} className="btn-primary" data-testid="contact-submit">{busy ? 'Sending…' : 'Send message'}</button>
        </form>
        )}
      </div>
    </div>
  );
};

export default ContactPage;
