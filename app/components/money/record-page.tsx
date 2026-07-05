import type { ReactNode } from 'react'
import { Clock3, Edit3, Receipt, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { EmptyState } from './empty-state'
import { ExpenseRow } from './expense-row'
import type { Expense, Totals } from './types'
import { formatMoney, formatMoneyCompact } from './money-utils'

type RecordPageProps = {
  totals: Totals
  todayExpenses: Expense[]
  manualForm: ReactNode
  analyzing: boolean
  invoiceLabelMap: Record<string, string>
  onManualRecord: () => void
  onOpenTextSmartDialog: () => void
  onGoHistory: () => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expense: Expense) => void
  onQuickStatus: (expense: Expense, status: string) => void
}

export function RecordPage({
  totals,
  todayExpenses,
  manualForm,
  analyzing,
  invoiceLabelMap,
  onManualRecord,
  onOpenTextSmartDialog,
  onGoHistory,
  onEditExpense,
  onDeleteExpense,
  onQuickStatus,
}: RecordPageProps) {
  return (
    <div className="pb-1">
      <div className="px-4 pt-3.5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[390px] space-y-3.5 lg:max-w-3xl">
          <SummaryStrip totals={totals} />

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-10 rounded-md border-slate-200 bg-white/80 font-semibold text-emerald-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-emerald-300" onClick={onManualRecord}>
              <Edit3 className="h-4 w-4" />
              手动记账
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-md border-slate-200 bg-white/80 font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
              onClick={onOpenTextSmartDialog}
              disabled={analyzing}
            >
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              智能记账
            </Button>
          </div>

          <div className="block">{manualForm}</div>

          <TodayList
            totals={totals}
            todayExpenses={todayExpenses}
            onGoHistory={onGoHistory}
            onEditExpense={onEditExpense}
            onDeleteExpense={onDeleteExpense}
            onQuickStatus={onQuickStatus}
            invoiceLabelMap={invoiceLabelMap}
          />
        </div>
      </div>
    </div>
  )
}

function SummaryStrip({ totals }: { totals: Totals }) {
  return (
    <Card className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none">
      <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/10">
        <Metric label="今日支出" value={formatMoneyCompact(totals.today, 2)} tone="text-red-500 dark:text-red-400" />
        <Metric label="本月支出" value={formatMoneyCompact(totals.month, 2)} tone="text-slate-950 dark:text-white" />
        <Metric label="待报销(累计)" value={formatMoneyCompact(totals.pendingReimbursement, 2)} tone="text-orange-500 dark:text-orange-400" />
      </div>
    </Card>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 px-3 py-3.5">
      <p className="truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-1 truncate text-base font-semibold leading-6', tone)}>{value}</p>
    </div>
  )
}

function TodayList({
  totals,
  todayExpenses,
  onGoHistory,
  onEditExpense,
  onDeleteExpense,
  onQuickStatus,
  invoiceLabelMap,
}: {
  totals: Totals
  todayExpenses: Expense[]
  onGoHistory: () => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expense: Expense) => void
  onQuickStatus: (expense: Expense, status: string) => void
  invoiceLabelMap: Record<string, string>
}) {
  const previewExpenses = todayExpenses.slice(0, 2)

  return (
    <Card className="rounded-lg border-slate-200/80 bg-white/80 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">今天</h2>
        <Button type="button" variant="ghost" className="h-auto px-0 py-0 text-xs font-normal text-slate-500 hover:bg-transparent dark:text-slate-400" onClick={onGoHistory}>
          {totals.countToday} 笔 · {formatMoney(totals.today)}
        </Button>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200/80 dark:border-white/10">
        {todayExpenses.length ? (
          previewExpenses.map((expense, index) => (
            <div key={expense.id} className={cn(index > 0 && 'border-t border-slate-200/80 dark:border-white/10')}>
              <ExpenseRow expense={expense} compact invoiceLabelMap={invoiceLabelMap} onEdit={onEditExpense} onDelete={onDeleteExpense} onQuickStatus={onQuickStatus} />
            </div>
          ))
        ) : (
          <EmptyState icon={Receipt} title="今天还没有记录" detail="添加一笔餐饮、交通或住宿支出，后面报销更省心。" />
        )}
      </div>
      <Button type="button" variant="ghost" className="mt-2 h-9 w-full rounded-md text-sm text-slate-500 dark:text-slate-400" onClick={onGoHistory}>
        <Clock3 className="h-4 w-4" />
        更多历史查看
      </Button>
    </Card>
  )
}
