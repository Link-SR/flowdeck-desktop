import { createContext, useContext, useState, type ReactNode } from 'react'

type QuickCreate = 'task' | 'project' | 'note' | null

interface UIState {
  sidebarCollapsed: boolean
  setSidebarCollapsed(value: boolean): void
  mobileNavOpen: boolean
  setMobileNavOpen(value: boolean): void
  quickCreate: QuickCreate
  openQuickCreate(type: Exclude<QuickCreate, null>): void
  closeQuickCreate(): void
  selectedTaskId: string | null
  openTask(id: string): void
  closeTask(): void
  searchOpen: boolean
  setSearchOpen(value: boolean): void
}

const UIContext = createContext<UIState | null>(null)

export function UIProvider({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [quickCreate, setQuickCreate] = useState<QuickCreate>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <UIContext.Provider value={{
      sidebarCollapsed, setSidebarCollapsed,
      mobileNavOpen, setMobileNavOpen,
      quickCreate, openQuickCreate: setQuickCreate, closeQuickCreate: () => setQuickCreate(null),
      selectedTaskId, openTask: setSelectedTaskId, closeTask: () => setSelectedTaskId(null),
      searchOpen, setSearchOpen,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (!context) throw new Error('useUI must be used within UIProvider')
  return context
}
