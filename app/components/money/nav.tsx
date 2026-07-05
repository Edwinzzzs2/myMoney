/**
 * 导航组件：桌面侧边导航 + 手机底部导航
 */
import { Button } from '@/components/ui/button'
import { formatMoney, tabs } from '@/app/components/money/money-utils'
import type { TabKey } from '@/app/components/money/types'
import { ChevronRight, RefreshCcw, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MoneyTopBarProps {
  activeTab: TabKey
  username?: string
  loading: boolean
  batchSelecting: boolean
  onReload: () => void
  onToggleBatchSelecting: () => void
}

export function MoneyTopBar({
  activeTab,
  username,
  loading,
  batchSelecting,
  onReload,
  onToggleBatchSelecting,
}: MoneyTopBarProps) {
  if (activeTab !== 'record' && activeTab !== 'stats' && activeTab !== 'history' && activeTab !== 'settings') return null

  const isHistory = activeTab === 'history'
  const isRecord = activeTab === 'record'
  const title = isRecord ? '记账' : activeTab === 'stats' ? '统计' : isHistory ? '历史' : '设置'

  return (
    <header className="z-30 shrink-0 border-b border-slate-200/70 bg-[#fffdf8] px-4 dark:border-white/10 dark:bg-[#070a12] sm:px-6 lg:px-8">
      <div className={cn('mx-auto flex h-14 items-center justify-between gap-3', isRecord ? 'max-w-[390px] lg:max-w-3xl' : 'max-w-[430px] lg:max-w-5xl')}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold leading-6 tracking-normal text-slate-950 dark:text-white">
            {title}
          </h2>
          {isRecord && username ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">欢迎，{username}</p> : null}
        </div>

        {isRecord || isHistory ? (
          <div className="flex shrink-0 items-center gap-2">
            {isHistory ? (
              <Button
                type="button"
                variant={batchSelecting ? 'default' : 'outline'}
                className={cn(
                  'h-8 rounded-md px-2.5 text-sm font-semibold',
                  batchSelecting
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-100'
                )}
                onClick={onToggleBatchSelecting}
              >
                {batchSelecting ? '退出选择' : '批量选择'}
              </Button>
            ) : null}

            <Button
              type="button"
              variant={isHistory ? 'ghost' : 'outline'}
              size="icon"
              className={cn(
                'h-9 w-9 shrink-0 text-slate-700 dark:text-white',
                isHistory ? 'rounded-md' : 'rounded-lg border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.08]'
              )}
              onClick={onReload}
              aria-label="同步"
              title="同步"
            >
              <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  )
}

interface DesktopNavProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
  totals: { month: number; pendingReimbursement: number; reimbursed: number }
}

export function DesktopNav({ activeTab, setActiveTab, totals }: DesktopNavProps) {
  return (
    <aside className="hidden h-dvh border-r border-slate-200/80 bg-white/90 px-5 py-7 dark:border-white/10 dark:bg-white/[0.035] lg:block">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-white dark:bg-emerald-400 dark:text-slate-950">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-normal text-emerald-700 dark:text-white">记账</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">轻量报销记录</p>
        </div>
      </div>
      <div className="mt-8 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              type="button"
              variant="ghost"
              key={tab.key}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
                activeTab === tab.key && 'bg-emerald-50 text-emerald-800 shadow-card dark:bg-white/[0.12] dark:text-white'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
            </Button>
          )
        })}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-black/20 dark:shadow-none">
        <p className="text-xs text-slate-500 dark:text-slate-400">本月支出</p>
        <p className="mt-2 text-2xl font-semibold tracking-normal text-black dark:text-white">{formatMoney(totals.month)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-300/10 dark:text-amber-100">
            <p className="opacity-70">待报销(累计)</p>
            <p className="mt-1 font-bold">{formatMoney(totals.pendingReimbursement)}</p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
            <p className="opacity-70">已报销</p>
            <p className="mt-1 font-bold">{formatMoney(totals.reimbursed)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

interface BottomNavProps {
  activeTab: TabKey
  setActiveTab: (tab: TabKey) => void
}

export function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 lg:hidden">
      <div className="mx-auto grid h-[4.35rem] max-w-[24rem] grid-cols-4 gap-1 rounded-[2rem] border border-white/80 bg-white/[0.94] p-1.5 shadow-[0_16px_45px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#090d18]/90 dark:shadow-[0_18px_45px_rgba(0,0,0,0.36)]">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.key
          return (
            <Button
              type="button"
              variant="ghost"
              key={tab.key}
              aria-current={selected ? 'page' : undefined}
              className={cn(
                'group flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-[1.55rem] px-1 text-[0.74rem] font-semibold leading-none text-slate-500 transition-all duration-200 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:bg-white/[0.08] [&_svg]:size-5',
                selected &&
                  'bg-emerald-100 text-emerald-900 shadow-[0_8px_20px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.72)] ring-1 ring-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 active:scale-[0.98] dark:bg-emerald-400/20 dark:text-emerald-100 dark:ring-emerald-300/40 dark:hover:bg-emerald-400/20 dark:hover:text-emerald-100'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon
                className={cn(
                  'transition-transform duration-200 group-active:scale-95',
                  selected ? 'text-emerald-700 dark:text-emerald-200' : 'text-slate-500 dark:text-slate-400'
                )}
              />
              <span className="truncate">{tab.label}</span>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
