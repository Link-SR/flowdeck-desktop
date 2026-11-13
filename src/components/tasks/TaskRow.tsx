import { Calendar, Check, Circle, Minus, MoreHorizontal } from 'lucide-react'
import type { Task } from '../../types'
import { useWorkspace } from '../../store/WorkspaceContext'
import { useUI } from '../../store/UIContext'
import { cn, formatRelativeDay, isTaskOverdue, priorityMeta } from '../../lib/utils'

export function TaskRow({ task, compact = false }: { task: Task; compact?: boolean }) {
  const { data, setTaskStatus } = useWorkspace()
  const { openTask } = useUI()
  const project = data.projects.find(p => p.id === task.projectId)
  const complete = task.status === 'completed'

  return <div className={cn('group flex items-center gap-3 border-b px-4 transition-colors last:border-b-0 hover:bg-slate-50/80', compact ? 'min-h-[54px]' : 'min-h-[64px]')}>
    <button aria-label={complete ? '标记为未完成' : '标记为完成'} onClick={() => setTaskStatus(task.id, complete ? 'todo' : 'completed')} className={cn('focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors', complete ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white hover:border-brand-500 hover:bg-brand-50')}>
      {complete ? <Check size={12} strokeWidth={3} /> : task.status === 'cancelled' ? <Minus size={12} /> : <Circle size={6} className="fill-current opacity-0 group-hover:opacity-50" />}
    </button>
    <button className="min-w-0 flex-1 py-3 text-left" onClick={() => openTask(task.id)}>
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('truncate text-sm font-medium text-slate-800', complete && 'text-slate-400 line-through')}>{task.title}</span>
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', priorityMeta[task.priority].dot)} title={`${priorityMeta[task.priority].label}优先级`} />
      </div>
      {!compact && task.description && <p className="mt-1 truncate text-xs text-slate-400">{task.description}</p>}
    </button>
    <div className="hidden items-center gap-2 sm:flex">
      {project && <span className="max-w-28 truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-500"><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}
      <span className={cn('flex min-w-[74px] items-center justify-end gap-1 text-xs', isTaskOverdue(task) ? 'font-medium text-rose-600' : 'text-slate-400')}><Calendar size={13} />{formatRelativeDay(task.dueDate)}</span>
    </div>
    <button onClick={() => openTask(task.id)} aria-label="打开任务详情" className="focus-ring rounded-md p-1.5 text-slate-300 opacity-0 hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"><MoreHorizontal size={17} /></button>
  </div>
}
