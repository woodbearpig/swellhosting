import { useSiteAdminData, PageHeader, ToggleRow, TextField } from './_shared';

const AdminSocialContactPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-social-contact-page">
      <PageHeader
        eyebrow="CONTACT"
        title="Contact & social"
        subtitle="Email, phone, hours, social URLs — used across the footer, coming soon page, and contact page."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-social-save"
      />

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Contact info</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">EMAIL</label><TextField value={data.contact_email || ''} onCommit={v => set({ contact_email: v })} /></div>
          <div><label className="eyebrow block mb-1">PHONE</label><TextField value={data.contact_phone || ''} onCommit={v => set({ contact_phone: v })} /></div>
          <div><label className="eyebrow block mb-1">LOCATION</label><TextField value={data.contact_location || ''} onCommit={v => set({ contact_location: v })} /></div>
          <div><label className="eyebrow block mb-1">HOURS</label><TextField value={data.contact_hours || ''} onCommit={v => set({ contact_hours: v })} /></div>
        </div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Social URLs</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">INSTAGRAM URL</label><TextField value={data.instagram_url || ''} onCommit={v => set({ instagram_url: v })} placeholder="https://instagram.com/handle" /></div>
          <div><label className="eyebrow block mb-1">FACEBOOK URL</label><TextField value={data.facebook_url || ''} onCommit={v => set({ facebook_url: v })} /></div>
          <div><label className="eyebrow block mb-1">PINTEREST URL</label><TextField value={data.pinterest_url || ''} onCommit={v => set({ pinterest_url: v })} /></div>
          <div><label className="eyebrow block mb-1">TIKTOK URL</label><TextField value={data.tiktok_url || ''} onCommit={v => set({ tiktok_url: v })} /></div>
        </div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Page visibility toggles</p>
        <p className="text-sm text-[color:var(--brand-text-muted)] -mt-2">Hide entire sections of the public pages without deleting anything.</p>

        <div>
          <p className="eyebrow mb-2">CONTACT PAGE (/contact)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow label="Page header" checked={data.contact_page_show_header !== false} onChange={v => set({ contact_page_show_header: v })} />
            <ToggleRow label="Contact info block" hint="Email, phone, location, hours." checked={data.contact_page_show_info_block !== false} onChange={v => set({ contact_page_show_info_block: v })} />
            <ToggleRow label="Message form" checked={data.contact_page_show_form !== false} onChange={v => set({ contact_page_show_form: v })} />
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">SERVICES PAGE (/services)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow label="Page header" checked={data.services_page_show_header !== false} onChange={v => set({ services_page_show_header: v })} />
            <ToggleRow label="Services grid" checked={data.services_page_show_grid !== false} onChange={v => set({ services_page_show_grid: v })} />
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">GALLERY PAGE (/gallery)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow label="Page header" checked={data.gallery_page_show_header !== false} onChange={v => set({ gallery_page_show_header: v })} />
            <ToggleRow label="Category filters" checked={data.gallery_page_show_filters !== false} onChange={v => set({ gallery_page_show_filters: v })} />
            <ToggleRow label="Photo grid" checked={data.gallery_page_show_grid !== false} onChange={v => set({ gallery_page_show_grid: v })} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSocialContactPage;
