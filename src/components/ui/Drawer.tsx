import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Drawer({ open, onOpenChange, title, children }: { open: boolean; onOpenChange(open: boolean): void; title: string; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/20 data-[state=open]:animate-[fadeIn_.15s_ease-out]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l bg-white shadow-panel data-[state=open]:animate-[slideIn_.2s_ease-out]">
          <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
            <Dialog.Title className="truncate pr-4 text-sm font-semibold text-slate-800">{title}</Dialog.Title>
            <Dialog.Close className="focus-ring rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></Dialog.Close>
          </div>
          <div className="subtle-scrollbar flex-1 overflow-y-auto">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
