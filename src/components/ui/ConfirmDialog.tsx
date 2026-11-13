import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description: string
  confirmLabel?: string
  onConfirm(): void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '确认删除',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className="max-w-md"
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>取消</Button>
          <Button type="button" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/70 p-4 text-sm leading-6 text-rose-800">
        <AlertTriangle className="mt-0.5 shrink-0" size={18} />
        <p>删除后无法恢复，请确认这是你想要执行的操作。</p>
      </div>
    </Modal>
  )
}
