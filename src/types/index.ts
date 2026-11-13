export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  scheduledDate: string | null
  projectId: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
  archived: boolean
}

export interface Project {
  id: string
  name: string
  description: string
  color: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
}

export interface Note {
  id: string
  title: string
  content: string
  projectId: string | null
  createdAt: string
  updatedAt: string
  archived: boolean
}

export interface WorkspaceData {
  tasks: Task[]
  projects: Project[]
  notes: Note[]
  version: number
  deleted: {
    tasks: Record<string, string>
    projects: Record<string, string>
    notes: Record<string, string>
  }
}

export interface SyncStatus {
  mode: 'onedrive' | 'custom' | 'local' | 'browser'
  path: string
  isAvailable: boolean
  message: string
  lastSyncedAt: number | null
}

export type TaskInput = Pick<Task, 'title' | 'description' | 'priority' | 'dueDate' | 'projectId'> &
  Partial<Pick<Task, 'status'>>
export type ProjectInput = Pick<Project, 'name' | 'description' | 'color'>
export type NoteInput = Pick<Note, 'title' | 'content' | 'projectId'>
