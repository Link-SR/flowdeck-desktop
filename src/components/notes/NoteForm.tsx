import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Eye, Pencil } from 'lucide-react'
import { useWorkspace } from '../../store/WorkspaceContext'
import type { Note } from '../../types'
import { Button } from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormField'
import { Modal } from '../ui/Modal'

export function NoteFormModal({ open, onOpenChange, note }: { open: boolean; onOpenChange(open: boolean): void; note?: Note | null }) {
  const { data, createNote, updateNote } = useWorkspace()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [projectId, setProjectId] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => { if (open) { setTitle(note?.title ?? ''); setContent(note?.content ?? ''); setProjectId(note?.projectId ?? null); setPreview(false) } }, [open, note])
  const save = () => { if (!title.trim()) return; note ? updateNote(note.id, { title: title.trim(), content, projectId }) : createNote({ title: title.trim(), content, projectId }); onOpenChange(false) }

  return <Modal open={open} onOpenChange={onOpenChange} title={note ? '编辑笔记' : '新建笔记'} description="使用 Markdown 记录想法、结论和工作上下文。" className="max-w-3xl" footer={<><Button onClick={() => onOpenChange(false)}>取消</Button><Button variant="primary" onClick={save} disabled={!title.trim()}>{note ? '保存更改' : '保存笔记'}</Button></>}>
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]"><FormField label="标题"><Input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="笔记标题" /></FormField><FormField label="关联项目"><Select value={projectId ?? ''} onChange={e => setProjectId(e.target.value || null)}><option value="">无项目</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FormField></div>
      <div>
        <div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium text-slate-700">正文</span><div className="flex rounded-lg border bg-slate-50 p-0.5"><button onClick={() => setPreview(false)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${!preview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Pencil size={12} />编辑</button><button onClick={() => setPreview(true)} className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs ${preview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Eye size={12} />预览</button></div></div>
        {preview ? <div className="markdown min-h-[320px] rounded-lg border bg-white p-5"><ReactMarkdown>{content || '*暂无内容*'}</ReactMarkdown></div> : <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder={'## 标题\n\n在这里记录内容…'} className="min-h-[320px] font-mono text-[13px] leading-6" />}
      </div>
    </div>
  </Modal>
}
