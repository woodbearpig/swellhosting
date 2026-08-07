import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, List, ListOrdered,
  Quote, Code, Link as LinkIcon, Image as ImageIcon, Undo, Redo, Minus, Type,
} from 'lucide-react';
import { MediaPickerDialog } from '@/components/admin/MediaPickerDialog';
import { publicUrl } from '@/lib/api';

/**
 * RichTextEditor — minimal, opinionated WYSIWYG for the Journal.
 *
 * Emits sanitized HTML through the standard TipTap schema (only nodes/marks
 * declared here are allowed, so pasted content is auto-sanitized).
 *
 * Props:
 *   value    (string HTML) — current content
 *   onChange (fn)          — called with new HTML on every change
 *   placeholder (string)   — dim text shown when the editor is empty
 */
const ToolbarButton = ({ onClick, active, disabled, title, children, testId }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active}
    data-testid={testId}
    className={`h-8 w-8 inline-flex items-center justify-center rounded-lg text-sm transition-colors
      ${active
        ? 'bg-[color:var(--brand-sage-tint)] text-[color:var(--brand-sage-deep)]'
        : 'hover:bg-[color:var(--brand-surface-2)] text-[color:var(--brand-text)]'}
      disabled:opacity-30 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
);

const Divider = () => <div className="h-6 w-px bg-[color:var(--brand-border)] mx-0.5" />;

export const RichTextEditor = ({ value, onChange, placeholder = 'Write your story…' }) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // We disable code-block for a friendlier writing surface; inline code stays.
        codeBlock: false,
        // StarterKit ships its own Link extension in newer versions; disable
        // it here so our explicitly-configured Link (below) isn't a duplicate.
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'link-underline',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Image.configure({
        inline: false,
        HTMLAttributes: {
          class: 'rounded-2xl my-4 max-w-full h-auto',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-content prose max-w-none min-h-[220px] focus:outline-none px-4 py-4 leading-relaxed',
        'data-testid': 'rich-editor-surface',
      },
    },
    onUpdate({ editor: ed }) {
      onChange?.(ed.getHTML());
    },
  });

  const insertImage = useCallback((url) => {
    if (!editor || !url) return;
    editor.chain().focus().setImage({ src: publicUrl(url), alt: '' }).run();
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL (leave blank to remove link)', prev);
    if (url === null) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    // basic protocol coerce
    const safe = /^https?:\/\/|^mailto:|^tel:/i.test(url) ? url : `https://${url}`;
    editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="border border-[color:var(--brand-border)] rounded-2xl bg-white overflow-hidden"
      data-testid="rich-editor"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[color:var(--brand-border)] bg-[color:var(--brand-surface-2)]">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
          testId="rte-undo"
        ><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo (Ctrl+Shift+Z)"
          testId="rte-redo"
        ><Redo className="h-4 w-4" /></ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="Paragraph"
          testId="rte-p"
        ><Type className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
          testId="rte-h1"
        ><Heading1 className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
          testId="rte-h2"
        ><Heading2 className="h-4 w-4" /></ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold (Ctrl+B)"
          testId="rte-bold"
        ><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic (Ctrl+I)"
          testId="rte-italic"
        ><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          title="Strikethrough"
          testId="rte-strike"
        ><Strikethrough className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
          testId="rte-code"
        ><Code className="h-4 w-4" /></ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
          testId="rte-ul"
        ><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
          testId="rte-ol"
        ><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
          testId="rte-quote"
        ><Quote className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
          testId="rte-hr"
        ><Minus className="h-4 w-4" /></ToolbarButton>

        <Divider />

        <ToolbarButton
          onClick={setLink}
          active={editor.isActive('link')}
          title="Add / edit link"
          testId="rte-link"
        ><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton
          onClick={() => setPickerOpen(true)}
          title="Insert image from Media Library"
          testId="rte-image"
        ><ImageIcon className="h-4 w-4" /></ToolbarButton>
      </div>

      {/* Editor surface */}
      <EditorContent editor={editor} />

      {/* Media picker (for image inserts) */}
      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => insertImage(url)}
        title="Insert image from library"
      />
    </div>
  );
};

export default RichTextEditor;
