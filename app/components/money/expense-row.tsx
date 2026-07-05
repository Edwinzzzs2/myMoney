import { ImageIcon, ReceiptText, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import type { Expense } from './types'
import { formatMoneyCompact, getCategoryIcon, invoiceLabels as defaultInvoiceLabels, reimbursementLabels } from './money-utils'

type ExpenseRowProps = {
  expense: Expense
  compact?: boolean
  showActions?: boolean
  selectable?: boolean
  selected?: boolean
  invoiceLabelMap?: Record<string, string>
  onToggleSelected?: (expense: Expense) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ExpenseRow({
  expense,
  compact = false,
  showActions = false,
  selectable = false,
  selected = false,
  invoiceLabelMap,
  onToggleSelected,
  onEdit,
  onDelete,
}: ExpenseRowProps) {
  const Icon = getCategoryIcon(expense.category_icon)
  const isPending = expense.reimbursement_status === 'pending'
  const reimbursementLabel = reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status
  const invoiceLabel = invoiceLabelMap?.[expense.invoice_status] || defaultInvoiceLabels[expense.invoice_status] || expense.invoice_status
  const receiptUrl = expense.receipt_url || ''
  const screenshotUrl = expense.screenshot_url || ''
  const metaItems = [
    expense.expense_time || '--:--',
    expense.category_name || '未分类',
    expense.trip_name,
  ].filter((item): item is string => Boolean(item))
  const handleRowAction = () => {
    if (selectable) {
      onToggleSelected?.(expense)
      return
    }
    onEdit(expense)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      aria-pressed={selectable ? selected : undefined}
      onClick={handleRowAction}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        handleRowAction()
      }}
      className={cn(
        'cursor-pointer bg-white px-3.5 py-3 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 dark:bg-transparent dark:hover:bg-white/[0.04] dark:focus:ring-emerald-300/30 lg:px-4 lg:py-3.5',
        !compact && 'rounded-lg border border-slate-200/80 dark:border-white/10',
        selectable && !selected && 'hover:bg-emerald-50/35 dark:hover:bg-emerald-400/8',
        selected && 'bg-emerald-50/80 shadow-[inset_4px_0_0_#10b981] hover:bg-emerald-50 dark:bg-emerald-400/10 dark:hover:bg-emerald-400/12'
      )}
    >
      <div className="flex items-start gap-3 lg:gap-3.5">
        <span
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/[0.03] dark:ring-white/10 lg:h-12 lg:w-12"
          style={{ backgroundColor: `${expense.category_color || '#0f9f8f'}16`, color: expense.category_color || '#0f9f8f' }}
        >
          <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-6 text-slate-950 dark:text-white lg:text-[1.05rem]">{expense.title}</p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 lg:text-sm">
                {metaItems.map((item, index) => (
                  <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
                    {index > 0 ? <span className="shrink-0 text-slate-300 dark:text-slate-600">·</span> : null}
                    <span className="truncate">{item}</span>
                  </span>
                ))}
                <span className="mx-0.5 hidden h-3 w-px shrink-0 bg-slate-200 dark:bg-white/10 sm:inline-block" aria-hidden="true" />
                <span className="inline-flex h-5 max-w-[6.5rem] shrink-0 items-center rounded-full bg-slate-50/90 px-1.5 text-[0.68rem] font-medium leading-none text-slate-500 ring-1 ring-slate-200/70 dark:bg-white/[0.06] dark:text-slate-400 dark:ring-white/10 lg:max-w-[7.5rem]">
                  {expense.payment_method}
                </span>
              </div>
            </div>
            <div className="shrink-0 pt-0.5 text-right">
              <p className="text-base font-semibold leading-6 text-red-500 lg:text-[1.05rem]">
                -{formatMoneyCompact(expense.amount, 2)}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {(!compact || showActions) ? (
              <>
                {receiptUrl ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md border-slate-200 bg-white/70 text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="查看发票"
                        title="查看发票"
                      >
                        <ReceiptText className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto p-4 flex items-center justify-center border-slate-200 dark:border-white/10 bg-white dark:bg-[#101625]" onClick={(e) => e.stopPropagation()}>
                      <DialogTitle className="sr-only">发票图片预览</DialogTitle>
                      <img src={receiptUrl} alt="发票图片" className="max-w-full max-h-[75vh] object-contain rounded" />
                    </DialogContent>
                  </Dialog>
                ) : null}
                {screenshotUrl ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-md border-slate-200 bg-white/70 text-slate-500 shadow-none hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:bg-white/[0.08]"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="查看消费截图"
                        title="查看消费截图"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto p-4 flex items-center justify-center border-slate-200 dark:border-white/10 bg-white dark:bg-[#101625]" onClick={(e) => e.stopPropagation()}>
                      <DialogTitle className="sr-only">消费截图预览</DialogTitle>
                      <img src={screenshotUrl} alt="消费截图" className="max-w-full max-h-[75vh] object-contain rounded" />
                    </DialogContent>
                  </Dialog>
                ) : null}
              </>
            ) : null}

            <div className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <Badge
                variant="secondary"
                className={cn(
                  'h-7 border-0 px-2 text-xs font-semibold',
                  expense.invoice_status === 'pending'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-300/10 dark:text-amber-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                )}
              >
                {invoiceLabel}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  'h-7 border-0 px-2 text-xs font-semibold',
                  isPending
                    ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-300/10 dark:text-emerald-200'
                )}
              >
                {reimbursementLabel}
              </Badge>
            </div>

            {(!compact || showActions) ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-200"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(expense)
                }}
                aria-label="删除"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
