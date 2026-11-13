import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, FolderKanban, Plus, Sparkles } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useWorkspace } from '../store/WorkspaceContext'
import { useUI } from '../store/UIContext'
import { isTaskOverdue, isTaskToday } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { TaskRow } from '../components/tasks/TaskRow'
import { TodayTaskPicker } from '../components/tasks/TodayTaskPicker'

export function DashboardPage() {
  const { data } = useWorkspace()
  const { openQuickCreate } = useUI()
  const [todayPickerOpen, setTodayPickerOpen] = useState(false)
  const active = data.tasks.filter(t => !t.archived && !['completed', 'cancelled'].includes(t.status))
  const today = active.filter(isTaskToday)
  const overdue = active.filter(isTaskOverdue)
  const completed = data.tasks.filter(t => t.status === 'completed').length
  const recentNotes = data.notes.filter(n => !n.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)

  return <div className="space-y-8">
    <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="mb-1 flex items-center gap-2 text-sm font-medium text-brand-600"><Sparkles size={15} />早上好，今天继续向前</p><h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">你的工作一目了然</h2><p className="mt-2 text-sm text-slate-500">聚焦今天最重要的事情，其他内容交给系统整理。</p></div>
      <Button variant="primary" onClick={() => setTodayPickerOpen(true)}><Plus size={17} />添加今日任务</Button>
    </section>

    <section className="grid grid-cols-2 overflow-hidden rounded-xl border bg-white md:grid-cols-4">
      <Metric icon={<CalendarDays size={18} />} label="今日任务" value={today.length} accent="text-blue-600 bg-blue-50" />
      <Metric icon={<Clock3 size={18} />} label="逾期任务" value={overdue.length} accent="text-rose-600 bg-rose-50" />
      <Metric icon={<FolderKanban size={18} />} label="进行中项目" value={data.projects.filter(p => p.status === 'active').length} accent="text-violet-600 bg-violet-50" />
      <Metric icon={<CheckCircle2 size={18} />} label="累计完成" value={completed} accent="text-emerald-600 bg-emerald-50" />
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.8fr)]">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border bg-white">
          <SectionHeader title="今日任务" count={today.length} to="/tasks?filter=today" action={<button onClick={() => setTodayPickerOpen(true)} className="text-xs font-medium text-brand-600 hover:text-brand-700"><Plus size={13} className="mr-1 inline" />添加</button>} />
          {today.length > 0 ? today.slice(0, 5).map(task => <TaskRow key={task.id} task={task} compact />) : <MiniEmpty text="今天还没有任务。安排一个清晰的下一步吧。" action={() => setTodayPickerOpen(true)} />}
        </section>
        {overdue.length > 0 && <section className="overflow-hidden rounded-xl border bg-white"><SectionHeader title="需要关注" count={overdue.length} to="/tasks?filter=overdue" tone="rose" />{overdue.slice(0, 4).map(task => <TaskRow key={task.id} task={task} compact />)}</section>}
      </div>
      <div className="space-y-6">
        <section className="rounded-xl border bg-white"><SectionHeader title="项目概况" count={data.projects.filter(p => p.status === 'active').length} to="/projects" /><div className="space-y-4 px-4 pb-4">{data.projects.filter(p => p.status === 'active').slice(0, 4).map(project => { const tasks = data.tasks.filter(t => t.projectId === project.id && !t.archived); const done = tasks.filter(t => t.status === 'completed').length; const progress = tasks.length ? Math.round(done / tasks.length * 100) : 0; return <Link to={`/projects?open=${project.id}`} key={project.id} className="block rounded-lg border p-3 transition hover:border-slate-300 hover:bg-slate-50"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-medium text-slate-700"><i className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</div><span className="text-xs text-slate-400">{progress}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: project.color }} /></div></Link>})}</div></section>
        <section className="rounded-xl border bg-white"><SectionHeader title="最近笔记" count={recentNotes.length} to="/notes" /><div className="px-2 pb-2">{recentNotes.map(note => <Link key={note.id} to={`/notes?open=${note.id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50"><span className="rounded-lg bg-slate-100 p-2 text-slate-400"><FileText size={15} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-slate-700">{note.title}</span><span className="block truncate text-xs text-slate-400">{note.content.replace(/[#>*\-]/g, '').slice(0, 42) || '暂无内容'}</span></span></Link>)}</div></section>
      </div>
    </div>
    <TodayTaskPicker open={todayPickerOpen} onOpenChange={setTodayPickerOpen} onCreateNew={() => openQuickCreate('task')} />
  </div>
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) { return <div className="flex items-center gap-3 border-b p-4 last:border-b-0 odd:border-r md:border-b-0 md:border-r md:last:border-r-0 sm:p-5"><span className={`rounded-lg p-2 ${accent}`}>{icon}</span><div><div className="text-xl font-semibold tabular-nums text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></div></div> }
function SectionHeader({ title, count, to, tone, action }: { title: string; count: number; to: string; tone?: 'rose'; action?: ReactNode }) { return <div className="flex h-14 items-center justify-between px-4"><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-slate-800">{title}</h3><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{count}</span></div><div className="flex items-center gap-3">{action}<Link to={to} className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-600">查看全部<ArrowRight size={13} /></Link></div></div> }
function MiniEmpty({ text, action }: { text: string; action(): void }) { return <div className="flex flex-col items-center justify-center border-t px-5 py-10 text-center"><p className="text-sm text-slate-400">{text}</p><button onClick={action} className="mt-3 text-sm font-medium text-brand-600 hover:text-brand-700">添加今日任务</button></div> }
