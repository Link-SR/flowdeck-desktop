import { AlertTriangle, CheckCircle2, Cloud, CloudOff, LoaderCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useWorkspace, type SyncPhase } from '../../store/WorkspaceContext'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

const phaseLabels: Record<SyncPhase, string> = {
  loading: '正在检测',
  syncing: '正在同步',
  synced: '已同步',
  offline: '本地模式',
  error: '同步失败',
}

function StatusIcon({ phase, size = 16 }: { phase: SyncPhase; size?: number }) {
  if (phase === 'loading' || phase === 'syncing') return <LoaderCircle size={size} className="animate-spin" />
  if (phase === 'synced') return <Cloud size={size} />
  if (phase === 'offline') return <CloudOff size={size} />
  return <AlertTriangle size={size} />
}

export function SyncStatusDialog() {
  const [open, setOpen] = useState(false)
  const { syncStatus, syncPhase, syncError, redetectSyncDirectory } = useWorkspace()
  const syncedAt = syncStatus.lastSyncedAt
    ? new Date(syncStatus.lastSyncedAt).toLocaleString('zh-CN', { hour12: false })
    : '尚未完成首次同步'

  return <>
    <button
      type="button"
      onClick={() => setOpen(true)}
      title={`OneDrive：${phaseLabels[syncPhase]}`}
      className={`focus-ring inline-flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm transition-colors ${
        syncPhase === 'error' ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
          : syncPhase === 'offline' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <StatusIcon phase={syncPhase} />
      <span className="hidden xl:inline">{phaseLabels[syncPhase]}</span>
    </button>

    <Modal
      open={open}
      onOpenChange={setOpen}
      title="OneDrive 同步"
      description="任务、项目和笔记会通过本机 OneDrive 客户端在设备之间同步。"
      footer={<Button onClick={() => void redetectSyncDirectory()} disabled={syncPhase === 'syncing' || syncPhase === 'loading'}>
        <RefreshCw size={16} className={syncPhase === 'syncing' ? 'animate-spin' : ''} />重新检测 OneDrive
      </Button>}
    >
      <div className="space-y-4">
        <div className={`flex items-start gap-3 rounded-xl border p-4 ${
          syncPhase === 'error' ? 'border-rose-200 bg-rose-50'
            : syncPhase === 'offline' ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50'
        }`}>
          {syncPhase === 'synced'
            ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            : <StatusIcon phase={syncPhase} size={20} />}
          <div>
            <p className="font-medium text-slate-900">{phaseLabels[syncPhase]}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{syncError || syncStatus.message}</p>
          </div>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">同步目录</dt>
            <dd className="mt-1 break-all rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs leading-5 text-slate-700">{syncStatus.path}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">最后写入</dt>
            <dd className="text-right text-slate-700">{syncedAt}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">同步方式</dt>
            <dd className="text-right text-slate-700">{syncStatus.mode === 'onedrive' ? 'OneDrive 设备快照' : syncStatus.mode === 'browser' ? '浏览器本地存储' : '本地安全备份'}</dd>
          </div>
        </dl>

        <p className="text-xs leading-5 text-slate-500">两台电脑可以同时使用。每台设备写入独立文件，Flowdeck 会按每条内容的更新时间合并，并同步删除记录。</p>
      </div>
    </Modal>
  </>
}
