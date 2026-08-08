import { useSiteAdminData, PageHeader, ToggleRow, TextField, TextArea } from './_shared';
import { uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';

const AdminAboutPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-about-page">
      <PageHeader
        eyebrow="PAGE"
        title="About page"
        subtitle="The story block on your homepage and the full /about page."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-about-save"
      />

      <div className="card-cream p-6 space-y-4">
        <div><label className="eyebrow block mb-1">ABOUT SHORT (home)</label><TextArea rows={2} value={data.about_short || ''} onCommit={v => set({ about_short: v })} /></div>
        <div><label className="eyebrow block mb-1">ABOUT FULL (About page)</label><TextArea rows={6} value={data.about_full || ''} onCommit={v => set({ about_full: v })} /></div>
        <div>
          <label className="eyebrow block mb-1">ABOUT IMAGE</label>
          {data.about_image_url && <img src={publicUrl(data.about_image_url)} alt="about" className="h-32 w-auto rounded-lg mb-2" />}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ about_image_url: r.url }); } }} />
            <MediaPickerButton testId="media-picker-about" onSelect={url => set({ about_image_url: url })} />
          </div>
          <TextField className="mt-2" placeholder="Or paste URL" value={data.about_image_url || ''} onCommit={v => set({ about_image_url: v })} />
        </div>
        <div><label className="eyebrow block mb-1">DESIGNER NAME</label><TextField value={data.designer_name || ''} onCommit={v => set({ designer_name: v })} /></div>
        <div><label className="eyebrow block mb-1">DESIGNER BIO</label><TextArea rows={4} value={data.designer_bio || ''} onCommit={v => set({ designer_bio: v })} /></div>
      </div>

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">About page visibility</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="About page hero image" checked={data.about_show_image !== false} onChange={v => set({ about_show_image: v })} />
          <ToggleRow label="Designer bio block" hint="Name + bio paragraphs." checked={data.about_show_designer !== false} onChange={v => set({ about_show_designer: v })} />
          <ToggleRow label="Call-to-action buttons" hint="Start inquiry + See the work." checked={data.about_show_ctas !== false} onChange={v => set({ about_show_ctas: v })} />
        </div>
      </div>
    </div>
  );
};

export default AdminAboutPage;
