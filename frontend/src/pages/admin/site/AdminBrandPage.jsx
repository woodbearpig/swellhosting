import { useSiteAdminData, PageHeader, TextField } from './_shared';
import { uploadFile, publicUrl } from '@/lib/api';
import { FONT_PRESETS, applyFonts } from '@/context/FontContext';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { Type as TypeIcon } from 'lucide-react';

const AdminBrandPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  return (
    <div className="space-y-6" data-testid="admin-brand-page">
      <PageHeader
        eyebrow="IDENTITY"
        title="Brand & fonts"
        subtitle="Business name, tagline, logo, and the three fonts used site-wide."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-brand-save"
      />

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Business identity</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="eyebrow block mb-1">BUSINESS NAME</label><TextField value={data.business_name || ''} onCommit={v => set({ business_name: v })} data-testid="brand-business-name" /></div>
          <div><label className="eyebrow block mb-1">TAGLINE</label><TextField value={data.tagline || ''} onCommit={v => set({ tagline: v })} data-testid="brand-tagline" /></div>
        </div>
        <div>
          <label className="eyebrow block mb-1">LOGO</label>
          {data.logo_url && <img src={publicUrl(data.logo_url)} alt="logo" className="h-20 w-auto rounded-lg mb-2" />}
          <div className="flex items-center gap-2 flex-wrap">
            <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); set({ logo_url: r.url }); } }} />
            <MediaPickerButton testId="media-picker-logo" onSelect={url => set({ logo_url: url })} />
          </div>
          <TextField className="mt-2" placeholder="Or paste URL" value={data.logo_url || ''} onCommit={v => set({ logo_url: v })} />
        </div>
      </div>

      <div className="card-cream p-6 space-y-6">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-[color:var(--brand-blush-tint)] flex items-center justify-center shrink-0">
            <TypeIcon className="h-5 w-5 text-[color:var(--brand-coral)]" />
          </div>
          <div>
            <p className="font-serif text-xl">Typography</p>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-1">HEADLINE FONT</p>
          <p className="text-xs text-[color:var(--brand-text-muted)] mb-2">For headlines site-wide.</p>
          <select className="input-cream" value={data.font_serif_id || 'cormorant'} onChange={e => { set({ font_serif_id: e.target.value }); applyFonts({ serifId: e.target.value, sansId: data.font_sans_id, scriptId: data.font_script_id }); }} data-testid="admin-font-serif">
            {FONT_PRESETS.serif.map(p => <option key={p.id} value={p.id}>{p.name}{p.preview ? ` — ${p.preview}` : ''}</option>)}
          </select>
          <div className="mt-3 card-cream p-5" style={{ fontFamily: (FONT_PRESETS.serif.find(p => p.id === (data.font_serif_id || 'cormorant')) || FONT_PRESETS.serif[0]).family }}>
            <p className="text-3xl leading-tight">Designed for the moments that matter</p>
            <p className="text-lg mt-1 opacity-75">A calm, collaborative process</p>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-1">BODY FONT</p>
          <p className="text-xs text-[color:var(--brand-text-muted)] mb-2">For body copy, buttons, and labels.</p>
          <select className="input-cream" value={data.font_sans_id || 'manrope'} onChange={e => { set({ font_sans_id: e.target.value }); applyFonts({ serifId: data.font_serif_id, sansId: e.target.value, scriptId: data.font_script_id }); }} data-testid="admin-font-sans">
            {FONT_PRESETS.sans.map(p => <option key={p.id} value={p.id}>{p.name}{p.preview ? ` — ${p.preview}` : ''}</option>)}
          </select>
          <div className="mt-3 card-cream p-5" style={{ fontFamily: (FONT_PRESETS.sans.find(p => p.id === (data.font_sans_id || 'manrope')) || FONT_PRESETS.sans[0]).family }}>
            <p className="text-sm uppercase tracking-widest text-[color:var(--brand-text-muted)] mb-2">A short eyebrow label</p>
            <p className="text-base leading-relaxed">This is how paragraph text will read on your site. We style celebrations end-to-end — from balloons to florals, backdrops to signage. Reach out anytime.</p>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-1">SCRIPT / ACCENT FONT</p>
          <p className="text-xs text-[color:var(--brand-text-muted)] mb-2">For decorative accents. Choose <em>None</em> to remove.</p>
          <select className="input-cream" value={data.font_script_id || 'allura'} onChange={e => { set({ font_script_id: e.target.value }); applyFonts({ serifId: data.font_serif_id, sansId: data.font_sans_id, scriptId: e.target.value }); }} data-testid="admin-font-script">
            {FONT_PRESETS.script.map(p => <option key={p.id} value={p.id}>{p.name}{p.preview ? ` — ${p.preview}` : ''}</option>)}
          </select>
          <div className="mt-3 card-cream p-5 text-center" style={{ fontFamily: (FONT_PRESETS.script.find(p => p.id === (data.font_script_id || 'allura')) || FONT_PRESETS.script[0]).family }}>
            <p className="text-5xl leading-tight text-[color:var(--brand-sage-deep)]">a warm welcome</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminBrandPage;
