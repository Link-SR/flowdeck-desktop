import { Archive, ChevronLeft, ChevronRight, FolderKanban, LayoutDashboard, ListTodo, NotebookPen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { useUI } from '../../store/UIContext'

const nav = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/tasks', label: '我的任务', icon: ListTodo },
  { to: '/projects', label: '我的项目', icon: FolderKanban },
  { to: '/notes', label: '工作笔记', icon: NotebookPen },
  { to: '/archive', label: '归档记录', icon: Archive },
]

export function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, mobileNavOpen, setMobileNavOpen } = useUI()
  return <>
    {mobileNavOpen && <button aria-label="关闭导航" className="fixed inset-0 z-30 bg-slate-950/20 lg:hidden" onClick={() => setMobileNavOpen(false)} />}
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-[#f6f7f9] transition-[width,transform] duration-200', sidebarCollapsed ? 'w-[72px]' : 'w-60', mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}>
      <div className={cn('flex h-16 items-center border-b px-4', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
        <NavLink to="/" className="flex items-center gap-2.5 overflow-hidden" onClick={() => setMobileNavOpen(false)}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold tracking-tight text-white">F</span>
          {!sidebarCollapsed && <div className="whitespace-nowrap"><div className="text-sm font-semibold tracking-tight text-slate-900">Flowdeck</div><div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Personal OS</div></div>}
        </NavLink>
        {!sidebarCollapsed && <button className="rounded-md p-1 text-slate-400 hover:bg-slate-200 lg:hidden" onClick={() => setMobileNavOpen(false)}><X size={18} /></button>}
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} onClick={() => setMobileNavOpen(false)} className={({ isActive }) => cn('focus-ring flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors', isActive ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800', sidebarCollapsed && 'justify-center px-0')} title={sidebarCollapsed ? item.label : undefined}><item.icon size={18} strokeWidth={1.8} /><span className={cn('whitespace-nowrap', sidebarCollapsed && 'hidden')}>{item.label}</span></NavLink>)}
      </nav>
      <div className="border-t p-3">
        {!sidebarCollapsed && <div className="mb-3 rounded-lg border bg-white/70 p-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-xs font-medium text-slate-600">本地数据已保存</span></div><p className="mt-1.5 text-[11px] leading-4 text-slate-400">当前设备 · localStorage</p></div>}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="focus-ring hidden h-9 w-full items-center justify-center gap-2 rounded-lg text-xs text-slate-500 hover:bg-slate-200 lg:flex">{sidebarCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} />收起侧栏</>}</button>
      </div>
    </aside>
  </>
}
