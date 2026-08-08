import { useSiteAdminData, PageHeader, ToggleRow, TextField, TextArea } from './_shared';

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
        <div><label className="eyebrow block mb-1">EYEBROW</label><TextField value={data.coming_soon_eyebrow || ''} onCommit={v => set({ coming_soon_eyebrow: v })} placeholder="SOMETHING BEAUTIFUL IS COMING" /></div>
        <div><label className="eyebrow block mb-1">HEADLINE</label><TextArea rows={2} value={data.coming_soon_title || ''} onCommit={v => set({ coming_soon_title: v })} placeholder="Leave blank to hide" /></div>
        <div><label className="eyebrow block mb-1">SCRIPT ACCENT (handwritten line)</label><TextField value={data.coming_soon_script || ''} onCommit={v => set({ coming_soon_script: v })} placeholder="e.g. stay tuned" /></div>
        <div><label className="eyebrow block mb-1">MESSAGE</label><TextArea rows={4} value={data.coming_soon_message || ''} onCommit={v => set({ coming_soon_message: v })} /></div>
        <div><label className="eyebrow block mb-1">LAUNCH DATE BADGE (optional)</label><TextField value={data.coming_soon_launch_date || ''} onCommit={v => set({ coming_soon_launch_date: v })} placeholder="e.g. Fall 2026" /></div>
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
            <div><label className="eyebrow block mb-1">INPUT PLACEHOLDER</label><TextField value={data.coming_soon_newsletter_placeholder || ''} onCommit={v => set({ coming_soon_newsletter_placeholder: v })} placeholder="you@email.com" /></div>
            <div><label className="eyebrow block mb-1">BUTTON LABEL</label><TextField value={data.coming_soon_newsletter_button || ''} onCommit={v => set({ coming_soon_newsletter_button: v })} placeholder="Notify me" /></div>
          </div>
        </div>
      )}

      <div className="card-cream p-6 space-y-3">
        <p className="font-serif text-xl">Contact overrides</p>
        <p className="text-sm text-[color:var(--brand-text-muted)]">Leave blank to inherit from Contact &amp; social. Fill any field to override just on this page.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EMAIL OVERRIDE</label><TextField value={data.coming_soon_email_override || ''} onCommit={v => set({ coming_soon_email_override: v })} placeholder={`(defaults to ${data.contact_email || 'contact email'})`} /></div>
          <div><label className="eyebrow block mb-1">PHONE OVERRIDE</label><TextField value={data.coming_soon_phone_override || ''} onCommit={v => set({ coming_soon_phone_override: v })} placeholder={`(defaults to ${data.contact_phone || 'contact phone'})`} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM URL OVERRIDE</label><TextField value={data.coming_soon_instagram_override || ''} onCommit={v => set({ coming_soon_instagram_override: v })} /></div>
          <div><label className="eyebrow block mb-1">INSTAGRAM LINK LABEL</label><TextField value={data.coming_soon_instagram_label || ''} onCommit={v => set({ coming_soon_instagram_label: v })} placeholder="Follow along" /></div>
        </div>
      </div>

      {data.coming_soon_show_footer !== false && (
        <div className="card-cream p-6 space-y-3">
          <p className="font-serif text-xl">Footer text</p>
          <TextField value={data.coming_soon_footer_text || ''} onCommit={v => set({ coming_soon_footer_text: v })} placeholder="(auto-generated if blank)" />
        </div>
      )}
    </div>
  );
};

export default AdminComingSoonPage;
