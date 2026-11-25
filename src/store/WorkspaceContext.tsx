import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { mergeWorkspaces, workspaceRepository, workspaceSignature } from '../services/workspaceRepository'
import type { Attachment, Note, NoteInput, Project, ProjectInput, SyncStatus, Task, TaskInput, TaskStatus, WorkspaceData } from '../types'
import { createId, todayKey } from '../lib/utils'

export type SyncPhase = 'loading' | 'syncing' | 'synced' | 'offline' | 'error'

interface WorkspaceActions {
  data: WorkspaceData
  syncStatus: SyncStatus
  syncPhase: SyncPhase
  syncError: string | null
  redetectSyncDirectory(): Promise<void>
  createTask(input: TaskInput): Task
  updateTask(id: string, patch: Partial<Task>): void
  scheduleTasksForToday(ids: string[]): void
  deleteTask(id: string): void
  setTaskStatus(id: string, status: TaskStatus): void
  createProject(input: ProjectInput): Project
  updateProject(id: string, patch: Partial<Project>): void
  deleteProject(id: string): void
  createNote(input: NoteInput, id?: string): Note
  updateNote(id: string, patch: Partial<Note>): void
  deleteNote(id: string): void
  addAttachments(items: Attachment[]): void
  deleteAttachments(ids: string[]): void
}

const initialSyncStatus: SyncStatus = {
  mode: 'local',
  path: '正在检测…',
  isAvailable: false,
  message: '正在检测 OneDrive 同步目录。',
  lastSyncedAt: null,
}

const WorkspaceContext = createContext<WorkspaceActions | null>(null)

function phaseForStatus(status: SyncStatus): SyncPhase {
  return status.isAvailable ? 'synced' : 'offline'
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<WorkspaceData>(() => workspaceRepository.loadLocal())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(initialSyncStatus)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>('loading')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const latestData = useRef(data)
  const saveSequence = useRef(0)

  useEffect(() => {
    latestData.current = data
  }, [data])

  useEffect(() => {
    let cancelled = false
    setSyncPhase('loading')
    workspaceRepository.initialize(latestData.current)
      .then(result => {
        if (cancelled) return
        setData(result.data)
        setSyncStatus(result.status)
        setSyncPhase(phaseForStatus(result.status))
        setSyncError(null)
        setReady(true)
      })
      .catch(error => {
        if (cancelled) return
        setSyncPhase('error')
        setSyncError(error instanceof Error ? error.message : String(error))
        setReady(true)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    const sequence = ++saveSequence.current
    setSyncPhase('syncing')
    const timer = window.setTimeout(() => {
      workspaceRepository.save(data)
        .then(status => {
          if (sequence !== saveSequence.current) return
          setSyncStatus(status)
          setSyncPhase(phaseForStatus(status))
          setSyncError(null)
        })
        .catch(error => {
          if (sequence !== saveSequence.current) return
          setSyncPhase('error')
          setSyncError(error instanceof Error ? error.message : String(error))
        })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [data, ready])

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const refresh = async () => {
      try {
        const result = await workspaceRepository.refresh()
        if (cancelled) return
        const mergedData = result.data ? mergeWorkspaces(latestData.current, result.data) : latestData.current
        if (result.data) {
          setData(current => {
            const merged = mergeWorkspaces(current, result.data!)
            return workspaceSignature(current) === workspaceSignature(merged) ? current : merged
          })
        }
        const shouldRetryWrite = result.status.isAvailable && (!syncStatus.isAvailable || syncPhase === 'error')
        const currentStatus = shouldRetryWrite ? await workspaceRepository.save(mergedData) : result.status
        if (cancelled) return
        setSyncStatus(currentStatus)
        if (syncPhase !== 'syncing' || shouldRetryWrite) setSyncPhase(phaseForStatus(currentStatus))
        setSyncError(null)
      } catch (error) {
        if (cancelled) return
        setSyncPhase('error')
        setSyncError(error instanceof Error ? error.message : String(error))
      }
    }
    const interval = window.setInterval(refresh, 5_000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [ready, syncPhase, syncStatus.isAvailable])

  const redetectSyncDirectory = useCallback(async () => {
    setSyncPhase('syncing')
    setSyncError(null)
    try {
      const detected = await workspaceRepository.redetect()
      const refreshed = await workspaceRepository.refresh()
      const merged = refreshed.data ? mergeWorkspaces(latestData.current, refreshed.data) : latestData.current
      setData(merged)
      const savedStatus = await workspaceRepository.save(merged)
      setSyncStatus(savedStatus ?? detected)
      setSyncPhase(phaseForStatus(savedStatus ?? detected))
    } catch (error) {
      setSyncPhase('error')
      setSyncError(error instanceof Error ? error.message : String(error))
    }
  }, [])

  const value = useMemo<WorkspaceActions>(() => ({
    data,
    syncStatus,
    syncPhase,
    syncError,
    redetectSyncDirectory,
    createTask(input) {
      const now = new Date().toISOString()
      const task: Task = { id: createId('task'), title: input.title.trim(), description: input.description, priority: input.priority, dueDate: input.dueDate, scheduledDate: null, projectId: input.projectId, status: input.status ?? 'todo', createdAt: now, updatedAt: now, completedAt: null, archived: false }
      setData(current => ({ ...current, tasks: [task, ...current.tasks] }))
      return task
    },
    updateTask(id, patch) {
      setData(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? { ...task, ...patch, updatedAt: new Date().toISOString() } : task) }))
    },
    scheduleTasksForToday(ids) {
      if (!ids.length) return
      const selectedIds = new Set(ids)
      const now = new Date().toISOString()
      const scheduledDate = todayKey()
      setData(current => ({
        ...current,
        tasks: current.tasks.map(task => selectedIds.has(task.id) ? { ...task, scheduledDate, updatedAt: now } : task),
      }))
    },
    deleteTask(id) {
      const deletedAt = new Date().toISOString()
      setData(current => ({
        ...current,
        tasks: current.tasks.filter(task => task.id !== id),
        deleted: { ...current.deleted, tasks: { ...current.deleted.tasks, [id]: deletedAt } },
      }))
    },
    setTaskStatus(id, status) {
      setData(current => ({ ...current, tasks: current.tasks.map(task => task.id === id ? { ...task, status, completedAt: status === 'completed' ? new Date().toISOString() : null, updatedAt: new Date().toISOString() } : task) }))
    },
    createProject(input) {
      const now = new Date().toISOString()
      const project: Project = { id: createId('project'), ...input, name: input.name.trim(), status: 'active', createdAt: now, updatedAt: now }
      setData(current => ({ ...current, projects: [project, ...current.projects] }))
      return project
    },
    updateProject(id, patch) {
      setData(current => ({ ...current, projects: current.projects.map(project => project.id === id ? { ...project, ...patch, updatedAt: new Date().toISOString() } : project) }))
    },
    deleteProject(id) {
      const deletedAt = new Date().toISOString()
      setData(current => ({
        ...current,
        projects: current.projects.filter(project => project.id !== id),
        tasks: current.tasks.map(task => task.projectId === id ? { ...task, projectId: null, updatedAt: deletedAt } : task),
        notes: current.notes.map(note => note.projectId === id ? { ...note, projectId: null, updatedAt: deletedAt } : note),
        deleted: { ...current.deleted, projects: { ...current.deleted.projects, [id]: deletedAt } },
      }))
    },
    createNote(input, id) {
      const now = new Date().toISOString()
      const note: Note = { id: id ?? createId('note'), ...input, title: input.title.trim(), createdAt: now, updatedAt: now, archived: false }
      setData(current => ({ ...current, notes: [note, ...current.notes] }))
      return note
    },
    updateNote(id, patch) {
      setData(current => ({ ...current, notes: current.notes.map(note => note.id === id ? { ...note, ...patch, updatedAt: new Date().toISOString() } : note) }))
    },
    deleteNote(id) {
      const deletedAt = new Date().toISOString()
      setData(current => ({
        ...current,
        notes: current.notes.filter(note => note.id !== id),
        attachments: current.attachments.filter(attachment => attachment.noteId !== id),
        deleted: {
          ...current.deleted,
          notes: { ...current.deleted.notes, [id]: deletedAt },
          attachments: current.attachments
            .filter(attachment => attachment.noteId === id)
            .reduce((deleted, attachment) => ({ ...deleted, [attachment.id]: deletedAt }), current.deleted.attachments),
        },
      }))
    },
    addAttachments(items) {
      if (!items.length) return
      setData(current => ({ ...current, attachments: [...items, ...current.attachments] }))
    },
    deleteAttachments(ids) {
      if (!ids.length) return
      const deletedAt = new Date().toISOString()
      const selectedIds = new Set(ids)
      setData(current => ({
        ...current,
        attachments: current.attachments.filter(attachment => !selectedIds.has(attachment.id)),
        deleted: {
          ...current.deleted,
          attachments: ids.reduce((deleted, id) => ({ ...deleted, [id]: deletedAt }), current.deleted.attachments),
        },
      }))
    },
  }), [data, redetectSyncDirectory, syncError, syncPhase, syncStatus])

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return context
}
