import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import type { Attachment } from '../../types'
import { AttachmentImage } from './AttachmentImage'

const ATTACHMENT_PREFIX = 'flowdeck-attachment://'

export function AttachmentMarkdown({
  content,
  attachments,
  files,
  onImageClick,
}: {
  content: string
  attachments: Attachment[]
  files?: Map<string, File>
  onImageClick?(url: string): void
}) {
  return <ReactMarkdown
    urlTransform={url => url.startsWith(ATTACHMENT_PREFIX) ? url : defaultUrlTransform(url)}
    components={{
      img({ src, alt }) {
        if (!src?.startsWith(ATTACHMENT_PREFIX)) return <img src={src} alt={alt ?? ''} />
        const id = src.slice(ATTACHMENT_PREFIX.length)
        const attachment = attachments.find(item => item.id === id && item.kind === 'image')
        if (!attachment) return <span className="rounded bg-rose-50 px-2 py-1 text-sm text-rose-600">图片附件不存在</span>
        return <AttachmentImage attachment={attachment} file={files?.get(id)} alt={alt ?? attachment.name} onClick={onImageClick} />
      },
    }}
  >{content || '*暂无内容*'}</ReactMarkdown>
}
