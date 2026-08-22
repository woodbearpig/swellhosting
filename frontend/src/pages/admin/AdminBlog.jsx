import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, X } from 'lucide-react';
import { api, uploadFile, publicUrl } from '@/lib/api';
import { MediaPickerButton } from '@/components/admin/MediaPickerDialog';
import { RichTextEditor } from '@/components/admin/RichTextEditor';

export const AdminBlog = () => {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/blog', { params: { published: undefined } }).then(r => setItems(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing.id) await api.put(`/admin/blog/${editing.id}`, editing);
      else await api.post('/admin/blog', editing);
      toast.success('Saved'); setEditing(null); load();
    } catch (_) { toast.error('Save failed'); }
  };
  const remove = async (id) => { if (!window.confirm('Delete?')) return; await api.delete(`/admin/blog/${id}`); load(); toast.success('Deleted'); };

  return (
    <div className="space-y-6" data-testid="admin-blog-page">
      <div className="flex items-center justify-between">
        <div><p className="eyebrow">CONTENT</p><h1 className="font-serif text-3xl sm:text-4xl mt-1">Blog</h1></div>
        <button className="btn-primary" onClick={() => setEditing({ title: '', slug: '', excerpt: '', content: '', cover_image_url: '', tags: [], featured: false, published: true })}><Plus className="h-4 w-4" /> New post</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map(p => (
          <div key={p.id} className="card-cream overflow-hidden">
            {p.cover_image_url && <img src={publicUrl(p.cover_image_url)} alt={p.title} className="aspect-video w-full object-cover" />}
            <div className="p-5">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-serif text-xl">{p.title}</p>
                {p.featured && <span className="badge-soft text-[10px] uppercase tracking-wider">Featured</span>}
              </div>
              <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">/blog/{p.slug} · {p.published ? 'Published' : 'Draft'}{p.tags?.length ? ' · ' + p.tags.slice(0, 3).join(', ') : ''}</p>
              <p className="text-sm mt-2 line-clamp-2">{p.excerpt}</p>
              <div className="mt-3 flex gap-3"><button onClick={() => setEditing(p)} className="link-underline text-sm">Edit</button><button onClick={() => remove(p.id)} className="text-red-600"><Trash2 className="h-4 w-4" /></button></div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-[color:var(--brand-cream)] w-full max-w-3xl rounded-2xl p-6 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-serif text-2xl">{editing.id ? 'Edit' : 'New'} post</h2><button onClick={() => setEditing(null)}><X /></button></div>
            <div className="space-y-3">
              <input className="input-cream" placeholder="Title" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} />
              <input className="input-cream" placeholder="Slug (auto if blank)" value={editing.slug || ''} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              <input className="input-cream" placeholder="Excerpt" value={editing.excerpt} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} />
              <div>
                <label className="eyebrow block mb-1">COVER IMAGE</label>
                {editing.cover_image_url && <img src={publicUrl(editing.cover_image_url)} alt="cover" className="h-32 w-full object-cover rounded-lg mb-2" />}
                <div className="flex items-center gap-2 flex-wrap">
                  <input type="file" accept="image/*" onChange={async e => { const f = e.target.files?.[0]; if (f) { const r = await uploadFile(f); setEditing({ ...editing, cover_image_url: r.url }); } }} />
                  <MediaPickerButton testId="media-picker-blog-cover" onSelect={url => setEditing({ ...editing, cover_image_url: url })} />
                </div>
                <input className="input-cream mt-2" placeholder="Or paste URL" value={editing.cover_image_url || ''} onChange={e => setEditing({ ...editing, cover_image_url: e.target.value })} />
              </div>
              <div>
                <label className="eyebrow block mb-1">CONTENT</label>
                <RichTextEditor
                  value={editing.content || ''}
                  onChange={html => setEditing({ ...editing, content: html })}
                  placeholder="Tell the story of this event…"
                />
              </div>
              <div>
                <label className="eyebrow block mb-1">TAGS</label>
                <input
                  className="input-cream"
                  placeholder="weddings, birthdays, behind-the-scenes"
                  value={(editing.tags || []).join(', ')}
                  onChange={e => setEditing({ ...editing, tags: e.target.value.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) })}
                  data-testid="admin-blog-tags"
                />
                <p className="text-xs text-[color:var(--brand-text-muted)] mt-1">Comma-separated. Becomes the filter pills on the public Blog page.</p>
              </div>
              <div className="flex items-center gap-6 flex-wrap">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} data-testid="admin-blog-featured" />
                  <span>Featured (bigger 2×2 tile on the blog grid)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={editing.published !== false} onChange={e => setEditing({ ...editing, published: e.target.checked })} /> Published</label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3"><button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button><button onClick={save} className="btn-primary">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBlog;
