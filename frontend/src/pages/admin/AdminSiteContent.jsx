import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { useSite } from '@/context/SiteContext';

const SECTIONS = [
  { key: 'brand', label: 'Brand' },
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About' },
  { key: 'promo', label: 'Promo banner' },
  { key: 'home', label: 'Home page' },
  { key: 'contact', label: 'Contact & social' },
  { key: 'footer', label: 'Footer & newsletter' },
  { key: 'coming_soon', label: 'Coming Soon mode' },
];

const ToggleRow = ({ label, checked, onChange, hint }) => (
  <label className="flex items-center justify-between gap-3 card-cream p-3 cursor-pointer hover:bg-[color:var(--brand-sage-tint)]/40 transition-colors">
    <div className="flex-1">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-[color:var(--brand-text-muted)] mt-0.5">{hint}</p>}
    </div>
    <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[color:var(--brand-sage)]' : 'bg-[color:var(--brand-border)]'}`}>
      <input type="checkbox" className="sr-only" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <div className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </div>
  </label>
);

const ToggleTextField = ({ label, textValue, onText, placeholder }) => (
  <div>
    <label className="eyebrow block mb-1">{label}</label>
    <input className="input-cream" value={textValue || ''} onChange={e => onText(e.target.value)} placeholder={placeholder} />
  </div>
);

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
        {tab === 'home' && (
          <div className="space-y-8" data-testid="admin-home-tab">
            <div>
              <p className="font-serif text-xl mb-1">Home page sections</p>
              <p className="text-sm text-[color:var(--brand-text-muted)]">Edit the eyebrow, title & subtitle for each section, and toggle any section on/off.</p>
            </div>

            {/* Section visibility */}
            <div>
              <p className="eyebrow mb-2">SECTION VISIBILITY</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Services grid" hint="Shows six featured services on the home page." checked={data.home_services_active !== false} onChange={v => set({ home_services_active: v })} />
                <ToggleRow label="Gallery preview" hint="Recent work strip linking to the full gallery." checked={data.home_gallery_active !== false} onChange={v => set({ home_gallery_active: v })} />
                <ToggleRow label="Process timeline" hint="Numbered step-by-step timeline." checked={data.home_process_active !== false} onChange={v => set({ home_process_active: v })} />
                <ToggleRow label="Testimonials" hint="Client testimonials with rating." checked={data.home_testimonials_active !== false} onChange={v => set({ home_testimonials_active: v })} />
                <ToggleRow label="Meet the designer" hint="Designer bio + photo block." checked={data.home_designer_active !== false} onChange={v => set({ home_designer_active: v })} />
                <ToggleRow label="FAQ preview" hint="Common questions grid + link to full FAQ." checked={data.home_faq_active !== false} onChange={v => set({ home_faq_active: v })} />
                <ToggleRow label="Final call-to-action" hint="Closing 'Ready to plan something dreamy?' card." checked={data.home_final_cta_active !== false} onChange={v => set({ home_final_cta_active: v })} />
              </div>
            </div>

            {/* Section labels */}
            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-2">SERVICES SECTION</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.home_services_eyebrow || ''} onChange={e => set({ home_services_eyebrow: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.home_services_title || ''} onChange={e => set({ home_services_title: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">SUBTITLE</label><input className="input-cream" value={data.home_services_subtitle || ''} onChange={e => set({ home_services_subtitle: e.target.value })} /></div>
              </div>
            </div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-2">GALLERY SECTION</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.home_gallery_eyebrow || ''} onChange={e => set({ home_gallery_eyebrow: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.home_gallery_title || ''} onChange={e => set({ home_gallery_title: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">SUBTITLE</label><input className="input-cream" value={data.home_gallery_subtitle || ''} onChange={e => set({ home_gallery_subtitle: e.target.value })} /></div>
              </div>
            </div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-2">PROCESS SECTION</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.home_process_eyebrow || ''} onChange={e => set({ home_process_eyebrow: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.home_process_title || ''} onChange={e => set({ home_process_title: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">SUBTITLE</label><input className="input-cream" value={data.home_process_subtitle || ''} onChange={e => set({ home_process_subtitle: e.target.value })} /></div>
              </div>

              {/* Process steps editor */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="eyebrow">TIMELINE STEPS</p>
                  <button
                    type="button"
                    className="btn-secondary !h-8 text-xs"
                    onClick={() => set({ home_process_steps: [...(data.home_process_steps || []), { title: 'New step', description: '' }] })}
                    data-testid="admin-process-step-add"
                  ><Plus className="h-3.5 w-3.5" /> Add step</button>
                </div>
                <div className="space-y-2" data-testid="admin-process-steps-list">
                  {(data.home_process_steps || []).map((step, idx) => (
                    <div key={idx} className="card-cream p-3 grid grid-cols-1 md:grid-cols-[auto_1fr_2fr_auto] gap-2 items-start" data-testid={`admin-process-step-${idx}`}>
                      <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium">{idx + 1}</div>
                      <input
                        className="input-cream !h-9"
                        placeholder="Title"
                        value={step.title || ''}
                        onChange={e => {
                          const next = [...data.home_process_steps];
                          next[idx] = { ...next[idx], title: e.target.value };
                          set({ home_process_steps: next });
                        }}
                        data-testid={`admin-process-step-${idx}-title`}
                      />
                      <input
                        className="input-cream !h-9"
                        placeholder="Description"
                        value={step.description || ''}
                        onChange={e => {
                          const next = [...data.home_process_steps];
                          next[idx] = { ...next[idx], description: e.target.value };
                          set({ home_process_steps: next });
                        }}
                        data-testid={`admin-process-step-${idx}-desc`}
                      />
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30"
                          disabled={idx === 0}
                          onClick={() => {
                            const next = [...data.home_process_steps];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            set({ home_process_steps: next });
                          }}
                          aria-label="Move up"
                        ><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button
                          type="button"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30"
                          disabled={idx === (data.home_process_steps || []).length - 1}
                          onClick={() => {
                            const next = [...data.home_process_steps];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            set({ home_process_steps: next });
                          }}
                          aria-label="Move down"
                        ><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button
                          type="button"
                          className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50"
                          onClick={() => {
                            const next = data.home_process_steps.filter((_, i) => i !== idx);
                            set({ home_process_steps: next });
                          }}
                          aria-label="Delete"
                          data-testid={`admin-process-step-${idx}-delete`}
                        ><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {(!data.home_process_steps || data.home_process_steps.length === 0) && (
                    <p className="text-sm text-[color:var(--brand-text-muted)] italic">No steps yet — click "Add step" to create your first one.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-2">TESTIMONIALS SECTION</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.home_testimonials_eyebrow || ''} onChange={e => set({ home_testimonials_eyebrow: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.home_testimonials_title || ''} onChange={e => set({ home_testimonials_title: e.target.value })} /></div>
              </div>
            </div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-2">FAQ SECTION</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.home_faq_eyebrow || ''} onChange={e => set({ home_faq_eyebrow: e.target.value })} /></div>
                <div><label className="eyebrow block mb-1">TITLE</label><input className="input-cream" value={data.home_faq_title || ''} onChange={e => set({ home_faq_title: e.target.value })} /></div>
              </div>
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
          <div className="space-y-6">
            <div><label className="eyebrow block mb-1">FOOTER BLURB</label><textarea className="input-cream textarea-cream" rows={2} value={data.footer_blurb} onChange={e => set({ footer_blurb: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">NEWSLETTER TITLE</label><input className="input-cream" value={data.newsletter_title} onChange={e => set({ newsletter_title: e.target.value })} /></div>
            <div><label className="eyebrow block mb-1">NEWSLETTER SUBTITLE</label><input className="input-cream" value={data.newsletter_subtitle} onChange={e => set({ newsletter_subtitle: e.target.value })} /></div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="font-serif text-xl mb-1">Show / hide footer elements</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mb-4">Toggle any block off to hide it from the site footer.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Logo & tagline column" checked={data.footer_show_logo !== false} onChange={v => set({ footer_show_logo: v })} />
                <ToggleRow label="Explore links column" checked={data.footer_show_explore !== false} onChange={v => set({ footer_show_explore: v })} />
                <ToggleRow label="Contact info column" checked={data.footer_show_contact_block !== false} onChange={v => set({ footer_show_contact_block: v })} />
                <ToggleRow label="Newsletter column" checked={data.footer_show_newsletter !== false} onChange={v => set({ footer_show_newsletter: v })} />
                <ToggleRow label="Email address" checked={data.footer_show_email !== false} onChange={v => set({ footer_show_email: v })} hint="Only shown when contact column is on." />
                <ToggleRow label="Phone number" checked={data.footer_show_phone !== false} onChange={v => set({ footer_show_phone: v })} />
                <ToggleRow label="Location" checked={data.footer_show_location !== false} onChange={v => set({ footer_show_location: v })} />
                <ToggleRow label="Hours" checked={data.footer_show_hours !== false} onChange={v => set({ footer_show_hours: v })} />
                <ToggleRow label="Social icons" checked={data.footer_show_social !== false} onChange={v => set({ footer_show_social: v })} />
                <ToggleRow label="Privacy / Terms links" checked={data.footer_show_legal_links !== false} onChange={v => set({ footer_show_legal_links: v })} />
              </div>
            </div>

            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="eyebrow mb-1">COPYRIGHT OVERRIDE</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mb-2">Leave blank for auto: <em>© {new Date().getFullYear()} {data.business_name || 'business name'}. All rights reserved.</em></p>
              <input className="input-cream" value={data.footer_copyright_override || ''} onChange={e => set({ footer_copyright_override: e.target.value })} placeholder="(auto-generated if blank)" data-testid="admin-footer-copyright-override" />
            </div>
          </div>
        )}
        {tab === 'coming_soon' && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm">
              <p className="font-medium mb-1">⚠️ Coming Soon mode</p>
              <p className="text-[color:var(--brand-text-muted)]">When enabled, all public pages are hidden and replaced with a Coming Soon page. Your admin panel remains fully accessible at <code>/admin/login</code>. Every element below can be toggled and edited independently.</p>
            </div>

            <label className="flex items-center gap-3 card-cream p-4 cursor-pointer">
              <input type="checkbox" className="h-5 w-5" checked={!!data.coming_soon_active} onChange={e => set({ coming_soon_active: e.target.checked })} data-testid="admin-coming-soon-toggle" />
              <div>
                <p className="font-medium">Show Coming Soon page instead of the site</p>
                <p className="text-xs text-[color:var(--brand-text-muted)]">Public visitors see only the coming-soon page. Admin still works.</p>
              </div>
            </label>

            {/* CONTENT SECTION */}
            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="font-serif text-xl mb-4">Page content</p>
              <div className="space-y-4">
                <ToggleTextField label="EYEBROW (small caps line above headline)" enabledKey="__always" active={true} textValue={data.coming_soon_eyebrow} onText={v => set({ coming_soon_eyebrow: v })} placeholder="SOMETHING BEAUTIFUL IS COMING" />
                <div>
                  <label className="eyebrow block mb-1">HEADLINE</label>
                  <textarea className="input-cream textarea-cream" rows={2} value={data.coming_soon_title || ''} onChange={e => set({ coming_soon_title: e.target.value })} placeholder="Leave blank to hide" />
                </div>
                <div>
                  <label className="eyebrow block mb-1">SCRIPT ACCENT (handwritten line)</label>
                  <input className="input-cream" value={data.coming_soon_script || ''} onChange={e => set({ coming_soon_script: e.target.value })} placeholder="e.g. stay tuned — leave blank to hide" />
                </div>
                <div>
                  <label className="eyebrow block mb-1">MESSAGE / DESCRIPTION</label>
                  <textarea className="input-cream textarea-cream" rows={4} value={data.coming_soon_message || ''} onChange={e => set({ coming_soon_message: e.target.value })} placeholder="Leave blank to hide" />
                </div>
                <div>
                  <label className="eyebrow block mb-1">LAUNCH DATE BADGE (optional)</label>
                  <input className="input-cream" value={data.coming_soon_launch_date || ''} onChange={e => set({ coming_soon_launch_date: e.target.value })} placeholder="e.g. Fall 2026 — leave blank to hide" />
                </div>
              </div>
            </div>

            {/* VISIBILITY TOGGLES */}
            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="font-serif text-xl mb-1">Show / hide elements</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mb-4">Toggle any element off to hide it from the Coming Soon page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ToggleRow label="Logo" checked={data.coming_soon_show_logo !== false} onChange={v => set({ coming_soon_show_logo: v })} />
                <ToggleRow label="Newsletter signup form" checked={data.coming_soon_show_newsletter !== false} onChange={v => set({ coming_soon_show_newsletter: v })} />
                <ToggleRow label="Email link" checked={data.coming_soon_show_email !== false} onChange={v => set({ coming_soon_show_email: v })} />
                <ToggleRow label="Phone number" checked={data.coming_soon_show_phone !== false} onChange={v => set({ coming_soon_show_phone: v })} />
                <ToggleRow label="Instagram link" checked={data.coming_soon_show_instagram !== false} onChange={v => set({ coming_soon_show_instagram: v })} />
                <ToggleRow label="Footer / copyright line" checked={data.coming_soon_show_footer !== false} onChange={v => set({ coming_soon_show_footer: v })} />
                <ToggleRow label="Discreet admin link (bottom-right)" checked={data.coming_soon_show_admin_link !== false} onChange={v => set({ coming_soon_show_admin_link: v })} />
              </div>
            </div>

            {/* NEWSLETTER SETTINGS */}
            {data.coming_soon_show_newsletter !== false && (
              <div className="border-t border-[color:var(--brand-border)] pt-6">
                <p className="font-serif text-xl mb-4">Newsletter form</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="eyebrow block mb-1">INPUT PLACEHOLDER</label><input className="input-cream" value={data.coming_soon_newsletter_placeholder || ''} onChange={e => set({ coming_soon_newsletter_placeholder: e.target.value })} placeholder="you@email.com" /></div>
                  <div><label className="eyebrow block mb-1">BUTTON LABEL</label><input className="input-cream" value={data.coming_soon_newsletter_button || ''} onChange={e => set({ coming_soon_newsletter_button: e.target.value })} placeholder="Notify me" /></div>
                </div>
              </div>
            )}

            {/* CONTACT OVERRIDES */}
            <div className="border-t border-[color:var(--brand-border)] pt-6">
              <p className="font-serif text-xl mb-1">Contact info on this page</p>
              <p className="text-sm text-[color:var(--brand-text-muted)] mb-4">Leave overrides blank to use the main site contact info from the Contact tab. Fill any field to show a different value only on the Coming Soon page.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="eyebrow block mb-1">EMAIL OVERRIDE</label>
                  <input className="input-cream" value={data.coming_soon_email_override || ''} onChange={e => set({ coming_soon_email_override: e.target.value })} placeholder={`(defaults to ${data.contact_email || 'contact email'})`} />
                </div>
                <div>
                  <label className="eyebrow block mb-1">PHONE OVERRIDE</label>
                  <input className="input-cream" value={data.coming_soon_phone_override || ''} onChange={e => set({ coming_soon_phone_override: e.target.value })} placeholder={`(defaults to ${data.contact_phone || 'contact phone'})`} />
                </div>
                <div>
                  <label className="eyebrow block mb-1">INSTAGRAM URL OVERRIDE</label>
                  <input className="input-cream" value={data.coming_soon_instagram_override || ''} onChange={e => set({ coming_soon_instagram_override: e.target.value })} placeholder="(defaults to site Instagram)" />
                </div>
                <div>
                  <label className="eyebrow block mb-1">INSTAGRAM LINK LABEL</label>
                  <input className="input-cream" value={data.coming_soon_instagram_label || ''} onChange={e => set({ coming_soon_instagram_label: e.target.value })} placeholder="Follow along" />
                </div>
              </div>
            </div>

            {/* FOOTER OVERRIDE */}
            {data.coming_soon_show_footer !== false && (
              <div className="border-t border-[color:var(--brand-border)] pt-6">
                <p className="font-serif text-xl mb-1">Footer text</p>
                <p className="text-sm text-[color:var(--brand-text-muted)] mb-3">Leave blank for auto: <em>© {new Date().getFullYear()} {data.business_name || 'business name'} · {data.contact_location || 'location'}</em></p>
                <input className="input-cream" value={data.coming_soon_footer_text || ''} onChange={e => set({ coming_soon_footer_text: e.target.value })} placeholder="(auto-generated if blank)" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSiteContent;
