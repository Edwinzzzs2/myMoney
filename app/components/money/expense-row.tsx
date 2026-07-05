import { Pencil, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { Expense } from './types'
import { formatMoneyCompact, getCategoryIcon, invoiceLabels as defaultInvoiceLabels, reimbursementLabels } from './money-utils'

type ExpenseRowProps = {
  expense: Expense
  compact?: boolean
  showActions?: boolean
  invoiceLabelMap?: Record<string, string>
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
  onQuickStatus: (expense: Expense, status: string) => void
}

export function ExpenseRow({ expense, compact = false, showActions = false, invoiceLabelMap, onEdit, onDelete, onQuickStatus }: ExpenseRowProps) {
  const Icon = getCategoryIcon(expense.category_icon)
  const isPending = expense.reimbursement_status === 'pending'
  const reimbursementLabel = reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status
  const invoiceLabel = invoiceLabelMap?.[expense.invoice_status] || defaultInvoiceLabels[expense.invoice_status] || expense.invoice_status
  const nextReimbursementStatus = isPending ? 'reimbursed' : 'pending'

  return (
    <article
      className={cn(
        'bg-white p-3 transition hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/[0.04] lg:p-4',
        !compact && 'rounded-lg border border-slate-200/80 dark:border-white/10'
      )}
    >
      <div className="flex items-center gap-3 lg:gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg lg:h-12 lg:w-12"
          style={{ backgroundColor: `${expense.category_color || '#0f9f8f'}22`, color: expense.category_color || '#0f9f8f' }}
        >
          <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[0.98rem] font-semibold leading-6 text-black dark:text-white lg:text-lg">{expense.title}</p>
              <p className="mt-0.5 truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 lg:mt-1 lg:text-sm">
                {expense.expense_time || '--:--'} · {expense.category_name || '未分类'}
                {expense.trip_name ? ` · ${expense.trip_name}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[0.98rem] font-semibold leading-6 text-red-500 lg:text-lg">
                -{formatMoneyCompact(expense.amount, 2)}
              </p>
              <div className="mt-1.5 flex items-center justify-end gap-2 lg:mt-2">
                <Badge
                  variant="secondary"
                  className={cn(
                    'border-0 px-2 py-1 text-[0.68rem] font-semibold',
                    expense.invoice_status === 'received'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200'
                  )}
                >
                  {invoiceLabel}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 rounded-md px-2 text-xs font-semibold',
                    isPending
                      ? 'bg-amber-50 text-amber-700 hover:bg-emerald-50 hover:text-emerald-800 dark:bg-amber-300/10 dark:text-amber-200 dark:hover:bg-emerald-300/10 dark:hover:text-emerald-200'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-amber-50 hover:text-amber-800 dark:bg-emerald-300/10 dark:text-emerald-200 dark:hover:bg-amber-300/10 dark:hover:text-amber-200'
                  )}
                  onClick={() => onQuickStatus(expense, nextReimbursementStatus)}
                  aria-label={isPending ? `将${expense.title}标记为已报销` : `将${expense.title}改为待报销`}
                  title={isPending ? '标记为已报销' : '改为待报销'}
                >
                  {reimbursementLabel}
                </Button>
              </div>
            </div>
          </div>
          {(!compact || showActions) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border-0 bg-slate-100 font-normal text-slate-600 dark:bg-white/10 dark:text-slate-300">
                {expense.payment_method}
              </Badge>
              <Button type="button" variant="ghost" size="icon" className="ml-auto text-slate-400" onClick={() => onEdit(expense)} aria-label="编辑">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-200"
                onClick={() => onDelete(expense)}
                aria-label="删除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
