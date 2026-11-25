import { addDays, format, subDays } from 'date-fns'
import type { WorkspaceData } from '../types'

const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd')
const stamp = (offset = 0) => subDays(new Date(), offset).toISOString()

export const seedData: WorkspaceData = {
  version: 4,
  deleted: { tasks: {}, projects: {}, notes: {}, attachments: {} },
  attachments: [],
  projects: [
    { id: 'project-launch', name: '产品发布', description: '准备个人工作台第一阶段发布与反馈收集', color: '#3b82f6', status: 'active', createdAt: stamp(14), updatedAt: stamp() },
    { id: 'project-growth', name: '内容增长', description: '建立稳定的内容策划与发布节奏', color: '#8b5cf6', status: 'active', createdAt: stamp(30), updatedAt: stamp(2) },
    { id: 'project-ops', name: '个人运营', description: '整理日常系统、复盘与长期习惯', color: '#10b981', status: 'active', createdAt: stamp(60), updatedAt: stamp(4) },
  ],
  tasks: [
    { id: 'task-1', title: '整理本周工作优先级', description: '确认三个最重要的交付，并同步到项目计划。', status: 'todo', priority: 'high', dueDate: day(0), scheduledDate: null, projectId: 'project-ops', createdAt: stamp(3), updatedAt: stamp(), completedAt: null, archived: false },
    { id: 'task-2', title: '评审首页交互原型', description: '重点检查快速添加、任务抽屉与响应式表现。', status: 'in_progress', priority: 'urgent', dueDate: day(0), scheduledDate: null, projectId: 'project-launch', createdAt: stamp(5), updatedAt: stamp(), completedAt: null, archived: false },
    { id: 'task-3', title: '准备用户访谈提纲', description: '围绕任务录入成本和日常复盘体验设计 8 个问题。', status: 'todo', priority: 'medium', dueDate: day(1), scheduledDate: null, projectId: 'project-launch', createdAt: stamp(7), updatedAt: stamp(1), completedAt: null, archived: false },
    { id: 'task-4', title: '更新内容选题池', description: '补充五个可执行选题。', status: 'todo', priority: 'low', dueDate: day(-2), scheduledDate: null, projectId: 'project-growth', createdAt: stamp(8), updatedAt: stamp(2), completedAt: null, archived: false },
    { id: 'task-5', title: '整理季度目标', description: '', status: 'completed', priority: 'medium', dueDate: day(-4), scheduledDate: null, projectId: 'project-ops', createdAt: stamp(12), updatedAt: stamp(4), completedAt: stamp(4), archived: false },
  ],
  notes: [
    { id: 'note-1', title: '首页体验评审', content: '## 关键发现\n\n- 快速添加应该始终可见\n- 今日任务要优先显示\n- 详情编辑不应打断上下文\n\n> 第一阶段先把基础工作流做顺。', projectId: 'project-launch', createdAt: stamp(4), updatedAt: stamp(), archived: false },
    { id: 'note-2', title: '本周复盘', content: '## 做得好的\n\n完成了核心信息架构。\n\n## 下周关注\n\n1. 缩短任务录入路径\n2. 整理历史笔记', projectId: 'project-ops', createdAt: stamp(7), updatedAt: stamp(2), archived: false },
  ],
}
