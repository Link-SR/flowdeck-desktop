import { ImageOff, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { readAttachmentFile } from '../../services/attachmentService'
import type { Attachment } from '../../types'

export function AttachmentImage({
  attachment,
  file,
  alt,
  className,
  onClick,
}: {
  attachment: Attachment
  file?: File
  alt?: string
  className?: string
  onClick?(url: string): void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setError(null)
    const load = async () => {
      try {
        const blob = file ?? await readAttachmentFile(attachment.id, attachment.name, attachment.mimeType)
        objectUrl = URL.createObjectURL(blob)
        if (active) setUrl(objectUrl)
      } catch (reason) {
        if (active) {
          setUrl(null)
          setError(reason instanceof Error ? reason.message : String(reason))
        }
      }
    }
    void load()
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachment.id, attachment.mimeType, attachment.name, file, retry])

  if (error) {
    return <button type="button" onClick={() => setRetry(value => value + 1)} className={cn('flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-slate-50 px-4 text-xs text-slate-500', className)} title={error}>
      <ImageOff size={20} />
      <span>图片暂不可用</span>
      <span className="inline-flex items-center gap-1 text-brand-600"><RefreshCw size={12} />重试</span>
    </button>
  }

  return url
    ? <button type="button" className={cn('block max-w-full overflow-hidden rounded-lg', className)} onClick={() => onClick?.(url)}><img src={url} alt={alt ?? attachment.name} className="max-h-[520px] max-w-full rounded-lg object-contain" /></button>
    : <div className={cn('min-h-28 animate-pulse rounded-lg bg-slate-100', className)} />
}
