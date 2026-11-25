import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function FormField({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}</label>
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('focus-ring h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400', className)} {...props} />
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn('focus-ring min-h-24 w-full resize-y rounded-lg border bg-white px-3 py-2.5 text-sm leading-6 text-slate-800 placeholder:text-slate-400', className)} {...props} />
})

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('focus-ring h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-700', className)} {...props} />
}
