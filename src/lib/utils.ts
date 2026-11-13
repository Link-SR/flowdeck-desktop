import { clsx, type ClassValue } from 'clsx'
import { format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { twMerge } from 'tailwind-merge'
import type { Task, TaskPriority, TaskStatus } from '../types'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
export const todayKey = () => format(new Date(), 'yyyy-MM-dd')

export const isTaskOverdue = (task: Task) =>
  Boolean(task.dueDate && !['completed', 'cancelled'].includes(task.status) && isBefore(parseISO(task.dueDate), startOfDay(new Date())))

export const isTaskToday = (task: Task) => Boolean(
  (task.dueDate && isSameDay(parseISO(task.dueDate), new Date())) ||
  (task.scheduledDate && isSameDay(parseISO(task.scheduledDate), new Date())),
)

export const formatDate = (value: string | null, compact = false) => {
  if (!value) return '无截止日期'
  return format(parseISO(value), compact ? 'M月d日' : 'yyyy年M月d日', { locale: zhCN })
}

export const formatRelativeDay = (value: string | null) => {
  if (!value) return '无截止日期'
  const date = parseISO(value)
  const today = startOfDay(new Date())
  if (isSameDay(date, today)) return '今天'
  if (isSameDay(date, new Date(today.getTime() + 86400000))) return '明天'
  if (isBefore(date, today)) return `已逾期 · ${formatDate(value, true)}`
  return formatDate(value, true)
}

export const priorityMeta: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  urgent: { label: '紧急', color: 'text-rose-600 bg-rose-50', dot: 'bg-rose-500' },
  high: { label: '高', color: 'text-orange-600 bg-orange-50', dot: 'bg-orange-500' },
  medium: { label: '中', color: 'text-blue-600 bg-blue-50', dot: 'bg-blue-500' },
  low: { label: '低', color: 'text-slate-500 bg-slate-100', dot: 'bg-slate-400' },
}

export const statusMeta: Record<TaskStatus, { label: string }> = {
  todo: { label: '待处理' },
  in_progress: { label: '进行中' },
  completed: { label: '已完成' },
  cancelled: { label: '已取消' },
}
