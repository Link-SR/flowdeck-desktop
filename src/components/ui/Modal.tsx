import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface ModalProps {
  open: boolean
  onOpenChange(open: boolean): void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

export function Modal({ open, onOpenChange, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[2px] data-[state=open]:animate-[fadeIn_.15s_ease-out]" />
        <Dialog.Content className={cn('fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border bg-white shadow-panel', className)}>
          <div className="flex items-start justify-between border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-sm text-slate-500">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="focus-ring rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></Dialog.Close>
          </div>
          <div className="max-h-[calc(90vh-140px)] overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex items-center justify-end gap-2 border-t bg-slate-50/70 px-5 py-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
