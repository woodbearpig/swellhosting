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
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div className="sm:col-span-2">
              <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Layout</label>
              <select
                className="input-cream !h-9 text-sm w-full"
                value={data.about_image_layout || 'side'}
                onChange={e => set({ about_image_layout: e.target.value })}
                data-testid="admin-about-image-layout"
              >
                <option value="side">Beside the text (side by side)</option>
                <option value="stacked">Above the text (full width) — best for wide photos</option>
                <option value="sticky">Beside the text, follows scroll (sticky)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Ratio</label>
              <select
                className="input-cream !h-9 text-sm"
                value={data.about_image_aspect || 'portrait'}
                onChange={e => set({ about_image_aspect: e.target.value })}
                data-testid="admin-about-image-aspect"
              >
                <option value="portrait">Portrait (4:5)</option>
                <option value="landscape">Landscape (4:3)</option>
                <option value="wide">Wide (2:1)</option>
                <option value="square">Square (1:1)</option>
                <option value="auto">Auto (use image's own)</option>
                <option value="fill">Fill (match text height)</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] block mb-1 uppercase tracking-wider text-[color:var(--brand-text-muted)]">Fit</label>
              <select
                className="input-cream !h-9 text-sm"
                value={data.about_image_fit || 'cover'}
                onChange={e => set({ about_image_fit: e.target.value })}
                data-testid="admin-about-image-fit"
              >
                <option value="cover">Fill (crops to frame)</option>
                <option value="contain">Fit (show whole photo)</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-[color:var(--brand-text-muted)] mt-2 leading-snug max-w-xl">
            <b>Wide diptych photo?</b> Pick <em>Above the text (full width)</em> as the Layout with <em>Auto</em> ratio — both halves stay visible, no whitespace, no cropping.
          </p>
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

      <div className="card-cream p-6 space-y-4" data-testid="admin-share-meta-card">
        <div>
          <p className="font-serif text-xl">Social share preview & browser tab</p>
          <p className="text-sm text-[color:var(--brand-text-muted)] mt-1 max-w-2xl">
            Controls how your site looks when someone posts the link in iMessage, an Instagram DM, Slack, Facebook or Twitter — plus the icon and title in the browser tab. Everything is optional; blank values fall back to sensible defaults using your business name and tagline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="eyebrow block mb-1">SHARE TITLE</label>
            <TextField
              value={data.share_title || ''}
              onCommit={v => set({ share_title: v })}
              placeholder={`${data.business_name || 'swell design + media'} — ${data.tagline || 'LA event styling'}`}
            />
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Shown as the big bold headline on the link preview card. Keep under ~60 chars.</p>
          </div>
          <div>
            <label className="eyebrow block mb-1">TWITTER / X HANDLE (OPTIONAL)</label>
            <TextField
              value={data.share_twitter_handle || ''}
              onCommit={v => set({ share_twitter_handle: v })}
              placeholder="@swelldesignla"
            />
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Attributes the preview to your account on Twitter/X shares.</p>
          </div>
        </div>

        <div>
          <label className="eyebrow block mb-1">SHARE DESCRIPTION</label>
          <TextArea
            rows={2}
            value={data.share_description || ''}
            onCommit={v => set({ share_description: v })}
            placeholder="1-2 sentences describing what people will see when they click. Falls back to your tagline if blank."
          />
        </div>

        <div>
          <label className="eyebrow block mb-1">SHARE IMAGE (1200×630 RECOMMENDED)</label>
          {data.share_image_url ? (
            <div className="mb-2 relative inline-block">
              <img src={publicUrl(data.share_image_url)} alt="share preview" className="h-32 w-auto rounded-lg border border-[color:var(--brand-border)]" />
              <button
                type="button"
                onClick={() => set({ share_image_url: '' })}
                className="absolute -top-2 -right-2 h-6 px-2 rounded-full bg-white/95 border border-[color:var(--brand-border)] text-xs hover:bg-red-50 hover:text-red-600"
                title="Reset to the built-in default share image"
              >Reset</button>
            </div>
          ) : (
            <p className="text-xs text-[color:var(--brand-text-muted)] mb-2">Using the built-in default (cream + "s" mark). Upload a hero shot to replace it.</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ share_image_url: r.url }); } }} data-testid="admin-share-image-upload" />
            <MediaPickerButton testId="media-picker-share" onSelect={url => set({ share_image_url: url })} />
          </div>
          <TextField className="mt-2" placeholder="Or paste image URL" value={data.share_image_url || ''} onCommit={v => set({ share_image_url: v })} />
        </div>

        <div className="border-t border-[color:var(--brand-border)] pt-4">
          <label className="eyebrow block mb-1">FAVICON (BROWSER TAB ICON)</label>
          {data.favicon_url ? (
            <div className="mb-2 flex items-center gap-3">
              <img src={publicUrl(data.favicon_url)} alt="favicon" className="h-8 w-8 rounded border border-[color:var(--brand-border)] bg-white p-1" />
              <button
                type="button"
                onClick={() => set({ favicon_url: '' })}
                className="text-xs px-2 py-1 rounded-lg border border-[color:var(--brand-border)] hover:bg-red-50 hover:text-red-600"
              >Reset to default</button>
            </div>
          ) : (
            <div className="mb-2 flex items-center gap-3">
              <img src="/apple-touch-icon.png" alt="default favicon" className="h-8 w-8 rounded border border-[color:var(--brand-border)]" />
              <span className="text-xs text-[color:var(--brand-text-muted)]">Using the built-in default. Upload a square PNG (at least 180×180) to replace it.</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/x-icon" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ favicon_url: r.url }); } }} data-testid="admin-favicon-upload" />
            <MediaPickerButton testId="media-picker-favicon" onSelect={url => set({ favicon_url: url })} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAboutPage;
