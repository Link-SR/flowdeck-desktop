import { invoke } from '@tauri-apps/api/core'
import type { AttachmentKind } from '../types'

export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const DOCUMENT_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt', 'md', 'markdown',
])

export const attachmentFileAccept = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
].map(extension => `.${extension}`).join(',')

export type AttachmentAvailability = 'local' | 'synced' | 'missing'

export function isNativeAttachmentAvailable() {
  return Boolean(window.__TAURI_INTERNALS__)
}

export function attachmentKindForFile(file: Pick<File, 'name'>): AttachmentKind | null {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!extension) return null
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'
  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document'
  return null
}

export function validateAttachmentFile(file: File): AttachmentKind {
  const kind = attachmentKindForFile(file)
  if (!kind) throw new Error(`不支持“${file.name}”的文件类型。`)
  if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`“${file.name}”超过 50 MB。`)
  return kind
}

export async function writeAttachmentFile(id: string, file: File) {
  if (!isNativeAttachmentAvailable()) throw new Error('附件功能仅在 Flowdeck 桌面版中可用。')
  await invoke<string>('prepare_attachment', { id, name: file.name, size: file.size })
  await invoke('write_attachment', new Uint8Array(await file.arrayBuffer()), {
    headers: { 'x-flowdeck-attachment-id': id },
  })
}

export async function readAttachmentFile(id: string, name: string, mimeType: string) {
  if (!isNativeAttachmentAvailable()) throw new Error('请使用 Flowdeck 桌面版查看附件。')
  const response = await invoke<ArrayBuffer | Uint8Array>('read_attachment', { id, name })
  const bytes = response instanceof ArrayBuffer ? response : response.buffer.slice(
    response.byteOffset,
    response.byteOffset + response.byteLength,
  )
  return new Blob([bytes], { type: mimeType })
}

export async function openAttachmentFile(id: string, name: string) {
  if (!isNativeAttachmentAvailable()) throw new Error('请使用 Flowdeck 桌面版打开附件。')
  await invoke('open_attachment', { id, name })
}

export async function getAttachmentAvailability(id: string, name: string): Promise<AttachmentAvailability> {
  if (!isNativeAttachmentAvailable()) return 'missing'
  return invoke<AttachmentAvailability>('attachment_availability', { id, name })
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10 * 1024 ? 1 : 0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function attachmentMarkdown(id: string, name: string) {
  return `![${name.replace(/[\[\]]/g, '')}](flowdeck-attachment://${id})`
}

export function removeAttachmentMarkdown(content: string, ids: string[]) {
  if (!ids.length) return content
  const escapedIds = ids.map(id => id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const reference = new RegExp(`!\\[[^\\]]*\\]\\(flowdeck-attachment:\\/\\/(?:${escapedIds})\\)`, 'g')
  return content.replace(reference, '').replace(/\n{3,}/g, '\n\n')
}
