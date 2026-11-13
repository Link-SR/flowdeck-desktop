import { useEffect, useState } from 'react'
import { useWorkspace } from '../../store/WorkspaceContext'
import type { Project, ProjectInput } from '../../types'
import { Button } from '../ui/Button'
import { FormField, Input, Textarea } from '../ui/FormField'
import { Modal } from '../ui/Modal'

const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e', '#64748b']

export function ProjectFormModal({ open, onOpenChange, project }: { open: boolean; onOpenChange(open: boolean): void; project?: Project | null }) {
  const { createProject, updateProject } = useWorkspace()
  const [form, setForm] = useState<ProjectInput>({ name: '', description: '', color: colors[0] })
  useEffect(() => { if (open) setForm(project ? { name: project.name, description: project.description, color: project.color } : { name: '', description: '', color: colors[0] }) }, [open, project])
  const save = () => { if (!form.name.trim()) return; project ? updateProject(project.id, form) : createProject(form); onOpenChange(false) }

  return <Modal open={open} onOpenChange={onOpenChange} title={project ? '编辑项目' : '创建项目'} description="用项目组织一组相关任务与笔记。" footer={<><Button onClick={() => onOpenChange(false)}>取消</Button><Button variant="primary" onClick={save} disabled={!form.name.trim()}>{project ? '保存更改' : '创建项目'}</Button></>}>
    <div className="space-y-4">
      <FormField label="项目名称"><Input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例如：产品发布" /></FormField>
      <FormField label="项目说明"><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="项目目标和范围…" /></FormField>
      <FormField label="项目颜色"><div className="flex gap-3">{colors.map(color => <button key={color} type="button" onClick={() => setForm({ ...form, color })} className={`focus-ring h-8 w-8 rounded-full border-2 border-white shadow-sm ring-offset-2 ${form.color === color ? 'ring-2 ring-slate-400' : ''}`} style={{ backgroundColor: color }} aria-label={`选择颜色 ${color}`} />)}</div></FormField>
    </div>
  </Modal>
}
