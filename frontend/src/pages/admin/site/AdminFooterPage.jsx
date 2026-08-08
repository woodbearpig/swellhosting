import { useSiteAdminData, PageHeader, ToggleRow } from './_shared';

const AdminFooterPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-footer-page">
      <PageHeader
        eyebrow="LAYOUT"
        title="Footer"
        subtitle="The bottom of every page — links, newsletter, contact info, copyright."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-footer-save"
      />

      <div className="card-cream p-6 space-y-4">
        <div><label className="eyebrow block mb-1">FOOTER BLURB</label><textarea className="input-cream textarea-cream" rows={2} value={data.footer_blurb || ''} onChange={e => set({ footer_blurb: e.target.value })} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">NEWSLETTER TITLE</label><input className="input-cream" value={data.newsletter_title || ''} onChange={e => set({ newsletter_title: e.target.value })} /></div>
          <div><label className="eyebrow block mb-1">NEWSLETTER SUBTITLE</label><input className="input-cream" value={data.newsletter_subtitle || ''} onChange={e => set({ newsletter_subtitle: e.target.value })} /></div>
        </div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Show / hide footer elements</p>
        <p className="text-sm text-[color:var(--brand-text-muted)] -mt-2">Toggle any block off to hide it from the site footer.</p>
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

      <div className="card-cream p-6">
        <p className="eyebrow mb-1">COPYRIGHT OVERRIDE</p>
        <p className="text-sm text-[color:var(--brand-text-muted)] mb-2">Leave blank for auto: <em>© {new Date().getFullYear()} {data.business_name || 'business name'}. All rights reserved.</em></p>
        <input className="input-cream" value={data.footer_copyright_override || ''} onChange={e => set({ footer_copyright_override: e.target.value })} placeholder="(auto-generated if blank)" />
      </div>
    </div>
  );
};

export default AdminFooterPage;
