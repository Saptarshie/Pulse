"use client";
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useEffect, useRef, useState } from 'react';
import { uploadInlineImage } from '@/action/blogAction';
import { PhotoIcon, LinkIcon } from '@heroicons/react/24/outline';
import "./tip-tap-style.css";

const TipTapEditor = ({ value, onChange }) => {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef(null);
  const insertImageFileRef = useRef(null);

  const insertImageFile = async (file) => {
    if (!editor || !file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadInlineImage(formData);
      if (res?.success && res.url) {
        editor.chain().focus().setImage({ src: res.url, alt: file.name || 'Story Image' }).run();
      } else {
        alert(res?.message || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Error inserting image into editor:', err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  insertImageFileRef.current = insertImageFile;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Write your blog content here... (Tip: You can paste images directly with Ctrl+V)',
      }),
      Underline,
    ],
    editorProps: {
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find((item) => item.type.startsWith('image/'));
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (file) {
            event.preventDefault();
            insertImageFileRef.current?.(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length > 0) {
          const file = Array.from(event.dataTransfer.files).find((f) => f.type.startsWith('image/'));
          if (file) {
            event.preventDefault();
            insertImageFileRef.current?.(file);
            return true;
          }
        }
        return false;
      },
    },
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update content from external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return <div className="h-64 border rounded-2xl bg-slate-50/50 animate-pulse"></div>;
  }

  const toggleBold = () => editor.chain().focus().toggleBold().run();
  const toggleItalic = () => editor.chain().focus().toggleItalic().run();
  const toggleUnderline = () => editor.chain().focus().toggleUnderline().run();
  const toggleStrike = () => editor.chain().focus().toggleStrike().run();
  const toggleCode = () => editor.chain().focus().toggleCode().run();
  const toggleCodeBlock = () => editor.chain().focus().toggleCodeBlock().run();
  const toggleBlockquote = () => editor.chain().focus().toggleBlockquote().run();
  const toggleBulletList = () => editor.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () => editor.chain().focus().toggleOrderedList().run();

  const handleFileInputChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await insertImageFile(file);
    }
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const url = window.prompt('Enter Image URL (https://...):');
    if (url && url.trim()) {
      editor.chain().focus().setImage({ src: url.trim(), alt: 'Embedded Image' }).run();
    }
  };

  return (
    <>
      <div className="tiptap-editor">
        <div className="tiptap-toolbar">
          <button 
            type="button"
            onClick={toggleBold}
            className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
            title="Bold">
            <strong>B</strong>
          </button>
          <button 
            type="button"
            onClick={toggleItalic}
            className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
            title="Italic">
            <em>I</em>
          </button>
          <button 
            type="button"
            onClick={toggleUnderline}
            className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
            title="Underline">
            <u>U</u>
          </button>
          <button 
            type="button"
            onClick={toggleStrike}
            className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
            title="Strikethrough">
            <s>S</s>
          </button>
          <button 
            type="button"
            onClick={toggleCode}
            className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
            title="Inline Code">
            &lt;/&gt;
          </button>
          <button 
            type="button"
            onClick={toggleBlockquote}
            className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
            title="Quote">
            &ldquo;
          </button>
          <button 
            type="button"
            onClick={toggleCodeBlock}
            className={`toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
            title="Code Block">
            {'{ }'}
          </button>
          <button 
            type="button"
            onClick={toggleBulletList}
            className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
            title="Bullet List">
            • List
          </button>
          <button 
            type="button"
            onClick={toggleOrderedList}
            className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
            title="Numbered List">
            1. List
          </button>

          {/* Inline Image Upload Trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingImage}
            className={`toolbar-btn flex items-center space-x-1 ${isUploadingImage ? 'opacity-50 cursor-wait' : ''}`}
            title="Upload Image (or Paste directly with Ctrl+V)"
          >
            {isUploadingImage ? (
              <span className="flex items-center space-x-1 text-purple-700">
                <svg className="animate-spin h-3.5 w-3.5 text-purple-600 inline" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-xs">Uploading...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-slate-700 hover:text-purple-700">
                <PhotoIcon className="h-3.5 w-3.5 text-emerald-600 inline" />
                <span className="text-xs font-semibold">Image</span>
              </span>
            )}
          </button>

          {/* Add Image by URL */}
          <button
            type="button"
            onClick={handleAddImageUrl}
            className="toolbar-btn text-xs text-slate-600 hover:text-purple-700"
            title="Insert Image by URL"
          >
            + Image URL
          </button>

          {/* Hidden File Picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>
        <EditorContent editor={editor} className="tiptap-content" />
      </div>
    </>
  );
};

export default TipTapEditor;
