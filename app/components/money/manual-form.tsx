import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Briefcase, CheckSquare, CreditCard, FileText, Loader2, MapPin, Plus, Receipt, Tag, Trash2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import type { Category, ExpenseFormState, Trip } from './types'
import { getCategoryIcon, invoiceLabels, invoiceOptions, makeBlankForm, paymentMethods } from './money-utils'

type ManualFormProps = {
  activeCategories: Category[]
  trips: Trip[]
  form: ExpenseFormState
  saving: boolean
  compact?: boolean
  formId?: string
  onPatchForm: (patch: Partial<ExpenseFormState>) => void
  onSaveExpense: (event?: FormEvent) => void | Promise<void>
  onResetForm: (form: ExpenseFormState) => void
}

export function ManualForm({
  activeCategories,
  trips,
  form,
  saving,
  compact = false,
  formId,
  onPatchForm,
  onSaveExpense,
  onResetForm,
}: ManualFormProps) {
  const selectedCategory = activeCategories.find((category) => category.id === form.category_id)
  const CategoryIcon = getCategoryIcon(selectedCategory?.icon)
  const hasReceiptFile = form.receipt_url.startsWith('data:')

  function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      window.alert('文件太大了，建议上传 10MB 以内的发票图片或 PDF。')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const receiptUrl = typeof reader.result === 'string' ? reader.result : ''
      if (receiptUrl) onPatchForm({ receipt_url: receiptUrl, invoice_status: 'received' })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <Card
      id={formId}
      className={cn(
        'rounded-lg border-slate-200/80 bg-white/80 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none lg:p-4',
        compact && 'bg-white/85 dark:bg-white/[0.035]'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{form.id ? '编辑账单' : '手动记账'}</p>
        {form.id ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            onClick={() => onResetForm(makeBlankForm(activeCategories[0]?.id || '', trips[0]?.id || ''))}
            aria-label="退出编辑"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <form onSubmit={onSaveExpense} className="space-y-2.5">
        <FieldRow label="金额" icon={<Tag className="h-4 w-4" />}>
          <Input
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(event) => onPatchForm({ amount: event.target.value })}
            placeholder="0.00"
            className="h-10 border-slate-200 bg-slate-50 text-right text-lg font-semibold dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
          />
        </FieldRow>

        <FieldRow label="标题" icon={<FileText className="h-4 w-4" />}>
          <Input
            value={form.title}
            onChange={(event) => onPatchForm({ title: event.target.value })}
            placeholder="牛肉面 / 打车 / 酒店"
            className="h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20"
          />
        </FieldRow>

        <FieldRow label="分类" icon={<CategoryIcon className="h-4 w-4" />}>
          <select value={form.category_id} onChange={(event) => onPatchForm({ category_id: event.target.value })} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="行程" icon={<MapPin className="h-4 w-4" />}>
          <select value={form.trip_id} onChange={(event) => onPatchForm({ trip_id: event.target.value })} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
            {trips.length ? (
              trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name}
                </option>
              ))
            ) : (
              <option value="">暂无行程</option>
            )}
          </select>
        </FieldRow>

        <FieldRow label="支付" icon={<CreditCard className="h-4 w-4" />}>
          <select value={form.payment_method} onChange={(event) => onPatchForm({ payment_method: event.target.value })} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
            {paymentMethods.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </FieldRow>

        <FieldRow label="发票" icon={<Receipt className="h-4 w-4" />}>
          <select value={form.invoice_status} onChange={(event) => onPatchForm({ invoice_status: event.target.value })} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
            {invoiceOptions.map((status) => (
              <option key={status} value={status}>
                {invoiceLabels[status]}
              </option>
            ))}
          </select>
        </FieldRow>

        <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-white/10 dark:bg-black/20">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-100">
            <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
            计入报销
          </span>
          <Switch checked={form.reimbursable} onCheckedChange={(checked) => onPatchForm({ reimbursable: checked })} aria-label="计入报销" />
        </div>

        <details className="group rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-slate-500 [&::-webkit-details-marker]:hidden dark:text-slate-400">
            <Briefcase className="h-4 w-4" />
            更多信息
            <span className="ml-auto truncate text-xs">{form.expense_date} · {form.expense_time}</span>
          </summary>
          <div className="grid gap-2 border-t border-slate-200 p-3 dark:border-white/10">
            <Input type="date" value={form.expense_date} onChange={(event) => onPatchForm({ expense_date: event.target.value })} />
            <Input type="time" value={form.expense_time} onChange={(event) => onPatchForm({ expense_time: event.target.value })} />
            <Input value={form.merchant} onChange={(event) => onPatchForm({ merchant: event.target.value })} placeholder="商户（可选）" />
            <div className="rounded-md border border-slate-200 bg-white p-2.5 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-100">发票/票据</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                    {form.receipt_url ? (hasReceiptFile ? '已上传文件，导出 ZIP 会带上' : '已填写票据链接') : '支持图片或 PDF，单个 10MB 内'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {form.receipt_url ? (
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onPatchForm({ receipt_url: '' })} aria-label="清除发票文件">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-white/10">
                    <Upload className="h-3.5 w-3.5" />
                    上传
                    <input type="file" accept="image/*,.pdf" className="sr-only" onChange={handleReceiptFile} />
                  </label>
                </div>
              </div>
              <Input
                value={hasReceiptFile ? '' : form.receipt_url}
                onChange={(event) => onPatchForm({ receipt_url: event.target.value })}
                placeholder="或粘贴发票图片/文件链接"
                className="mt-2 h-9 border-slate-200 bg-slate-50 text-xs dark:border-white/10 dark:bg-black/20"
              />
            </div>
            <Textarea value={form.note} onChange={(event) => onPatchForm({ note: event.target.value })} placeholder="备注" rows={2} className="min-h-[64px] resize-none" />
          </div>
        </details>

        <Button
          disabled={saving || !form.amount || !form.title.trim()}
          className="h-11 w-full rounded-md bg-emerald-600 text-base font-semibold text-white shadow-[0_12px_24px_rgba(16,185,129,0.22)] hover:bg-emerald-700 disabled:opacity-75 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {form.id ? '保存修改' : '添加账单'}
        </Button>
      </form>
    </Card>
  )
}

function FieldRow({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="grid min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2">
      <span className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  )
}
