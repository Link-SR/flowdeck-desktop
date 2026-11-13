import { Outlet } from 'react-router-dom'
import { useUI } from '../../store/UIContext'
import { NoteFormModal } from '../notes/NoteForm'
import { ProjectFormModal } from '../projects/ProjectForm'
import { TaskDrawer } from '../tasks/TaskDrawer'
import { TaskFormModal } from '../tasks/TaskForm'
import { GlobalSearch } from './GlobalSearch'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { sidebarCollapsed, quickCreate, closeQuickCreate } = useUI()
  return <div className="min-h-screen bg-canvas">
    <Sidebar />
    <div className={`min-h-screen transition-[margin] duration-200 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-60'}`}>
      <Header />
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
    </div>
    <TaskFormModal open={quickCreate === 'task'} onOpenChange={open => !open && closeQuickCreate()} />
    <ProjectFormModal open={quickCreate === 'project'} onOpenChange={open => !open && closeQuickCreate()} />
    <NoteFormModal open={quickCreate === 'note'} onOpenChange={open => !open && closeQuickCreate()} />
    <TaskDrawer />
    <GlobalSearch />
  </div>
}
