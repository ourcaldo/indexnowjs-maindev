'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { createLowlight } from 'lowlight'
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Type,
  Palette,
  Table as TableIcon,
  Code2
} from 'lucide-react'

interface TiptapEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
  className?: string
}

export default function TiptapEditor({ 
  content, 
  onChange, 
  placeholder = "Start writing your post...",
  className = ""
}: TiptapEditorProps) {
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use CodeBlockLowlight instead
      }),
      TextStyle,
      FontFamily,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#3D8BFF] underline hover:text-[#1A1A1A] transition-colors',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight: createLowlight(),
        HTMLAttributes: {
          class: 'bg-[#F7F9FC] border border-[#E0E6ED] rounded-lg p-4 font-mono text-sm',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[300px] px-4 py-3 ${className}`,
      },
    },
  })

  const addImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const addTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }

  if (!editor) {
    return (
      <div className="border border-[#E0E6ED] rounded-lg p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-[#F7F9FC] rounded mb-3"></div>
          <div className="h-32 bg-[#F7F9FC] rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#E0E6ED] rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-[#E0E6ED] bg-[#F7F9FC] p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Basic formatting */}
          <div className="flex items-center border-r border-[#E0E6ED] pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('bold') ? 'bg-white shadow-sm' : ''
              }`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('italic') ? 'bg-white shadow-sm' : ''
              }`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('strike') ? 'bg-white shadow-sm' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().chain().focus().toggleCode().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('code') ? 'bg-white shadow-sm' : ''
              }`}
              title="Inline Code"
            >
              <Code className="h-4 w-4" />
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center border-r border-[#E0E6ED] pr-2 mr-2">
            <select
              value={
                editor.isActive('heading', { level: 1 }) ? 'h1' :
                editor.isActive('heading', { level: 2 }) ? 'h2' :
                editor.isActive('heading', { level: 3 }) ? 'h3' :
                'paragraph'
              }
              onChange={(e) => {
                if (e.target.value === 'paragraph') {
                  editor.chain().focus().setParagraph().run()
                } else {
                  const level = parseInt(e.target.value.replace('h', ''))
                  editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run()
                }
              }}
              className="px-2 py-1 text-sm border border-[#E0E6ED] rounded hover:bg-white transition-colors"
            >
              <option value="paragraph">Paragraph</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
            </select>
          </div>

          {/* Lists */}
          <div className="flex items-center border-r border-[#E0E6ED] pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('bulletList') ? 'bg-white shadow-sm' : ''
              }`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('orderedList') ? 'bg-white shadow-sm' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('blockquote') ? 'bg-white shadow-sm' : ''
              }`}
              title="Quote"
            >
              <Quote className="h-4 w-4" />
            </button>
          </div>

          {/* Insert */}
          <div className="flex items-center border-r border-[#E0E6ED] pr-2 mr-2">
            <button
              onClick={addLink}
              className="p-2 rounded hover:bg-white transition-colors"
              title="Add Link"
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              onClick={addImage}
              className="p-2 rounded hover:bg-white transition-colors"
              title="Add Image"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-2 rounded hover:bg-white transition-colors ${
                editor.isActive('codeBlock') ? 'bg-white shadow-sm' : ''
              }`}
              title="Code Block"
            >
              <Code2 className="h-4 w-4" />
            </button>
            <button
              onClick={addTable}
              className="p-2 rounded hover:bg-white transition-colors"
              title="Add Table"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="p-2 rounded hover:bg-white transition-colors disabled:opacity-50"
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="p-2 rounded hover:bg-white transition-colors disabled:opacity-50"
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <EditorContent 
        editor={editor} 
        className="bg-white min-h-[300px]"
      />
    </div>
  )
}