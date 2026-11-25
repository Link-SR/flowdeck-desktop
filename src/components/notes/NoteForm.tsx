import { Eye, Pencil, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { createId } from '../../lib/utils'
import {
  attachmentFileAccept,
  attachmentMarkdown,
  isNativeAttachmentAvailable,
  removeAttachmentMarkdown,
  validateAttachmentFile,
  writeAttachmentFile,
} from '../../services/attachmentService'
import { useWorkspace } from '../../store/WorkspaceContext'
import type { Attachment, Note } from '../../types'
import { Button } from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { AttachmentMarkdown } from './AttachmentMarkdown'
import { AttachmentPanel } from './AttachmentPanel'

export function NoteFormModal({ open, onOpenChange, note }: { open: boolean; onOpenChange(open: boolean): void; note?: Note | null }) {
  const { data, createNote, updateNote, addAttachments, deleteAttachments } = useWorkspace()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)
  const [draftId, setDraftId] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [files, setFiles] = useState<Map<string, File>>(new Map())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const id = note?.id ?? createId('note')
    setTitle(note?.title ?? '')
    setContent(note?.content ?? '')
    setProjectId(note?.projectId ?? null)
    setPreview(false)
    setDraftId(id)
    setAttachments(data.attachments.filter(attachment => attachment.noteId === id))
    setFiles(new Map())
    setRemovedIds(new Set())
    setDragging(false)
    setSaving(false)
    setError(null)
    setLightboxUrl(null)
  }, [open, note])

  const insertImages = (items: Attachment[]) => {
    const markdown = items.map(attachment => attachmentMarkdown(attachment.id, attachment.name)).join('\n\n')
    const element = textarea.current
    const start = element?.selectionStart ?? content.length
    const end = element?.selectionEnd ?? start
    const before = content.slice(0, start)
    const after = content.slice(end)
    const prefix = before && !before.endsWith('\n') ? '\n\n' : ''
    const suffix = after && !after.startsWith('\n') ? '\n\n' : '\n'
    const addition = `${prefix}${markdown}${suffix}`
    setContent(`${before}${addition}${after}`)
    setPreview(false)
    requestAnimationFrame(() => {
      const next = textarea.current
      if (!next) return
      const position = before.length + addition.length
      next.focus()
      next.setSelectionRange(position, position)
    })
  }

  const insertImage = (attachment: Attachment) => insertImages([attachment])

  const addFiles = (incoming: File[]) => {
    if (!isNativeAttachmentAvailable()) {
      setError('附件功能仅在 Flowdeck 桌面版中可用。')
      return
    }
    const nextAttachments: Attachment[] = []
    const nextFiles = new Map(files)
    try {
      for (const file of incoming) {
        const kind = validateAttachmentFile(file)
        const now = new Date().toISOString()
        const attachment: Attachment = {
          id: createId('attachment'), noteId: draftId, name: file.name,
          mimeType: file.type || 'application/octet-stream', size: file.size, kind,
          createdAt: now, updatedAt: now,
        }
        nextAttachments.push(attachment)
        nextFiles.set(attachment.id, file)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
      return
    }
    setError(null)
    setAttachments(current => [...current, ...nextAttachments])
    setFiles(nextFiles)
    const images = nextAttachments.filter(item => item.kind === 'image')
    if (images.length) insertImages(images)
  }

  const removeAttachment = (attachment: Attachment) => {
    setAttachments(current => current.filter(item => item.id !== attachment.id))
    setContent(current => removeAttachmentMarkdown(current, [attachment.id]))
    if (files.has(attachment.id)) {
      setFiles(current => {
        const next = new Map(current)
        next.delete(attachment.id)
        return next
      })
    } else {
      setRemovedIds(current => new Set(current).add(attachment.id))
    }
  }

  const save = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const pending = attachments.filter(attachment => files.has(attachment.id))
      for (const attachment of pending) await writeAttachmentFile(attachment.id, files.get(attachment.id)!)
      if (note) updateNote(note.id, { title: title.trim(), content, projectId })
      else createNote({ title: title.trim(), content, projectId }, draftId)
      addAttachments(pending)
      deleteAttachments([...removedIds])
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setSaving(false)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    const dropped = Array.from(event.dataTransfer.files)
    if (dropped.length) addFiles(dropped)
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedImages = Array.from(event.clipboardData.files).filter(file => file.type.startsWith('image/'))
    if (!pastedImages.length) return
    event.preventDefault()
    addFiles(pastedImages)
  }

  return <>
    <Modal open={open} onOpenChange={next => { if (!saving) onOpenChange(next) }} title={note ? '编辑笔记' : '新建笔记'} description="使用 Markdown 记录想法，并添加图片或工作文档。" className="max-w-4xl" footer={<><Button onClick={() => onOpenChange(false)} disabled={saving}>取消</Button><Button variant="primary" onClick={() => void save()} disabled={!title.trim() || saving}>{saving ? '正在保存附件…' : note ? '保存更改' : '保存笔记'}</Button></>}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]"><FormField label="标题"><Input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder="笔记标题" /></FormField><FormField label="关联项目"><Select value={projectId ?? ''} onChange={event => setProjectId(event.target.value || null)}><option value="">无项目</option>{data.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></FormField></div>
        <div className={`relative rounded-xl transition ${dragging ? 'ring-2 ring-brand-500 ring-offset-2' : ''}`} onDragEnter={event => { event.preventDefault(); setDragging(true) }} onDragOver={event => event.preventDefault()} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false) }} onDrop={handleDrop}>
          <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">正文</span><div className="flex rounded-lg border bg-slate-50 p-0.5"><button type="button" onClick={() => setPreview(false)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${!preview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Pencil size={12} />编辑</button><button type="button" onClick={() => setPreview(true)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${preview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Eye size={12} />预览</button></div></div>
          {preview ? <div className="markdown min-h-[320px] rounded-lg border bg-white p-5"><AttachmentMarkdown content={content} attachments={attachments} files={files} onImageClick={setLightboxUrl} /></div> : <Textarea ref={textarea} value={content} onChange={event => setContent(event.target.value)} onPaste={handlePaste} placeholder={'## 标题\n\n在这里记录内容，也可以粘贴截图…'} className="min-h-[320px] font-mono text-[13px] leading-6" />}
          {dragging && <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-brand-50/90 text-sm font-medium text-brand-700"><Upload className="mr-2" size={18} />松开以添加附件</div>}
        </div>
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <input ref={fileInput} type="file" multiple accept={attachmentFileAccept} className="hidden" onChange={event => { addFiles(Array.from(event.target.files ?? [])); event.target.value = '' }} />
        <AttachmentPanel attachments={attachments} files={files} editable onAdd={() => fileInput.current?.click()} onInsert={insertImage} onRemove={removeAttachment} onImageClick={setLightboxUrl} />
      </div>
    </Modal>
    {lightboxUrl && <button type="button" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 p-6" onClick={() => setLightboxUrl(null)} aria-label="关闭图片预览"><img src={lightboxUrl} alt="附件大图" className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" /></button>}
  </>
}
