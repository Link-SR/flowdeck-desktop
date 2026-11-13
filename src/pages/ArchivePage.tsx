import { Archive, FileText, FolderKanban, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { TaskRow } from '../components/tasks/TaskRow'
import { useWorkspace } from '../store/WorkspaceContext'

type Tab = 'tasks' | 'notes' | 'projects'
type DeleteTarget = { type: 'note' | 'project'; id: string; title: string }

export function ArchivePage() {
  const { data, updateTask, updateNote, updateProject, deleteNote, deleteProject } = useWorkspace()
  const [tab, setTab] = useState<Tab>('tasks')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const tasks = data.tasks.filter(t => t.status === 'completed' || t.status === 'cancelled' || t.archived)
  const notes = data.notes.filter(n => n.archived)
  const projects = data.projects.filter(p => p.status === 'archived' || p.status === 'completed')
  return <div className="space-y-6"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950">归档记录</h2><p className="mt-1 text-sm text-slate-500">回顾已经完成、取消或归档的工作内容。</p></div>
    <div className="flex gap-1 border-b">{([['tasks',`任务 ${tasks.length}`],['notes',`笔记 ${notes.length}`],['projects',`项目 ${projects.length}`]] as [Tab,string][]).map(([value,label]) => <button key={value} onClick={() => setTab(value)} className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === value ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}>{label}</button>)}</div>
    {tab === 'tasks' && <section className="overflow-hidden rounded-xl border bg-white">{tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} />) : <Empty icon={<Archive size={22} />} label="暂无已完成或归档任务" />}</section>}
    {tab === 'notes' && <section className="overflow-hidden rounded-xl border bg-white">{notes.length ? notes.map(note => <div key={note.id} className="flex items-center gap-3 border-b px-4 py-4 last:border-b-0"><span className="rounded-lg bg-slate-100 p-2 text-slate-400"><FileText size={16} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-700">{note.title}</div><div className="mt-0.5 truncate text-xs text-slate-400">{note.content.replace(/[#>*\-]/g, '') || '暂无内容'}</div></div><Button size="sm" variant="ghost" onClick={() => updateNote(note.id, { archived: false })}><RotateCcw size={15} />恢复</Button><Button size="icon" variant="ghost" className="text-rose-500" onClick={() => setDeleteTarget({ type: 'note', id: note.id, title: note.title })}><Trash2 size={15} /></Button></div>) : <Empty icon={<FileText size={22} />} label="暂无归档笔记" />}</section>}
    {tab === 'projects' && <section className="overflow-hidden rounded-xl border bg-white">{projects.length ? projects.map(project => <div key={project.id} className="flex items-center gap-3 border-b px-4 py-4 last:border-b-0"><span className="rounded-lg p-2" style={{ color: project.color, backgroundColor: `${project.color}12` }}><FolderKanban size={17} /></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-700">{project.name}</div><div className="mt-0.5 truncate text-xs text-slate-400">{project.description || '暂无说明'}</div></div><Button size="sm" variant="ghost" onClick={() => updateProject(project.id, { status: 'active' })}><RotateCcw size={15} />恢复</Button><Button size="icon" variant="ghost" className="text-rose-500" onClick={() => setDeleteTarget({ type: 'project', id: project.id, title: project.name })}><Trash2 size={15} /></Button></div>) : <Empty icon={<FolderKanban size={22} />} label="暂无归档项目" />}</section>}
    <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={open => !open && setDeleteTarget(null)} title={`永久删除${deleteTarget?.type === 'project' ? '项目' : ''}“${deleteTarget?.title ?? ''}”？`} description="该内容将从本地数据中永久删除。" onConfirm={() => { if (deleteTarget) { if (deleteTarget.type === 'note') deleteNote(deleteTarget.id); else deleteProject(deleteTarget.id); setDeleteTarget(null) } }} />
  </div>
}
function Empty({ icon, label }: { icon: React.ReactNode; label: string }) { return <div className="p-5"><EmptyState icon={icon} title={label} description="归档内容会出现在这里，也可以随时恢复。" /></div> }
