import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { FolderPlus, Menu, NotebookPen, Plus, Search, SquarePlus } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useUI } from '../../store/UIContext'
import { Button } from '../ui/Button'
import { SyncStatusDialog } from './SyncStatusDialog'

const titles: Record<string, string> = { '/': '工作台', '/tasks': '我的任务', '/projects': '我的项目', '/notes': '工作笔记', '/archive': '归档记录' }

export function Header() {
  const location = useLocation()
  const { setMobileNavOpen, setSearchOpen, openQuickCreate } = useUI()
  return <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b bg-white/90 px-4 backdrop-blur-xl sm:px-6">
    <button className="focus-ring rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
    <div className="min-w-0 flex-1"><h1 className="truncate text-base font-semibold text-slate-900">{titles[location.pathname] ?? 'Flowdeck'}</h1></div>
    <button onClick={() => setSearchOpen(true)} className="focus-ring hidden h-9 w-full max-w-xs items-center gap-2 rounded-lg border bg-slate-50 px-3 text-left text-sm text-slate-400 transition hover:border-slate-300 hover:bg-white md:flex"><Search size={16} /><span className="flex-1">搜索任务、项目和笔记</span><kbd className="rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-400">⌘ K</kbd></button>
    <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setSearchOpen(true)}><Search size={18} /></Button>
    <SyncStatusDialog />
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild><Button variant="primary"><Plus size={17} /><span className="hidden sm:inline">快速添加</span></Button></DropdownMenu.Trigger>
      <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={8} className="z-50 min-w-44 rounded-xl border bg-white p-1.5 shadow-panel"><DropdownMenu.Item onSelect={() => openQuickCreate('task')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100"><SquarePlus size={16} />添加任务</DropdownMenu.Item><DropdownMenu.Item onSelect={() => openQuickCreate('project')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100"><FolderPlus size={16} />创建项目</DropdownMenu.Item><DropdownMenu.Item onSelect={() => openQuickCreate('note')} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100"><NotebookPen size={16} />新建笔记</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Portal>
    </DropdownMenu.Root>
  </header>
}
