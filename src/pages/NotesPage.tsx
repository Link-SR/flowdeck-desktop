import { Archive, FileText, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useSearchParams } from 'react-router-dom'
import { NoteFormModal } from '../components/notes/NoteForm'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { formatDate } from '../lib/utils'
import { useUI } from '../store/UIContext'
import { useWorkspace } from '../store/WorkspaceContext'
import type { Note } from '../types'

export function NotesPage() {
  const { data, updateNote, deleteNote } = useWorkspace()
  const { openQuickCreate } = useUI()
  const [params, setParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  const notes = useMemo(() => data.notes.filter(n => !n.archived && `${n.title} ${n.content}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [data.notes, query])
  const selected = data.notes.find(n => n.id === params.get('open') && !n.archived) ?? notes[0]
  useEffect(() => { const requested = params.get('open'); if (requested) { const note = data.notes.find(n => n.id === requested); if (note) setEditing(note) } }, [params, data.notes])

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950">工作笔记</h2><p className="mt-1 text-sm text-slate-500">记录上下文、决策与灵感，保留工作脉络。</p></div><Button variant="primary" onClick={() => openQuickCreate('note')}><Plus size={17} />新建笔记</Button></div>
    <div className="grid min-h-[620px] overflow-hidden rounded-xl border bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="border-b lg:border-b-0 lg:border-r"><div className="border-b p-3"><div className="flex h-9 items-center gap-2 rounded-lg border bg-slate-50 px-3"><Search size={15} className="text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索笔记…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div></div><div className="subtle-scrollbar max-h-[320px] overflow-y-auto lg:max-h-[560px]">{notes.length ? notes.map(note => <button key={note.id} onClick={() => setParams({ open: note.id })} className={`w-full border-b px-4 py-4 text-left transition hover:bg-slate-50 ${selected?.id === note.id ? 'bg-brand-50/60' : ''}`}><div className="flex items-start gap-3"><FileText size={17} className={selected?.id === note.id ? 'mt-0.5 text-brand-600' : 'mt-0.5 text-slate-300'} /><div className="min-w-0"><h3 className="truncate text-sm font-medium text-slate-800">{note.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{note.content.replace(/[#>*\-]/g, '') || '暂无内容'}</p><span className="mt-2 block text-[11px] text-slate-400">{formatDate(note.updatedAt.slice(0, 10), true)}</span></div></div></button>) : <div className="p-4 text-center text-sm text-slate-400">没有找到笔记</div>}</div></aside>
      <article className="min-w-0">{selected ? <><div className="flex min-h-16 items-center justify-between gap-4 border-b px-5"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-900">{selected.title}</h3><p className="mt-0.5 text-xs text-slate-400">最后更新于 {formatDate(selected.updatedAt.slice(0, 10))}</p></div><div className="flex gap-1"><Button size="sm" onClick={() => setEditing(selected)}>编辑</Button><Button size="icon" variant="ghost" title="归档" onClick={() => updateNote(selected.id, { archived: true })}><Archive size={16} /></Button><Button size="icon" variant="ghost" className="text-rose-500 hover:bg-rose-50" title="删除" onClick={() => setNoteToDelete(selected)}><Trash2 size={16} /></Button></div></div><div className="markdown subtle-scrollbar max-h-[560px] overflow-y-auto px-6 py-6 sm:px-9"><ReactMarkdown>{selected.content || '*暂无内容*'}</ReactMarkdown></div></> : <div className="flex h-full items-center justify-center p-6"><EmptyState icon={<FileText size={22} />} title="还没有笔记" description="新建一篇 Markdown 笔记，记录此刻的工作上下文。" action={<Button variant="primary" size="sm" onClick={() => openQuickCreate('note')}><Plus size={15} />新建笔记</Button>} /></div>}</article>
    </div>
    <NoteFormModal open={Boolean(editing)} onOpenChange={open => { if (!open) { setEditing(null); setParams({}) } }} note={editing} />
    <ConfirmDialog open={Boolean(noteToDelete)} onOpenChange={open => !open && setNoteToDelete(null)} title={`删除“${noteToDelete?.title ?? ''}”？`} description="该笔记将从本地数据中永久删除。" onConfirm={() => { if (noteToDelete) { deleteNote(noteToDelete.id); setNoteToDelete(null); setParams({}) } }} />
  </div>
}
