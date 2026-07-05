/**
 * 历史账单页面：搜索、筛选、批量操作、按日期分组列表
 */
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/app/components/money/empty-state'
import { ExpenseRow } from '@/app/components/money/expense-row'
import { formatMoney } from '@/app/components/money/money-utils'
import type { Expense } from '@/app/components/money/types'
import { cn } from '@/lib/utils'
import { ChevronDown, Search } from 'lucide-react'

type HistoryFilter = 'all' | 'invoice' | 'invoiced' | 'reimbursement' | 'reimbursed'
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
  saving: boolean
  invoiceLabelMap: Record<string, string>
  onSearchChange: (value: string) => void
  onFilterChange: (value: HistoryFilter) => void
  onToggleFilteredExpenseSelection: () => void
  onToggleExpenseSelection: (expense: Expense) => void
  onRequestBatchUpdate: (status: BatchReimbursementStatus) => void
  onEditExpense: (expense: Expense) => void
  onDeleteExpense: (expense: Expense) => void
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
  saving,
  invoiceLabelMap,
  onSearchChange,
  onFilterChange,
  onToggleFilteredExpenseSelection,
  onToggleExpenseSelection,
  onRequestBatchUpdate,
  onEditExpense,
  onDeleteExpense,
}: HistoryViewProps) {
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(() => new Set())

  const toggleDateCollapsed = (date: string) => {
    setCollapsedDates((current) => {
      const next = new Set(current)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  return (
    <div className="pb-1">
      {batchSelecting ? (
        <div className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#fffdf8] px-4 py-2 dark:border-white/10 dark:bg-[#0b1013] sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[430px] lg:max-w-5xl">
            <div className="flex w-full min-w-0 items-center gap-2 overflow-x-auto rounded-lg border border-emerald-200/80 bg-white/95 px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.10)] dark:border-emerald-400/20 dark:bg-white/[0.08]">
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
              <div className="min-w-[6.5rem] flex-1 whitespace-nowrap border-l border-slate-200 pl-2 text-right dark:border-white/10">
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
          </div>
        </div>
      ) : null}

      <div className="px-4 pt-3.5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[430px] space-y-3.5 lg:max-w-5xl">
          {!batchSelecting ? (
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_6.85rem] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_7.25rem]">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="搜索标题、分类、金额"
                  className="h-11 rounded-lg border-slate-200/80 bg-white/85 pl-9 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
                />
              </div>

              <Select value={historyFilter} onValueChange={(value) => onFilterChange(value as HistoryFilter)}>
                <SelectTrigger className="h-11 w-full rounded-lg border-slate-200/80 bg-white/85 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.08]" aria-label="历史筛选">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="invoice">待开票</SelectItem>
                  <SelectItem value="invoiced">已开票</SelectItem>
                  <SelectItem value="reimbursement">待报销</SelectItem>
                  <SelectItem value="reimbursed">已报销</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-3">
            {groupedExpenses.length ? (
              groupedExpenses.map(([date, list]) => {
                const collapsed = collapsedDates.has(date)
                const dayTotal = list.reduce((sum, item) => sum + Number(item.amount || 0), 0)

                return (
                  <Card key={date} className="overflow-hidden rounded-xl border-slate-200/80 bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-b border-slate-200/80 px-3.5 py-3 text-left transition hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-300/60 dark:border-white/10 dark:hover:bg-white/[0.04] dark:focus:ring-emerald-300/30"
                      onClick={() => toggleDateCollapsed(date)}
                      aria-expanded={!collapsed}
                    >
                      <span className="min-w-0 flex-1 truncate text-base font-semibold text-slate-950 dark:text-white">
                        {date.replaceAll('-', '/')}
                      </span>
                      <span className="shrink-0 text-base font-semibold text-red-500">
                        -{formatMoney(dayTotal).replace('¥ ', '¥')}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400',
                          !collapsed && 'rotate-180'
                        )}
                        aria-hidden="true"
                      />
                    </button>
                    {!collapsed ? (
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
                          />
                        ))}
                      </div>
                    ) : null}
                  </Card>
                )
              })
            ) : (
              <EmptyState icon={Search} title="没有匹配记录" detail="换一个关键词，或者先添加一笔账单。" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
