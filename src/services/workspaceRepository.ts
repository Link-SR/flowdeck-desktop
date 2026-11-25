import { seedData } from '../data/seed'
import type { Attachment, Note, Project, SyncStatus, Task, WorkspaceData } from '../types'

const STORAGE_KEY = 'flowdeck-workspace-v1'
const MIGRATION_BACKUP_KEY = 'flowdeck-workspace-v1-migration-backup'

interface NativeSyncPayload {
  snapshots: unknown[]
  status: SyncStatus
}

interface TauriInternals {
  invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: TauriInternals
  }
}

const emptyDeleted = () => ({
  tasks: {} as Record<string, string>,
  projects: {} as Record<string, string>,
  notes: {} as Record<string, string>,
  attachments: {} as Record<string, string>,
})

function validTombstones(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  )
}

export function normalizeWorkspace(value: unknown): WorkspaceData | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Partial<WorkspaceData>
  if (!Array.isArray(data.tasks) || !Array.isArray(data.projects) || !Array.isArray(data.notes)) return null

  return {
    version: 4,
    tasks: data.tasks.map(task => ({ ...task, scheduledDate: task.scheduledDate ?? null })),
    projects: data.projects,
    notes: data.notes,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    deleted: {
      tasks: validTombstones(data.deleted?.tasks),
      projects: validTombstones(data.deleted?.projects),
      notes: validTombstones(data.deleted?.notes),
      attachments: validTombstones(data.deleted?.attachments),
    },
  }
}

function mergeTombstones(sources: WorkspaceData[]) {
  const deleted = emptyDeleted()
  for (const source of sources) {
    for (const kind of ['tasks', 'projects', 'notes', 'attachments'] as const) {
      for (const [id, timestamp] of Object.entries(source.deleted[kind])) {
        if (!deleted[kind][id] || timestamp > deleted[kind][id]) deleted[kind][id] = timestamp
      }
    }
  }
  return deleted
}

function mergeCollection<T extends { id: string; updatedAt: string; createdAt: string }>(
  sources: T[][],
  tombstones: Record<string, string>,
) {
  const records = new Map<string, T>()
  for (const source of sources) {
    for (const item of source) {
      const current = records.get(item.id)
      const itemSignature = JSON.stringify(item)
      const currentSignature = current ? JSON.stringify(current) : ''
      if (!current || item.updatedAt > current.updatedAt || (item.updatedAt === current.updatedAt && itemSignature > currentSignature)) {
        records.set(item.id, item)
      }
    }
  }

  return [...records.values()]
    .filter(item => !tombstones[item.id] || item.updatedAt > tombstones[item.id])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
}

export function mergeWorkspaces(...values: WorkspaceData[]): WorkspaceData {
  const sources = values.map(normalizeWorkspace).filter((value): value is WorkspaceData => Boolean(value))
  if (!sources.length) return structuredClone(seedData)

  const deleted = mergeTombstones(sources)
  return {
    version: 4,
    deleted,
    tasks: mergeCollection<Task>(sources.map(source => source.tasks), deleted.tasks),
    projects: mergeCollection<Project>(sources.map(source => source.projects), deleted.projects),
    notes: mergeCollection<Note>(sources.map(source => source.notes), deleted.notes),
    attachments: mergeCollection<Attachment>(sources.map(source => source.attachments), deleted.attachments),
  }
}

export function workspaceSignature(data: WorkspaceData) {
  return JSON.stringify(normalizeWorkspace(data))
}

class WorkspaceRepository {
  private readonly native = window.__TAURI_INTERNALS__
  private readonly savedLocalValue = localStorage.getItem(STORAGE_KEY)

  loadLocal(): WorkspaceData {
    if (this.savedLocalValue) {
      try {
        const restored = normalizeWorkspace(JSON.parse(this.savedLocalValue))
        if (restored) return restored
      } catch (error) {
        console.warn('Unable to restore local workspace data', error)
      }
    }
    return structuredClone(seedData)
  }

  async initialize(localData: WorkspaceData): Promise<{ data: WorkspaceData; status: SyncStatus }> {
    if (!this.native) return { data: localData, status: this.browserStatus() }

    const payload = await this.native.invoke<NativeSyncPayload>('load_workspace_snapshots')
    const snapshots = payload.snapshots
      .map(normalizeWorkspace)
      .filter((value): value is WorkspaceData => Boolean(value))

    if (this.savedLocalValue && !localStorage.getItem(MIGRATION_BACKUP_KEY)) {
      localStorage.setItem(MIGRATION_BACKUP_KEY, this.savedLocalValue)
    }

    const data = snapshots.length
      ? mergeWorkspaces(...(this.savedLocalValue ? [localData, ...snapshots] : snapshots))
      : localData
    return { data, status: payload.status }
  }

  async refresh(): Promise<{ data: WorkspaceData | null; status: SyncStatus }> {
    if (!this.native) return { data: null, status: this.browserStatus() }
    const payload = await this.native.invoke<NativeSyncPayload>('load_workspace_snapshots')
    const snapshots = payload.snapshots
      .map(normalizeWorkspace)
      .filter((value): value is WorkspaceData => Boolean(value))
    return {
      data: snapshots.length ? mergeWorkspaces(...snapshots) : null,
      status: payload.status,
    }
  }

  async save(data: WorkspaceData): Promise<SyncStatus> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    if (!this.native) return this.browserStatus()
    return this.native.invoke<SyncStatus>('save_workspace_snapshot', { data })
  }

  async redetect(): Promise<SyncStatus> {
    if (!this.native) return this.browserStatus()
    return this.native.invoke<SyncStatus>('set_sync_directory', { directory: null })
  }

  private browserStatus(): SyncStatus {
    return {
      mode: 'browser',
      path: '浏览器本地存储',
      isAvailable: false,
      message: '网页版仅保存在当前浏览器；桌面版会自动使用 OneDrive。',
      lastSyncedAt: null,
    }
  }
}

export const workspaceRepository = new WorkspaceRepository()
