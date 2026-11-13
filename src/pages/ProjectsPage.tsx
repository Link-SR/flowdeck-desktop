import { Archive, ArrowLeft, CheckCircle2, FolderKanban, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ProjectFormModal } from '../components/projects/ProjectForm'
import { TaskRow } from '../components/tasks/TaskRow'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { useUI } from '../store/UIContext'
import { useWorkspace } from '../store/WorkspaceContext'
import type { Project } from '../types'

export function ProjectsPage() {
  const { data, updateProject, deleteProject } = useWorkspace()
  const { openQuickCreate, openQuickCreate: create } = useUI()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState<Project | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const selectedId = params.get('open')
  const selected = data.projects.find(p => p.id === selectedId)
  const activeProjects = data.projects.filter(p => p.status !== 'archived')

  useEffect(() => { if (selectedId && !selected) setParams({}) }, [selectedId, selected, setParams])

  if (selected) {
    const tasks = data.tasks.filter(t => t.projectId === selected.id && !t.archived)
    const completed = tasks.filter(t => t.status === 'completed').length
    const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
    return <><div className="space-y-6">
      <button onClick={() => setParams({})} className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"><ArrowLeft size={16} />返回项目列表</button>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex items-center gap-3"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} /><h2 className="text-2xl font-semibold tracking-tight text-slate-950">{selected.name}</h2></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{selected.description || '暂无项目说明'}</p></div><div className="flex gap-2"><Button onClick={() => setEditing(selected)}><Pencil size={15} />编辑</Button><Button variant="primary" onClick={() => openQuickCreate('task')}><Plus size={16} />添加任务</Button></div></div>
      <section className="grid overflow-hidden rounded-xl border bg-white sm:grid-cols-3"><Stat label="总任务" value={tasks.length} /><Stat label="已完成" value={completed} /><Stat label="项目进度" value={`${progress}%`} /></section>
      <section className="rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><span className="text-sm font-medium text-slate-700">整体进度</span><span className="text-sm font-semibold" style={{ color: selected.color }}>{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: selected.color }} /></div><p className="mt-2 text-xs text-slate-400">已完成 {completed} / {tasks.length} 个任务</p></section>
      <section className="overflow-hidden rounded-xl border bg-white"><div className="flex h-14 items-center justify-between border-b px-4"><h3 className="text-sm font-semibold text-slate-800">项目任务</h3><span className="text-xs text-slate-400">{tasks.length} 个</span></div>{tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} />) : <div className="p-5"><EmptyState icon={<CheckCircle2 size={22} />} title="项目还没有任务" description="从快速添加中创建任务，然后将它关联到这个项目。" action={<Button size="sm" variant="primary" onClick={() => create('task')}><Plus size={15} />添加任务</Button>} /></div>}</section>
      <div className="flex justify-end gap-2 border-t pt-5"><Button variant="ghost" onClick={() => { updateProject(selected.id, { status: 'archived' }); setParams({}) }}><Archive size={16} />归档项目</Button><Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />删除项目</Button></div>
      <ProjectFormModal open={Boolean(editing)} onOpenChange={open => !open && setEditing(null)} project={editing} />
    </div><ConfirmDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={`删除项目“${selected.name}”？`} description="关联任务和笔记会保留，但将不再关联到该项目。" onConfirm={() => { setParams({}); deleteProject(selected.id) }} /></>
  }

  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950">我的项目</h2><p className="mt-1 text-sm text-slate-500">围绕目标组织任务，清晰掌握推进节奏。</p></div><Button variant="primary" onClick={() => openQuickCreate('project')}><Plus size={17} />创建项目</Button></div>
    {activeProjects.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeProjects.map(project => <ProjectCard key={project.id} project={project} onOpen={() => setParams({ open: project.id })} />)}</div> : <EmptyState icon={<FolderKanban size={24} />} title="还没有项目" description="创建第一个项目，将相关任务和笔记归到一起。" action={<Button variant="primary" onClick={() => openQuickCreate('project')}><Plus size={16} />创建项目</Button>} />}
  </div>
}

function ProjectCard({ project, onOpen }: { project: Project; onOpen(): void }) {
  const { data } = useWorkspace()
  const tasks = useMemo(() => data.tasks.filter(t => t.projectId === project.id && !t.archived), [data.tasks, project.id])
  const completed = tasks.filter(t => t.status === 'completed').length
  const progress = tasks.length ? Math.round(completed / tasks.length * 100) : 0
  return <button onClick={onOpen} className="group rounded-xl border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm"><div className="flex items-start justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ color: project.color, backgroundColor: `${project.color}12` }}><FolderKanban size={20} /></span><MoreHorizontal size={18} className="text-slate-300 group-hover:text-slate-500" /></div><h3 className="mt-4 font-semibold text-slate-900">{project.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{project.description || '暂无项目说明'}</p><div className="mt-5 flex items-center justify-between text-xs"><span className="text-slate-400">{completed}/{tasks.length} 个任务</span><span className="font-medium" style={{ color: project.color }}>{progress}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: project.color }} /></div></button>
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="border-b p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><div className="text-2xl font-semibold text-slate-900">{value}</div><div className="mt-1 text-xs text-slate-500">{label}</div></div> }
