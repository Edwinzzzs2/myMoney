/**
 * 历史账单页面：搜索、筛选、批量操作、按日期分组列表
 */
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/app/components/money/empty-state'
import { ExpenseRow } from '@/app/components/money/expense-row'
import { formatMoney } from '@/app/components/money/money-utils'
import type { Expense } from '@/app/components/money/types'
import { RefreshCcw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type HistoryFilter = 'all' | 'invoice' | 'reimbursement' | 'reimbursed'
type BatchReimbursementStatus = 'pending' | 'reimbursed'

interface HistoryViewProps {
  groupedExpenses: [string, Expense[]][]
  filteredExpenses: Expense[]
  search: string
  historyFilter: HistoryFilter
  batchSelecting: boolean
  selectedExpenseIdSet: Set<string>
  selectedExpenses: Expense[]
  selectedExpenseTotal: number
  allFilteredExpensesSelected: boolean
  loading: boolean
  saving: boolean
  invoiceLabelMap: Record<string, string>
  onSearchChange: (value: string) => void
  onFilterChange: (value: HistoryFilter) => void
  onToggleBatchSelecting: () => void
  onToggleFilteredExpenseSelection: () => void
  onToggleExpenseSelection: (expense: Expense) => void
  onRequestBatchUpdate: (status: BatchReimbursementStatus) => void
  onReload: () => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expense: Expense) => void
  onQuickStatus: (expense: Expense, status: string) => void
}

export function HistoryView({
  groupedExpenses,
  filteredExpenses,
  search,
  historyFilter,
  batchSelecting,
  selectedExpenseIdSet,
  selectedExpenses,
  selectedExpenseTotal,
  allFilteredExpensesSelected,
  loading,
  saving,
  invoiceLabelMap,
  onSearchChange,
  onFilterChange,
  onToggleBatchSelecting,
  onToggleFilteredExpenseSelection,
  onToggleExpenseSelection,
  onRequestBatchUpdate,
  onReload,
  onEditExpense,
  onDeleteExpense,
  onQuickStatus,
}: HistoryViewProps) {
  return (
    <div className="mx-auto max-w-[430px] space-y-3.5 lg:max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">历史</h2>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant={batchSelecting ? 'default' : 'outline'}
            className={cn(
              'h-8 rounded-md px-2.5 text-sm font-semibold',
              batchSelecting
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300'
                : 'border-slate-200 bg-white/80 text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100'
            )}
            onClick={onToggleBatchSelecting}
          >
            {batchSelecting ? '完成' : '批量'}
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-700 dark:text-slate-100" onClick={onReload} aria-label="同步">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-[1_1_12rem]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索标题、分类、金额"
            className="h-11 rounded-lg border-slate-200/80 bg-white/80 pl-9 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.045]"
          />
        </div>

        <select
          value={historyFilter}
          onChange={(event) => onFilterChange(event.target.value as HistoryFilter)}
          className="h-11 w-[7.25rem] shrink-0 rounded-lg border border-slate-200/80 bg-white/80 px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:bg-white dark:border-white/10 dark:bg-white/[0.045] dark:text-slate-100 dark:hover:bg-white/[0.08]"
          aria-label="历史筛选"
        >
          <option value="all">全部</option>
          <option value="invoice">待开票</option>
          <option value="reimbursement">待报销</option>
          <option value="reimbursed">已报销</option>
        </select>
      </div>

      {batchSelecting ? (
        <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto rounded-lg border border-emerald-200/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur dark:border-emerald-400/20 dark:bg-white/[0.055]">
          <label className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100 dark:hover:bg-emerald-400/15">
            <input
              type="checkbox"
              checked={allFilteredExpensesSelected}
              onChange={onToggleFilteredExpenseSelection}
              disabled={!filteredExpenses.length}
              className="h-3.5 w-3.5 accent-emerald-600"
              aria-label="全选当前列表"
            />
            全选
          </label>
          <div className="min-w-[10rem] flex-1 whitespace-nowrap border-l border-slate-200 pl-3 text-right sm:text-left dark:border-white/10">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">已选 {selectedExpenses.length} 笔</span>
            <span className="ml-2 text-base font-semibold text-slate-950 dark:text-white">{formatMoney(selectedExpenseTotal)}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              className="h-8 rounded-md bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              onClick={() => onRequestBatchUpdate('reimbursed')}
              disabled={saving || !selectedExpenses.length}
            >
              已报销
            </Button>
            <Button
              type="button"
              className="h-8 rounded-md bg-amber-500 px-3 text-xs text-white hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200"
              onClick={() => onRequestBatchUpdate('pending')}
              disabled={saving || !selectedExpenses.length}
            >
              未报销
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        {groupedExpenses.length ? (
          groupedExpenses.map(([date, list]) => (
            <Card key={date} className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
              <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                <h3 className="font-semibold text-slate-950 dark:text-white">{date.replaceAll('-', '/')}</h3>
                <span className="text-sm font-semibold text-red-500">-{formatMoney(list.reduce((sum, item) => sum + Number(item.amount || 0), 0)).replace('¥ ', '¥')}</span>
              </div>
              <div className="divide-y divide-slate-200/80 dark:divide-white/10">
                {list.map((expense) => (
                  <ExpenseRow
                    key={expense.id}
                    expense={expense}
                    compact
                    showActions
                    selectable={batchSelecting}
                    selected={selectedExpenseIdSet.has(expense.id)}
                    invoiceLabelMap={invoiceLabelMap}
                    onToggleSelected={onToggleExpenseSelection}
                    onEdit={onEditExpense}
                    onDelete={onDeleteExpense}
                    onQuickStatus={onQuickStatus}
                  />
                ))}
              </div>
            </Card>
          ))
        ) : (
          <EmptyState icon={Search} title="没有匹配记录" detail="换一个关键词，或者先添加一笔账单。" />
        )}
      </div>
    </div>
  )
}
