import { useSiteAdminData, PageHeader, ToggleRow } from './_shared';
import { Plus, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

const AdminHeaderNavPage = () => {
  const { data, set, save, saving, dirty } = useSiteAdminData();
  if (!data) return <p>Loading…</p>;

  const nav = data.header_nav_items || [];
  const swap = (a, b) => {
    const next = [...nav];
    [next[a], next[b]] = [next[b], next[a]];
    set({ header_nav_items: next });
  };

  return (
    <div className="space-y-6" data-testid="admin-nav-page">
      <PageHeader
        eyebrow="LAYOUT"
        title="Header & navigation"
        subtitle="What appears in the top navigation bar and the menu links."
        saving={saving} dirty={dirty} onSave={save}
        saveTestId="admin-nav-save"
      />

      <div className="card-cream p-6 space-y-4">
        <p className="font-serif text-xl">Header elements</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ToggleRow label="Logo" hint="Business logo (top-left)." checked={data.header_show_logo !== false} onChange={v => set({ header_show_logo: v })} />
          <ToggleRow label="Light/dark theme toggle" hint="Sun/moon button (desktop)." checked={data.header_show_theme_toggle !== false} onChange={v => set({ header_show_theme_toggle: v })} />
          <ToggleRow label="Start inquiry CTA" hint="Primary button on the right." checked={data.header_show_inquire_cta !== false} onChange={v => set({ header_show_inquire_cta: v })} />
        </div>
      </div>

      <div className="card-cream p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="font-serif text-xl">Navigation links</p>
            <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Internal pages start with <code>/</code> (e.g. <code>/gallery</code>). External sites start with <code>https://</code>.</p>
          </div>
          <button
            type="button"
            className="btn-secondary !h-8 text-xs"
            onClick={() => set({ header_nav_items: [...nav, { id: `nav-${Date.now()}`, label: 'New link', href: '/', visible: true, new_tab: false }] })}
            data-testid="admin-nav-item-add"
          ><Plus className="h-3.5 w-3.5" /> Add link</button>
        </div>

        <div className="space-y-2" data-testid="admin-nav-items-list">
          {nav.map((item, idx) => (
            <div key={item.id || idx} className="card-cream p-3 space-y-2" data-testid={`admin-nav-item-${idx}`}>
              <div className="grid grid-cols-1 md:grid-cols-[auto_1.2fr_2fr_auto] gap-2 items-center">
                <div className="h-8 w-8 rounded-full bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)] flex items-center justify-center text-sm font-medium">{idx + 1}</div>
                <input className="input-cream !h-9" placeholder="Label (e.g. Gallery)" value={item.label || ''} onChange={e => { const next = [...nav]; next[idx] = { ...next[idx], label: e.target.value }; set({ header_nav_items: next }); }} />
                <input className="input-cream !h-9" placeholder="Link (e.g. /gallery)" value={item.href || ''} onChange={e => { const next = [...nav]; next[idx] = { ...next[idx], href: e.target.value }; set({ header_nav_items: next }); }} />
                <div className="flex gap-1">
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === 0} onClick={() => swap(idx - 1, idx)} aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] hover:bg-[color:var(--brand-sage-tint)] disabled:opacity-30" disabled={idx === nav.length - 1} onClick={() => swap(idx, idx + 1)} aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[color:var(--brand-border)] text-red-600 hover:bg-red-50" onClick={() => set({ header_nav_items: nav.filter((_, i) => i !== idx) })} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 pl-10">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={item.visible !== false} onChange={e => { const next = [...nav]; next[idx] = { ...next[idx], visible: e.target.checked }; set({ header_nav_items: next }); }} /><span>Visible</span></label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!!item.new_tab} onChange={e => { const next = [...nav]; next[idx] = { ...next[idx], new_tab: e.target.checked }; set({ header_nav_items: next }); }} /><span>Open in new tab</span></label>
              </div>
            </div>
          ))}
          {nav.length === 0 && <p className="text-sm text-[color:var(--brand-text-muted)] italic">No links yet — click "Add link" to create the first one.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminHeaderNavPage;
