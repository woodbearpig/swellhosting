import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FolderOpen, Search, X, Check } from 'lucide-react';
import { api, publicUrl } from '@/lib/api';

/**
 * MediaPickerDialog — modal that lets the admin browse the Media Library
 * and select an image URL to insert into any existing image field.
 *
 * Props:
 *   open       (bool)  — whether the modal is visible
 *   onClose    (fn)    — called to dismiss without picking
 *   onSelect   (fn)    — called with the selected asset URL
 *   title      (str)   — optional heading override (defaults to "Insert from library")
 *   accept     (str)   — optional filter, e.g. "image" (currently images only)
 */
export const MediaPickerDialog = ({ open, onClose, onSelect, title = 'Insert from library' }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (tag) params.tag = tag;
      const { data } = await api.get('/admin/media', { params });
      setAssets(data);
    } catch (e) {
      toast.error('Could not load media library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, tag]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const uniqueTags = Array.from(new Set(assets.flatMap(a => a.tags || []))).sort();
  const chosen = assets.find(a => a.id === selectedId);

  const confirm = () => {
    if (!chosen) { toast.error('Pick an image first'); return; }
    onSelect(chosen.url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      data-testid="media-picker-dialog"
    >
      <div
        className="bg-[color:var(--brand-surface)] rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[color:var(--brand-border)]">
          <div>
            <p className="eyebrow">MEDIA LIBRARY</p>
            <h2 className="font-serif text-2xl mt-1">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--brand-surface-2)]"
            aria-label="Close"
            data-testid="media-picker-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-5 border-b border-[color:var(--brand-border)] space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--brand-text-muted)]" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search by filename or alt text…"
              className="input-cream pl-9"
              data-testid="media-picker-search"
            />
          </div>
          {uniqueTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTag('')}
                className={`chip ${tag === '' ? 'selected' : ''}`}
              >
                All
              </button>
              {uniqueTags.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t === tag ? '' : t)}
                  className={`chip ${tag === t ? 'selected' : ''}`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-2xl bg-[color:var(--brand-surface-2)] animate-pulse" />
              ))}
            </div>
          )}
          {!loading && assets.length === 0 && (
            <div className="text-center py-16 text-[color:var(--brand-text-muted)]">
              <FolderOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No media found</p>
              <p className="text-sm mt-1">Upload images from the Media Library page first.</p>
            </div>
          )}
          {!loading && assets.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {assets.map(a => {
                const isSel = selectedId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-[color:var(--brand-surface-2)] transition-all ${
                      isSel
                        ? 'ring-4 ring-[color:var(--brand-sage-deep)]'
                        : 'hover:ring-2 hover:ring-[color:var(--brand-sage-tint)]'
                    }`}
                    data-testid={`media-picker-asset-${a.id}`}
                    aria-pressed={isSel}
                  >
                    <img
                      src={publicUrl(a.url)}
                      alt={a.alt_text || a.filename}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {isSel && (
                      <div className="absolute top-2 right-2 h-7 w-7 inline-flex items-center justify-center rounded-full bg-[color:var(--brand-sage-deep)] text-white">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                      <p className="text-white text-[11px] truncate">{a.filename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[color:var(--brand-border)] flex items-center justify-between gap-3">
          <p className="text-sm text-[color:var(--brand-text-muted)] truncate">
            {chosen ? `Selected: ${chosen.filename}` : 'Click a thumbnail to select'}
          </p>
          <div className="flex gap-2 shrink-0">
            <button type="button" className="btn-secondary" onClick={onClose} data-testid="media-picker-cancel">Cancel</button>
            <button
              type="button"
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={confirm}
              disabled={!chosen}
              data-testid="media-picker-confirm"
            >
              <Check className="h-4 w-4" /> Insert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * MediaPickerButton — small drop-in button that opens the MediaPickerDialog.
 * Use this next to any existing image upload input.
 *
 * <MediaPickerButton onSelect={(url) => set({ logo_url: url })} />
 */
export const MediaPickerButton = ({ onSelect, label = 'Insert from library', className = '', testId }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`btn-secondary text-sm ${className}`}
        data-testid={testId || 'media-picker-open'}
      >
        <FolderOpen className="h-4 w-4" /> {label}
      </button>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => { onSelect(url); }}
      />
    </>
  );
};

export default MediaPickerButton;
