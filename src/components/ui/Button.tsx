import { Slot } from '@radix-ui/react-slot'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', asChild, ...props }, ref,
) {
  const Comp = asChild ? Slot : 'button'
  return <Comp ref={ref} className={cn(
    'focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
    variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
    variant === 'secondary' && 'border bg-white text-slate-700 hover:bg-slate-50',
    variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    variant === 'danger' && 'bg-rose-600 text-white hover:bg-rose-700',
    size === 'sm' && 'h-8 px-3 text-sm',
    size === 'md' && 'h-10 px-4 text-sm',
    size === 'icon' && 'h-9 w-9',
    className,
  )} {...props} />
})
