import { File, FileSpreadsheet, FileText, Image, Paperclip, Plus, Presentation, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  formatFileSize,
  getAttachmentAvailability,
  isNativeAttachmentAvailable,
  openAttachmentFile,
  type AttachmentAvailability,
} from '../../services/attachmentService'
import type { Attachment } from '../../types'
import { Button } from '../ui/Button'
import { AttachmentImage } from './AttachmentImage'

function documentIcon(name: string) {
  const extension = name.split('.').pop()?.toLowerCase()
  if (['xls', 'xlsx', 'csv'].includes(extension ?? '')) return <FileSpreadsheet size={19} />
  if (['ppt', 'pptx'].includes(extension ?? '')) return <Presentation size={19} />
  if (['txt', 'md', 'markdown'].includes(extension ?? '')) return <FileText size={19} />
  return <File size={19} />
}

function availabilityLabel(status: AttachmentAvailability | 'pending' | undefined) {
  if (status === 'pending') return '待保存'
  if (status === 'local') return '本机可用'
  if (status === 'synced') return 'OneDrive 可用'
  if (status === 'missing') return '暂不可用'
  return '检测中…'
}

export function AttachmentPanel({
  attachments,
  files,
  editable = false,
  onAdd,
  onInsert,
  onRemove,
  onImageClick,
}: {
  attachments: Attachment[]
  files?: Map<string, File>
  editable?: boolean
  onAdd?(): void
  onInsert?(attachment: Attachment): void
  onRemove?(attachment: Attachment): void
  onImageClick?(url: string): void
}) {
  const [availability, setAvailability] = useState<Record<string, AttachmentAvailability>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [retry, setRetry] = useState(0)
  const native = isNativeAttachmentAvailable()

  useEffect(() => {
    let active = true
    const inspect = async () => {
      const persisted = attachments.filter(attachment => !files?.has(attachment.id))
      const results = await Promise.all(persisted.map(async attachment => {
        try {
          return [attachment.id, await getAttachmentAvailability(attachment.id, attachment.name)] as const
        } catch {
          return [attachment.id, 'missing'] as const
        }
      }))
      if (active) setAvailability(Object.fromEntries(results))
    }
    void inspect()
    return () => { active = false }
  }, [attachments, files, retry])

  const openDocument = async (attachment: Attachment) => {
    setErrors(current => ({ ...current, [attachment.id]: '' }))
    try {
      await openAttachmentFile(attachment.id, attachment.name)
    } catch (reason) {
      setErrors(current => ({ ...current, [attachment.id]: reason instanceof Error ? reason.message : String(reason) }))
    }
  }

  const images = attachments.filter(attachment => attachment.kind === 'image')
  const documents = attachments.filter(attachment => attachment.kind === 'document')

  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><Paperclip size={15} />附件 <span className="text-xs font-normal text-slate-400">{attachments.length}</span></div>
      {editable && <Button type="button" size="sm" onClick={onAdd} disabled={!native}><Plus size={14} />添加图片或文档</Button>}
    </div>
    {!native && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">附件功能仅在 Flowdeck 桌面版中可用。</div>}
    {!attachments.length && <div className="rounded-lg border border-dashed px-4 py-6 text-center text-xs text-slate-400">
      {editable ? '可选择文件、拖入文件，或在正文中粘贴截图' : '这篇笔记没有附件'}
    </div>}

    {images.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
      {images.map(attachment => <div key={attachment.id} className="group relative overflow-hidden rounded-xl border bg-white p-2">
        <AttachmentImage attachment={attachment} file={files?.get(attachment.id)} className="h-36 bg-slate-50" onClick={onImageClick} />
        <div className="mt-2 flex items-start gap-2 px-1 pb-1">
          <Image size={15} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-slate-700" title={attachment.name}>{attachment.name}</div><div className="mt-0.5 text-[11px] text-slate-400">{formatFileSize(attachment.size)} · {availabilityLabel(files?.has(attachment.id) ? 'pending' : availability[attachment.id])}</div></div>
          {editable && <div className="flex shrink-0 gap-1">
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onInsert?.(attachment)}>插入正文</Button>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-rose-500" title="删除附件" onClick={() => onRemove?.(attachment)}><Trash2 size={14} /></Button>
          </div>}
        </div>
      </div>)}
    </div>}

    {documents.length > 0 && <div className="space-y-2">
      {documents.map(attachment => <div key={attachment.id} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-3">
        <span className="rounded-lg bg-slate-100 p-2 text-slate-500">{documentIcon(attachment.name)}</span>
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-700" title={attachment.name}>{attachment.name}</div><div className="mt-0.5 text-xs text-slate-400">{formatFileSize(attachment.size)} · {availabilityLabel(files?.has(attachment.id) ? 'pending' : availability[attachment.id])}</div>{errors[attachment.id] && <div className="mt-1 text-xs text-rose-600">{errors[attachment.id]}</div>}</div>
        {!files?.has(attachment.id) && <Button type="button" size="sm" onClick={() => void openDocument(attachment)} disabled={!native}>打开</Button>}
        {availability[attachment.id] === 'missing' && <Button type="button" size="icon" variant="ghost" title="重试" onClick={() => setRetry(value => value + 1)}><RefreshCw size={15} /></Button>}
        {editable && <Button type="button" size="icon" variant="ghost" className="text-rose-500" title="删除附件" onClick={() => onRemove?.(attachment)}><Trash2 size={15} /></Button>}
      </div>)}
    </div>}
  </section>
}
