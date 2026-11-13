import { Archive, Calendar, CheckCircle2, Circle, PlayCircle, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUI } from '../../store/UIContext'
import { useWorkspace } from '../../store/WorkspaceContext'
import type { TaskPriority, TaskStatus } from '../../types'
import { formatDate, priorityMeta, statusMeta } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Drawer } from '../ui/Drawer'
import { FormField, Input, Select, Textarea } from '../ui/FormField'

export function TaskDrawer() {
  const { selectedTaskId, closeTask } = useUI()
  const { data, updateTask, deleteTask, setTaskStatus } = useWorkspace()
  const task = data.tasks.find(item => item.id === selectedTaskId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => { if (task) { setTitle(task.title); setDescription(task.description) } }, [task])
  if (!task) return null

  const saveText = () => updateTask(task.id, { title: title.trim() || task.title, description })
  const remove = () => {
    closeTask()
    deleteTask(task.id)
  }

  return <><Drawer open={Boolean(task)} onOpenChange={open => !open && closeTask()} title="任务详情">
    <div className="px-6 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge className={priorityMeta[task.priority].color}><i className={`h-1.5 w-1.5 rounded-full ${priorityMeta[task.priority].dot}`} />{priorityMeta[task.priority].label}优先级</Badge>
        <Badge className="bg-slate-100 text-slate-600">{statusMeta[task.status].label}</Badge>
        {task.archived && <Badge className="bg-amber-50 text-amber-700"><Archive size={12} />已归档</Badge>}
      </div>
      <textarea aria-label="任务名称" rows={2} value={title} onChange={e => setTitle(e.target.value)} onBlur={saveText} className="w-full resize-none border-0 bg-transparent p-0 text-2xl font-semibold leading-8 text-slate-900 outline-none" />
      <div className="mt-5 space-y-4">
        <FormField label="说明"><Textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={saveText} placeholder="添加说明…" className="min-h-32" /></FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="状态"><Select value={task.status} onChange={e => setTaskStatus(task.id, e.target.value as TaskStatus)}><option value="todo">待处理</option><option value="in_progress">进行中</option><option value="completed">已完成</option><option value="cancelled">已取消</option></Select></FormField>
          <FormField label="优先级"><Select value={task.priority} onChange={e => updateTask(task.id, { priority: e.target.value as TaskPriority })}><option value="urgent">紧急</option><option value="high">高</option><option value="medium">中</option><option value="low">低</option></Select></FormField>
        </div>
        <FormField label="截止日期"><Input type="date" value={task.dueDate ?? ''} onChange={e => updateTask(task.id, { dueDate: e.target.value || null })} /></FormField>
        <FormField label="所属项目"><Select value={task.projectId ?? ''} onChange={e => updateTask(task.id, { projectId: e.target.value || null })}><option value="">无项目</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></FormField>
      </div>
      <div className="mt-6 rounded-xl border bg-slate-50/70 p-4 text-xs text-slate-500">
        <div className="flex items-center gap-2"><Calendar size={14} />创建于 {formatDate(task.createdAt.slice(0, 10))}</div>
      </div>
      <div className="mt-8 flex flex-wrap gap-2 border-t pt-5">
        {task.status !== 'completed' && <Button variant="primary" onClick={() => setTaskStatus(task.id, 'completed')}><CheckCircle2 size={16} />完成</Button>}
        {task.status === 'completed' && <Button onClick={() => setTaskStatus(task.id, 'todo')}><RotateCcw size={16} />重新打开</Button>}
        {task.status === 'todo' && <Button onClick={() => setTaskStatus(task.id, 'in_progress')}><PlayCircle size={16} />开始处理</Button>}
        {task.status === 'in_progress' && <Button onClick={() => setTaskStatus(task.id, 'todo')}><Circle size={16} />暂停</Button>}
        <Button className="ml-auto" variant="ghost" onClick={() => updateTask(task.id, { archived: !task.archived })}><Archive size={16} />{task.archived ? '取消归档' : '归档'}</Button>
        <Button variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeleteOpen(true)}><Trash2 size={16} />删除</Button>
      </div>
    </div>
  </Drawer>
    <ConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      title={`删除“${task.title}”？`}
      description="该任务将从任务列表和本地数据中永久删除。"
      onConfirm={remove}
    />
  </>
}
