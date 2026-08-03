import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

const SECTIONS = [
  { key: 'brand', label: 'Brand' },
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About' },
  { key: 'promo', label: 'Promo banner' },
  { key: 'contact', label: 'Contact & social' },
  { key: 'footer', label: 'Footer & newsletter' },
  { key: 'coming_soon', label: 'Coming Soon mode' },
];

export const AdminSiteContent = () => {
  const { refresh } = useSite();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('brand');

  useEffect(() => { api.get('/site-content').then(r => setData(r.data)); }, []);

  if (!data) return <p>Loading…</p>;

  const set = (patch) => setData({ ...data, ...patch });

  const save = async () => {
    await api.put('/admin/site-content', data);
    refresh();
    toast.success('Site content saved');
  };

  return (
    <div className="space-y-6" data-testid="admin-site-content-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Site content</h1></div>
        <button className="btn-primary" onClick={save} data-testid="admin-site-content-save"><Save className="h-4 w-4" /> Save changes</button>
      </div>
      <div className="flex flex-wrap gap-2">{SECTIONS.map(s => (<button key={s.key} onClick={() => setTab(s.key)} className={`chip ${tab === s.key ? 'selected' : ''}`}>{s.label}</button>))}</div>

      <div className="card-cream p-6 space-y-4">
        {tab === 'brand' && (
          <div className="space-y-3">
            <div><label className="eyebrow block mb-1">BUSINESS NAME</label><input className="input-cream" value={data.business_name} onChange={e => set({ business_name: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">TAGLINE</label><input className="input-cream" value={data.tagline} onChange={e => set({ tagline: e.target.value })} /></div>
            <div>
              <label className="eyebrow block mb-1">LOGO</label>
              {data.logo_url && <img src={publicUrl(data.logo_url)} alt="logo" className="h-20 w-auto rounded-lg mb-2" />}
              <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ logo_url: r.url }); } }} />
              <input className="input-cream mt-2" placeholder="Or paste URL" value={data.logo_url || ''} onChange={e => set({ logo_url: e.target.value })} />
            </div>
          </div>
        )}
        {tab === 'hero' && (
          <div className="space-y-3">
            <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.hero_eyebrow} onChange={e => set({ hero_eyebrow: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">HEADLINE</label><textarea className="input-cream textarea-cream" rows={2} value={data.hero_headline} onChange={e => set({ hero_headline: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">SUBHEAD</label><textarea className="input-cream textarea-cream" rows={3} value={data.hero_subhead} onChange={e => set({ hero_subhead: e.target.value })} /></div>
            <div>
              <label className="eyebrow block mb-1">HERO IMAGE</label>
              {data.hero_image_url && <img src={publicUrl(data.hero_image_url)} alt="hero" className="h-32 w-auto rounded-lg mb-2" />}
              <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ hero_image_url: r.url }); } }} />
              <input className="input-cream mt-2" value={data.hero_image_url} onChange={e => set({ hero_image_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="eyebrow block mb-1">PRIMARY CTA LABEL</label><input className="input-cream" value={data.hero_primary_cta_label} onChange={e => set({ hero_primary_cta_label: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">PRIMARY CTA LINK</label><input className="input-cream" value={data.hero_primary_cta_href} onChange={e => set({ hero_primary_cta_href: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">SECONDARY CTA LABEL</label><input className="input-cream" value={data.hero_secondary_cta_label} onChange={e => set({ hero_secondary_cta_label: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">SECONDARY CTA LINK</label><input className="input-cream" value={data.hero_secondary_cta_href} onChange={e => set({ hero_secondary_cta_href: e.target.value })} /></div>
            </div>
          </div>
        )}
        {tab === 'about' && (
          <div className="space-y-3">
            <div><label className="eyebrow block mb-1">ABOUT SHORT (home)</label><textarea className="input-cream textarea-cream" rows={2} value={data.about_short} onChange={e => set({ about_short: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">ABOUT FULL (About page)</label><textarea className="input-cream textarea-cream" rows={6} value={data.about_full} onChange={e => set({ about_full: e.target.value })} /></div>
            <div>
              <label className="eyebrow block mb-1">ABOUT IMAGE</label>
              {data.about_image_url && <img src={publicUrl(data.about_image_url)} alt="about" className="h-32 w-auto rounded-lg mb-2" />}
              <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ about_image_url: r.url }); } }} />
              <input className="input-cream mt-2" value={data.about_image_url} onChange={e => set({ about_image_url: e.target.value })} />
            </div>
            <div><label className="eyebrow block mb-1">DESIGNER NAME</label><input className="input-cream" value={data.designer_name} onChange={e => set({ designer_name: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">DESIGNER BIO</label><textarea className="input-cream textarea-cream" rows={4} value={data.designer_bio} onChange={e => set({ designer_bio: e.target.value })} /></div>
          </div>
        )}
        {tab === 'promo' && (
          <div className="space-y-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!data.promo_active} onChange={e => set({ promo_active: e.target.checked })} /> Show promo banner on homepage</label>
            <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.promo_title} onChange={e => set({ promo_title: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">TEXT</label><textarea className="input-cream textarea-cream" rows={2} value={data.promo_text} onChange={e => set({ promo_text: e.target.value })} /></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="eyebrow block mb-1">CTA LABEL</label><input className="input-cream" value={data.promo_cta_label} onChange={e => set({ promo_cta_label: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">CTA LINK</label><input className="input-cream" value={data.promo_cta_href} onChange={e => set({ promo_cta_href: e.target.value })} /></div>
            </div>
          </div>
        )}
        {tab === 'contact' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className="eyebrow block mb-1">EMAIL</label><input className="input-cream" value={data.contact_email} onChange={e => set({ contact_email: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">PHONE</label><input className="input-cream" value={data.contact_phone} onChange={e => set({ contact_phone: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">LOCATION</label><input className="input-cream" value={data.contact_location} onChange={e => set({ contact_location: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">HOURS</label><input className="input-cream" value={data.contact_hours} onChange={e => set({ contact_hours: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">INSTAGRAM URL</label><input className="input-cream" value={data.instagram_url || ''} onChange={e => set({ instagram_url: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">FACEBOOK URL</label><input className="input-cream" value={data.facebook_url || ''} onChange={e => set({ facebook_url: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">PINTEREST URL</label><input className="input-cream" value={data.pinterest_url || ''} onChange={e => set({ pinterest_url: e.target.value })} /></div>
              <div><label className="eyebrow block mb-1">TIKTOK URL</label><input className="input-cream" value={data.tiktok_url || ''} onChange={e => set({ tiktok_url: e.target.value })} /></div>
            </div>
          </div>
        )}
        {tab === 'footer' && (
          <div className="space-y-3">
            <div><label className="eyebrow block mb-1">FOOTER BLURB</label><textarea className="input-cream textarea-cream" rows={2} value={data.footer_blurb} onChange={e => set({ footer_blurb: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">NEWSLETTER TITLE</label><input className="input-cream" value={data.newsletter_title} onChange={e => set({ newsletter_title: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">NEWSLETTER SUBTITLE</label><input className="input-cream" value={data.newsletter_subtitle} onChange={e => set({ newsletter_subtitle: e.target.value })} /></div>
          </div>
        )}
        {tab === 'coming_soon' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm">
              <p className="font-medium mb-1">⚠️ Coming Soon mode</p>
              <p className="text-[color:var(--brand-text-muted)]">When enabled, all public pages are hidden and replaced with a beautiful Coming Soon page. Your admin panel remains fully accessible at <code>/admin/login</code>. Turn this off anytime to reveal the full site.</p>
            </div>
            <label className="flex items-center gap-3 card-cream p-4 cursor-pointer">
              <input type="checkbox" className="h-5 w-5" checked={!!data.coming_soon_active} onChange={e => set({ coming_soon_active: e.target.checked })} data-testid="admin-coming-soon-toggle" />
              <div>
                <p className="font-medium">Show Coming Soon page instead of the site</p>
                <p className="text-xs text-[color:var(--brand-text-muted)]">Public visitors see only the coming-soon page. Admin still works.</p>
              </div>
            </label>
            <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.coming_soon_eyebrow || ''} onChange={e => set({ coming_soon_eyebrow: e.target.value })} placeholder="SOMETHING BEAUTIFUL IS COMING" /></div>
            <div><label className="eyebrow block mb-1">HEADLINE</label><textarea className="input-cream textarea-cream" rows={2} value={data.coming_soon_title || ''} onChange={e => set({ coming_soon_title: e.target.value })} placeholder="We're styling something dreamy." /></div>
            <div><label className="eyebrow block mb-1">SCRIPT ACCENT (handwritten line)</label><input className="input-cream" value={data.coming_soon_script || ''} onChange={e => set({ coming_soon_script: e.target.value })} placeholder="stay tuned" /></div>
            <div><label className="eyebrow block mb-1">MESSAGE</label><textarea className="input-cream textarea-cream" rows={4} value={data.coming_soon_message || ''} onChange={e => set({ coming_soon_message: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">LAUNCH DATE (optional, free-form)</label><input className="input-cream" value={data.coming_soon_launch_date || ''} onChange={e => set({ coming_soon_launch_date: e.target.value })} placeholder="e.g. Fall 2026" /></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSiteContent;
