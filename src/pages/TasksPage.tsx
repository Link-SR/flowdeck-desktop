import { CheckCircle2, Filter, ListFilter, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TaskRow } from '../components/tasks/TaskRow'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Select } from '../components/ui/FormField'
import { isTaskOverdue, isTaskToday } from '../lib/utils'
import { useUI } from '../store/UIContext'
import { useWorkspace } from '../store/WorkspaceContext'
import type { TaskPriority, TaskStatus } from '../types'

type Scope = 'all' | 'today' | 'overdue' | TaskStatus

export function TasksPage() {
  const { data } = useWorkspace()
  const { openQuickCreate } = useUI()
  const [params] = useSearchParams()
  const [scope, setScope] = useState<Scope>((params.get('filter') as Scope) || 'all')
  const [priority, setPriority] = useState<TaskPriority | 'all'>('all')
  const [projectId, setProjectId] = useState('all')
  const [query, setQuery] = useState('')

  const tasks = useMemo(() => data.tasks.filter(task => {
    if (task.archived) return false
    if (scope === 'today' && !isTaskToday(task)) return false
    if (scope === 'overdue' && !isTaskOverdue(task)) return false
    if (['todo', 'in_progress', 'completed', 'cancelled'].includes(scope) && task.status !== scope) return false
    if (priority !== 'all' && task.priority !== priority) return false
    if (projectId !== 'all' && task.projectId !== projectId) return false
    if (query && !`${task.title} ${task.description}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999')), [data.tasks, scope, priority, projectId, query])

  return <div className="space-y-5">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h2 className="text-2xl font-semibold tracking-tight text-slate-950">所有任务</h2><p className="mt-1 text-sm text-slate-500">安排、推进并完成你的下一步行动。</p></div><Button variant="primary" onClick={() => openQuickCreate('task')}><Plus size={17} />添加任务</Button></div>
    <div className="flex gap-1 overflow-x-auto border-b pb-px">{([['all','全部'],['today','今天'],['overdue','逾期'],['todo','待处理'],['in_progress','进行中'],['completed','已完成'],['cancelled','已取消']] as [Scope,string][]).map(([value, label]) => <button key={value} onClick={() => setScope(value)} className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${scope === value ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{label}</button>)}</div>
    <div className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row">
      <div className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border bg-slate-50 px-3"><Search size={15} className="text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="搜索任务…" className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none" /></div>
      <div className="flex gap-2"><div className="relative min-w-28 flex-1 sm:flex-none"><SlidersHorizontal size={14} className="pointer-events-none absolute left-2.5 top-3 text-slate-400" /><Select value={priority} onChange={e => setPriority(e.target.value as TaskPriority | 'all')} className="h-9 pl-8"><option value="all">全部优先级</option><option value="urgent">紧急</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></Select></div><div className="relative min-w-28 flex-1 sm:flex-none"><Filter size={14} className="pointer-events-none absolute left-2.5 top-3 text-slate-400" /><Select value={projectId} onChange={e => setProjectId(e.target.value)} className="h-9 pl-8"><option value="all">全部项目</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div></div>
    </div>
    <section className="overflow-hidden rounded-xl border bg-white"><div className="flex h-12 items-center justify-between border-b px-4 text-xs text-slate-400"><span>{tasks.length} 个任务</span><span className="hidden sm:inline">按截止日期排序</span></div>{tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} />) : <div className="p-5"><EmptyState icon={<ListFilter size={22} />} title="没有符合条件的任务" description="调整筛选条件，或者创建一个新的任务。" action={<Button variant="primary" size="sm" onClick={() => openQuickCreate('task')}><Plus size={15} />添加任务</Button>} /></div>}</section>
  </div>
}
