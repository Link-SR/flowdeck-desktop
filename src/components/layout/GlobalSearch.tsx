import * as Dialog from '@radix-ui/react-dialog'
import { FileText, FolderKanban, Search, SquareCheckBig, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUI } from '../../store/UIContext'
import { useWorkspace } from '../../store/WorkspaceContext'

export function GlobalSearch() {
  const { searchOpen, setSearchOpen, openTask } = useUI()
  const { data } = useWorkspace()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setSearchOpen(true) } }
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])
  useEffect(() => { if (!searchOpen) setQuery('') }, [searchOpen])

  const q = query.trim().toLowerCase()
  const results = useMemo(() => ({
    tasks: data.tasks.filter(item => !item.archived && `${item.title} ${item.description}`.toLowerCase().includes(q)).slice(0, 5),
    projects: data.projects.filter(item => `${item.name} ${item.description}`.toLowerCase().includes(q)).slice(0, 4),
    notes: data.notes.filter(item => {
      const attachmentNames = data.attachments.filter(attachment => attachment.noteId === item.id).map(attachment => attachment.name).join(' ')
      return !item.archived && `${item.title} ${item.content} ${attachmentNames}`.toLowerCase().includes(q)
    }).slice(0, 4),
  }), [data, q])
  const hasResults = results.tasks.length + results.projects.length + results.notes.length > 0

  return <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[2px]" /><Dialog.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border bg-white shadow-panel"><Dialog.Title className="sr-only">全局搜索</Dialog.Title><div className="flex h-14 items-center gap-3 border-b px-4"><Search size={19} className="text-slate-400" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索任务、项目和笔记…" className="h-full flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" /><Dialog.Close className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></Dialog.Close></div><div className="subtle-scrollbar max-h-[60vh] overflow-y-auto p-2">
    {!q && <div className="px-4 py-12 text-center"><Search className="mx-auto mb-3 text-slate-300" size={28} /><p className="text-sm font-medium text-slate-600">搜索你的工作空间</p><p className="mt-1 text-xs text-slate-400">输入关键词，快速找到任务、项目或笔记</p></div>}
    {q && !hasResults && <div className="px-4 py-12 text-center text-sm text-slate-400">没有找到“{query}”相关内容</div>}
    {q && results.tasks.length > 0 && <ResultGroup label="任务">{results.tasks.map(task => <ResultItem key={task.id} icon={<SquareCheckBig size={16} />} title={task.title} meta="任务" onClick={() => { setSearchOpen(false); openTask(task.id) }} />)}</ResultGroup>}
    {q && results.projects.length > 0 && <ResultGroup label="项目">{results.projects.map(project => <ResultItem key={project.id} icon={<FolderKanban size={16} />} title={project.name} meta="项目" onClick={() => { setSearchOpen(false); navigate(`/projects?open=${project.id}`) }} />)}</ResultGroup>}
    {q && results.notes.length > 0 && <ResultGroup label="笔记">{results.notes.map(note => <ResultItem key={note.id} icon={<FileText size={16} />} title={note.title} meta="笔记" onClick={() => { setSearchOpen(false); navigate(`/notes?open=${note.id}`) }} />)}</ResultGroup>}
  </div></Dialog.Content></Dialog.Portal></Dialog.Root>
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) { return <div className="mb-2"><div className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>{children}</div> }
function ResultItem({ icon, title, meta, onClick }: { icon: React.ReactNode; title: string; meta: string; onClick(): void }) { return <button onClick={onClick} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100"><span className="text-slate-400">{icon}</span><span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{title}</span><span className="text-xs text-slate-400">{meta}</span></button> }
