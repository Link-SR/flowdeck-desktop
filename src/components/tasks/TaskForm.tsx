import { Calendar, Check, ListTodo, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../../types'
import { useWorkspace } from '../../store/WorkspaceContext'
import { Button } from '../ui/Button'
import { FormField, Input, Select, Textarea } from '../ui/FormField'
import { Modal } from '../ui/Modal'
import { formatRelativeDay, isTaskToday, priorityMeta, todayKey } from '../../lib/utils'

const emptyTask: TaskInput = { title: '', description: '', priority: 'medium', dueDate: todayKey(), projectId: null, status: 'todo' }

export function TaskFormModal({ open, onOpenChange, task, presetProjectId }: { open: boolean; onOpenChange(open: boolean): void; task?: Task | null; presetProjectId?: string | null }) {
  const { data, createTask, scheduleTasksForToday, updateTask } = useWorkspace()
  const [form, setForm] = useState<TaskInput>(emptyTask)
  const [mode, setMode] = useState<'create' | 'existing'>('create')
  const [query, setQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setMode('create')
    setQuery('')
    setSelectedIds([])
    setForm(task ? { title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate, projectId: task.projectId, status: task.status } : { ...emptyTask, projectId: presetProjectId ?? null })
  }, [open, task, presetProjectId])

  const candidates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return data.tasks
      .filter(item => {
        if (item.archived || ['completed', 'cancelled'].includes(item.status) || isTaskToday(item)) return false
        const project = data.projects.find(projectItem => projectItem.id === item.projectId)
        return !normalizedQuery || `${item.title} ${item.description} ${project?.name ?? ''}`.toLowerCase().includes(normalizedQuery)
      })
      .sort((a, b) => (a.dueDate ?? '9999-12-31').localeCompare(b.dueDate ?? '9999-12-31') || b.updatedAt.localeCompare(a.updatedAt))
  }, [data.projects, data.tasks, query])

  const save = () => {
    if (!form.title.trim()) return
    if (task) updateTask(task.id, form)
    else createTask(form)
    onOpenChange(false)
  }

  const toggleTask = (id: string) => {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  const addExistingToToday = () => {
    scheduleTasksForToday(selectedIds)
    onOpenChange(false)
  }

  const isSelectingExisting = !task && mode === 'existing'

  return <Modal open={open} onOpenChange={onOpenChange} title={task ? '编辑任务' : '添加任务'} description={task ? '更新任务信息与执行状态。' : isSelectingExisting ? '选择已创建的任务并加入今日，不会改变原有截止日期。' : '新建任务，或从已有任务中安排今天要做的事。'} className={!task ? 'max-w-xl' : undefined} footer={<><Button onClick={() => onOpenChange(false)}>取消</Button>{isSelectingExisting ? <Button variant="primary" onClick={addExistingToToday} disabled={!selectedIds.length}>加入今日{selectedIds.length > 0 ? `（${selectedIds.length}）` : ''}</Button> : <Button variant="primary" onClick={save} disabled={!form.title.trim()}>{task ? '保存更改' : '添加任务'}</Button>}</>}>
    <div className="space-y-4">
      {!task && <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
        <button type="button" onClick={() => setMode('create')} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'create' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>新建任务</button>
        <button type="button" onClick={() => setMode('existing')} className={`rounded-md px-3 py-2 text-sm font-medium transition ${mode === 'existing' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>选择已有任务</button>
      </div>}

      {isSelectingExisting ? <ExistingTaskList candidates={candidates} projects={data.projects} query={query} selectedIds={selectedIds} onQueryChange={setQuery} onToggle={toggleTask} /> : <>
      <FormField label="任务名称"><Input autoFocus value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例如：完成首页交互评审" onKeyDown={e => { if (e.key === 'Enter') save() }} /></FormField>
      <FormField label="说明"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="补充背景、完成标准或相关信息…" /></FormField>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="优先级"><Select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })}><option value="urgent">紧急</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></Select></FormField>
        <FormField label="截止日期"><Input type="date" value={form.dueDate ?? ''} onChange={e => setForm({ ...form, dueDate: e.target.value || null })} /></FormField>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField label="所属项目"><Select value={form.projectId ?? ''} onChange={e => setForm({ ...form, projectId: e.target.value || null })}><option value="">无项目</option>{data.projects.filter(p => p.status === 'active').map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></FormField>
        <FormField label="状态"><Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })}><option value="todo">待处理</option><option value="in_progress">进行中</option><option value="completed">已完成</option><option value="cancelled">已取消</option></Select></FormField>
      </div>
      </>}
    </div>
  </Modal>
}

function ExistingTaskList({ candidates, projects, query, selectedIds, onQueryChange, onToggle }: {
  candidates: Task[]
  projects: { id: string; name: string; color: string }[]
  query: string
  selectedIds: string[]
  onQueryChange(value: string): void
  onToggle(id: string): void
}) {
  return <div className="space-y-4">
    <div className="flex h-10 items-center gap-2 rounded-lg border bg-slate-50 px-3">
      <Search size={16} className="shrink-0 text-slate-400" />
      <input autoFocus value={query} onChange={event => onQueryChange(event.target.value)} placeholder="搜索任务或项目…" className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
    </div>
    {candidates.length > 0 ? <div className="max-h-[330px] overflow-y-auto rounded-xl border">
      {candidates.map(item => {
        const selected = selectedIds.includes(item.id)
        const project = projects.find(projectItem => projectItem.id === item.projectId)
        return <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b px-3.5 py-3 transition last:border-b-0 hover:bg-slate-50">
          <input className="sr-only" type="checkbox" checked={selected} onChange={() => onToggle(item.id)} />
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${selected ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 bg-white'}`}>{selected && <Check size={13} strokeWidth={3} />}</span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2"><span className="truncate text-sm font-medium text-slate-800">{item.title}</span><i className={`h-1.5 w-1.5 shrink-0 rounded-full ${priorityMeta[item.priority].dot}`} /></span>
            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              {project && <span className="max-w-40 truncate"><i className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />{project.name}</span>}
              <span className="flex items-center gap-1"><Calendar size={12} />截止：{formatRelativeDay(item.dueDate)}</span>
            </span>
          </span>
        </label>
      })}
    </div> : <div className="flex flex-col items-center rounded-xl border border-dashed px-5 py-9 text-center">
      <span className="mb-3 rounded-xl bg-slate-100 p-3 text-slate-400"><ListTodo size={22} /></span>
      <p className="text-sm font-medium text-slate-700">{query ? '没有找到匹配的任务' : '没有可添加的已有任务'}</p>
      <p className="mt-1 text-xs text-slate-400">{query ? '换个关键词试试。' : '未完成且尚未安排到今天的任务会显示在这里。'}</p>
    </div>}
  </div>
}
