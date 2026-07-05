/**
 * 导航组件：桌面侧边导航 + 手机底部导航
 */
import { Button } from '@/components/ui/button'
import { formatMoney, tabs } from '@/app/components/money/money-utils'
import type { TabKey } from '@/app/components/money/types'
import { ChevronRight, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-slate-200/80 bg-white/[0.96] p-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#090d18]/95">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              type="button"
              variant="ghost"
              key={tab.key}
              className={cn(
                'flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md text-[0.72rem] font-medium leading-4 text-slate-500 transition hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.08]',
                activeTab === tab.key && 'bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-white/[0.14] dark:text-emerald-300'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
