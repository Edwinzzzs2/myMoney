/**
 * 批量操作确认弹窗
 */
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/app/components/money/money-utils'
import type { Expense } from '@/app/components/money/types'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type BatchReimbursementStatus = 'pending' | 'reimbursed'

interface BatchConfirmDialogProps {
  batchConfirmStatus: BatchReimbursementStatus | null
  selectedExpenses: Expense[]
  selectedExpenseTotal: number
  saving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function BatchConfirmDialog({
  batchConfirmStatus,
  selectedExpenses,
  selectedExpenseTotal,
  saving,
  onCancel,
  onConfirm,
}: BatchConfirmDialogProps) {
  if (!batchConfirmStatus) return null
  const isReimbursed = batchConfirmStatus === 'reimbursed'
  const statusLabel = isReimbursed ? '已报销' : '待报销'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm dark:bg-black/65 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="确认批量修改"
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="取消批量修改" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm rounded-lg border-slate-200/80 bg-white p-4 shadow-[0_24px_80px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#101624]">
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white', isReimbursed ? 'bg-emerald-600' : 'bg-amber-500')}>
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-normal text-slate-950 dark:text-white">批量改为{statusLabel}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              将选中的 {selectedExpenses.length} 笔账单更新为{statusLabel}。
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-black/20">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">已选合计</span>
            <span className="text-lg font-semibold tracking-normal text-slate-950 dark:text-white">{formatMoney(selectedExpenseTotal)}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-md border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]"
            onClick={onCancel}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            type="button"
            className={cn(
              'h-10 rounded-md text-white disabled:opacity-70',
              isReimbursed
                ? 'bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300'
                : 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-300 dark:text-slate-950 dark:hover:bg-amber-200'
            )}
            onClick={onConfirm}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            确认修改
          </Button>
        </div>
      </Card>
    </div>
  )
}
