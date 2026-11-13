import { Calendar, Check, ListTodo, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatRelativeDay, isTaskToday, priorityMeta } from '../../lib/utils'
import { useWorkspace } from '../../store/WorkspaceContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

interface TodayTaskPickerProps {
  open: boolean
  onOpenChange(open: boolean): void
  onCreateNew(): void
}

export function TodayTaskPicker({ open, onOpenChange, onCreateNew }: TodayTaskPickerProps) {
  const { data, scheduleTasksForToday } = useWorkspace()
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setSelectedIds([])
  }, [open])

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return data.tasks
      .filter(task => {
        if (task.archived || ['completed', 'cancelled'].includes(task.status) || isTaskToday(task)) return false
        const project = data.projects.find(item => item.id === task.projectId)
        return !normalizedQuery || `${task.title} ${task.description} ${project?.name ?? ''}`.toLowerCase().includes(normalizedQuery)
      })
      .sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || b.updatedAt.localeCompare(a.updatedAt))
  }, [data.projects, data.tasks, query])

  const toggleTask = (id: string) => {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const addToToday = () => {
    scheduleTasksForToday(selectedIds)
    onOpenChange(false)
  }

  const createNew = () => {
    onOpenChange(false)
    onCreateNew()
  }

  return <Modal
    open={open}
    onOpenChange={onOpenChange}
    title="添加今日任务"
    description="从已有任务中选择，原有截止日期会保留。"
    className="max-w-xl"
    footer={<>
      <Button onClick={createNew}><Plus size={16} />新建任务</Button>
      <Button variant="primary" onClick={addToToday} disabled={!selectedIds.length}>
        添加到今日{selectedIds.length > 0 ? `（${selectedIds.length}）` : ''}
      </Button>
    </>}
  >
    <div className="space-y-4">
      <div className="flex h-10 items-center gap-2 rounded-lg border bg-slate-50 px-3">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="搜索任务或项目…"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {candidates.length > 0 ? <div className="max-h-[360px] overflow-y-auto rounded-xl border">
        {candidates.map(task => {
          const selected = selectedIds.includes(task.id)
          const project = data.projects.find(item => item.id === task.projectId)
          return <label key={task.id} className="flex cursor-pointer items-center gap-3 border-b px-3.5 py-3 transition last:border-b-0 hover:bg-slate-50">
            <input className="sr-only" type="checkbox" checked={selected} onChange={() => toggleTask(task.id)} />
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>
              {selected && <Check size={13} strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-800">{task.title}</span>
                <i className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityMeta[task.priority].dot}`} />
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                {project && <span className="max-w-40 truncate"><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}
                <span className="flex items-center gap-1"><Calendar size={12} />截止：{formatRelativeDay(task.dueDate)}</span>
              </span>
            </span>
          </label>
        })}
      </div> : <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-10 text-center">
        <span className="mb-3 rounded-xl bg-slate-100 p-3 text-slate-400"><ListTodo size={22} /></span>
        <p className="text-sm font-medium text-slate-700">{query ? '没有找到匹配的任务' : '没有可添加的已有任务'}</p>
        <p className="mt-1 text-xs text-slate-400">{query ? '换个关键词试试。' : '未完成且尚未安排到今天的任务会显示在这里。'}</p>
      </div>}
    </div>
  </Modal>
}
