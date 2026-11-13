import type { ReactNode } from 'react'

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-slate-50/50 px-6 text-center"><div className="mb-3 rounded-xl border bg-white p-3 text-slate-400">{icon}</div><h3 className="font-medium text-slate-800">{title}</h3><p className="mt-1 max-w-sm text-sm leading-6 text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div>
}
