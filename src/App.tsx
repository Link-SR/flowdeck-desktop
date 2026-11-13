import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { UIProvider } from './store/UIContext'
import { WorkspaceProvider } from './store/WorkspaceContext'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then(module => ({ default: module.TasksPage })))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage').then(module => ({ default: module.ProjectsPage })))
const NotesPage = lazy(() => import('./pages/NotesPage').then(module => ({ default: module.NotesPage })))
const ArchivePage = lazy(() => import('./pages/ArchivePage').then(module => ({ default: module.ArchivePage })))

export default function App() {
  return <WorkspaceProvider><UIProvider><Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-slate-400">正在加载工作台…</div>}><Routes><Route element={<AppShell />}><Route index element={<DashboardPage />} /><Route path="tasks" element={<TasksPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="notes" element={<NotesPage />} /><Route path="archive" element={<ArchivePage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes></Suspense></UIProvider></WorkspaceProvider>
}
