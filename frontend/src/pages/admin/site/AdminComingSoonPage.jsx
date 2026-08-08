import { useSiteAdminData, PageHeader, ToggleRow } from './_shared';

const AdminComingSoonPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-coming-soon-page">
      <PageHeader
        eyebrow="PAGE"
        title="Coming soon"
        subtitle="Turn the entire public site into a coming-soon landing page. Admin stays accessible."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-coming-soon-save"
      />

      <div className="rounded-2xl bg-[color:var(--brand-blush-tint)] p-4 text-sm">
        <p className="font-medium mb-1">⚠️ Coming Soon mode</p>
        <p className="text-[color:var(--brand-text-muted)]">When enabled, all public pages are hidden and replaced with a Coming Soon page. Your admin panel remains fully accessible at <code>/admin/login</code>.</p>
      </div>

      <label className="flex items-center gap-3 card-cream p-4 cursor-pointer">
        <input type="checkbox" className="h-5 w-5" checked={!!data.coming_soon_active} onChange={e => set({ coming_soon_active: e.target.checked })} data-testid="admin-coming-soon-toggle" />
        <div>
          <p className="font-medium">Show Coming Soon page instead of the site</p>
          <p className="text-xs text-[color:var(--brand-text-muted)]">Public visitors see only the coming-soon page. Admin still works.</p>
        </div>
      </label>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Page content</p>
        <div><label className="eyebrow block mb-1">EYEBROW</label><input className="input-cream" value={data.coming_soon_eyebrow || ''} onChange={e => set({ coming_soon_eyebrow: e.target.value })} placeholder="SOMETHING BEAUTIFUL IS COMING" /></div>
        <div><label className="eyebrow block mb-1">HEADLINE</label><textarea className="input-cream textarea-cream" rows={2} value={data.coming_soon_title || ''} onChange={e => set({ coming_soon_title: e.target.value })} placeholder="Leave blank to hide" /></div>
        <div><label className="eyebrow block mb-1">SCRIPT ACCENT (handwritten line)</label><input className="input-cream" value={data.coming_soon_script || ''} onChange={e => set({ coming_soon_script: e.target.value })} placeholder="e.g. stay tuned" /></div>
        <div><label className="eyebrow block mb-1">MESSAGE</label><textarea className="input-cream textarea-cream" rows={4} value={data.coming_soon_message || ''} onChange={e => set({ coming_soon_message: e.target.value })} /></div>
        <div><label className="eyebrow block mb-1">LAUNCH DATE BADGE (optional)</label><input className="input-cream" value={data.coming_soon_launch_date || ''} onChange={e => set({ coming_soon_launch_date: e.target.value })} placeholder="e.g. Fall 2026" /></div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Show / hide elements</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="Logo" checked={data.coming_soon_show_logo !== false} onChange={v => set({ coming_soon_show_logo: v })} />
          <ToggleRow label="Newsletter signup form" checked={data.coming_soon_show_newsletter !== false} onChange={v => set({ coming_soon_show_newsletter: v })} />
          <ToggleRow label="Email link" checked={data.coming_soon_show_email !== false} onChange={v => set({ coming_soon_show_email: v })} />
          <ToggleRow label="Phone number" checked={data.coming_soon_show_phone !== false} onChange={v => set({ coming_soon_show_phone: v })} />
          <ToggleRow label="Instagram link" checked={data.coming_soon_show_instagram !== false} onChange={v => set({ coming_soon_show_instagram: v })} />
          <ToggleRow label="Footer / copyright" checked={data.coming_soon_show_footer !== false} onChange={v => set({ coming_soon_show_footer: v })} />
          <ToggleRow label="Discreet admin link" checked={data.coming_soon_show_admin_link !== false} onChange={v => set({ coming_soon_show_admin_link: v })} />
        </div>
      </div>

      {data.coming_soon_show_newsletter !== false && (
        <div className="card-cream p-6 space-y-3">
          <p className="font-serif text-xl">Newsletter form</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="eyebrow block mb-1">INPUT PLACEHOLDER</label><input className="input-cream" value={data.coming_soon_newsletter_placeholder || ''} onChange={e => set({ coming_soon_newsletter_placeholder: e.target.value })} placeholder="you@email.com" /></div>
            <div><label className="eyebrow block mb-1">BUTTON LABEL</label><input className="input-cream" value={data.coming_soon_newsletter_button || ''} onChange={e => set({ coming_soon_newsletter_button: e.target.value })} placeholder="Notify me" /></div>
          </div>
        </div>
      )}

      <div className="card-cream p-6 space-y-3">
        <p className="font-serif text-xl">Contact overrides</p>
        <p className="text-sm text-[color:var(--brand-text-muted)]">Leave blank to inherit from Contact &amp; social. Fill any field to override just on this page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EMAIL OVERRIDE</label><input className="input-cream" value={data.coming_soon_email_override || ''} onChange={e => set({ coming_soon_email_override: e.target.value })} placeholder={`(defaults to ${data.contact_email || 'contact email'})`} /></div>
          <div><label className="eyebrow block mb-1">PHONE OVERRIDE</label><input className="input-cream" value={data.coming_soon_phone_override || ''} onChange={e => set({ coming_soon_phone_override: e.target.value })} placeholder={`(defaults to ${data.contact_phone || 'contact phone'})`} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM URL OVERRIDE</label><input className="input-cream" value={data.coming_soon_instagram_override || ''} onChange={e => set({ coming_soon_instagram_override: e.target.value })} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM LINK LABEL</label><input className="input-cream" value={data.coming_soon_instagram_label || ''} onChange={e => set({ coming_soon_instagram_label: e.target.value })} placeholder="Follow along" /></div>
        </div>
      </div>

      {data.coming_soon_show_footer !== false && (
        <div className="card-cream p-6 space-y-3">
          <p className="font-serif text-xl">Footer text</p>
          <input className="input-cream" value={data.coming_soon_footer_text || ''} onChange={e => set({ coming_soon_footer_text: e.target.value })} placeholder="(auto-generated if blank)" />
        </div>
      )}
    </div>
  );
};

export default AdminComingSoonPage;
