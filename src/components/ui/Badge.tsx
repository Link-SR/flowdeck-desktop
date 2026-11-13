import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium', className)}>{children}</span>
}
