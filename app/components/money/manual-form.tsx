import { useCallback, useEffect, useRef } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Briefcase, ChevronDown, CreditCard, Eye, FileText, Loader2, MapPin, Plus, Receipt, Tag, Trash2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { Category, ExpenseFormState, InvoiceStatus, PaymentMethod, Trip } from './types'
import { getCategoryIcon, makeBlankForm } from './money-utils'

type ManualFormProps = {
  activeCategories: Category[]
  trips: Trip[]
  paymentMethods: PaymentMethod[]
  invoiceStatuses: InvoiceStatus[]
  form: ExpenseFormState
  saving: boolean
  compact?: boolean
  formId?: string
  showHeader?: boolean
  className?: string
  onPatchForm: (patch: Partial<ExpenseFormState>) => void
  onSaveExpense: (event?: FormEvent) => void | Promise<void>
  onResetForm: (form: ExpenseFormState) => void
}

const selectTriggerClass = 'h-10 border-slate-200 bg-slate-50 text-base dark:border-white/10 dark:bg-black/20'
const examplePlaceholderClass = 'placeholder:text-base placeholder:font-normal placeholder:text-slate-500 dark:placeholder:text-slate-500'

export function ManualForm({
  activeCategories,
  trips,
  paymentMethods,
  invoiceStatuses,
  form,
  saving,
  compact = false,
  formId,
  showHeader = true,
  className,
  onPatchForm,
  onSaveExpense,
  onResetForm,
}: ManualFormProps) {
  const selectedCategory = activeCategories.find((category) => category.id === form.category_id)
  const CategoryIcon = getCategoryIcon(selectedCategory?.icon)
  const hasCurrentPaymentMethod = paymentMethods.some((method) => method.name === form.payment_method)
  const hasCurrentInvoiceStatus = invoiceStatuses.some((status) => status.value === form.invoice_status)
  const receivedInvoiceStatus = invoiceStatuses.find((status) => status.value === 'received')?.value || form.invoice_status

  // 'receipt' | 'screenshot' — tracks which card the user last hovered
  const pasteTargetRef = useRef<'receipt' | 'screenshot'>('receipt')
  // Keep latest form & handler refs so the global paste listener is stable
  const onPatchFormRef = useRef(onPatchForm)
  onPatchFormRef.current = onPatchForm
  const receivedInvoiceStatusRef = useRef(receivedInvoiceStatus)
  receivedInvoiceStatusRef.current = receivedInvoiceStatus

  function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.size > 10 * 1024 * 1024) {
        window.alert('文件太大了，建议上传 10MB 以内的图片。')
        reject(new Error('file too large'))
        return
      }
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  // Global paste listener — intercepts image paste regardless of which element has focus.
  // Images cannot be pasted into INPUT/TEXTAREA anyway, so we always handle them here.
  const handleGlobalPaste = useCallback(async (event: globalThis.ClipboardEvent) => {
    const items = Array.from(event.clipboardData?.items ?? [])
    // Check both items and files (Word / some browsers put images in files)
    const fileFromItems = items.find((item) => item.type.startsWith('image/'))?.getAsFile()
    const fileFromFiles = event.clipboardData?.files?.[0]
    const file = fileFromItems ?? (fileFromFiles?.type.startsWith('image/') ? fileFromFiles : null)
    if (!file) return

    event.preventDefault()
    try {
      const url = await readFileAsDataURL(file)
      if (!url) return
      if (pasteTargetRef.current === 'screenshot') {
        onPatchFormRef.current({ screenshot_url: url })
      } else {
        onPatchFormRef.current({ receipt_url: url, invoice_status: receivedInvoiceStatusRef.current })
      }
    } catch { /* user already alerted */ }
  }, [])

  useEffect(() => {
    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [handleGlobalPaste])

  async function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = await readFileAsDataURL(file)
      if (url) onPatchForm({ receipt_url: url, invoice_status: receivedInvoiceStatus })
    } catch { /* user already alerted */ }
    event.target.value = ''
  }

  async function handleScreenshotFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const url = await readFileAsDataURL(file)
      if (url) onPatchForm({ screenshot_url: url })
    } catch { /* user already alerted */ }
    event.target.value = ''
  }

  return (
    <Card
      id={formId}
      className={cn(
        'scroll-mt-28 rounded-lg border-slate-200/80 bg-white/80 p-3.5 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none lg:p-4',
        compact && 'bg-white/85 dark:bg-white/[0.035]',
        className
      )}
    >
      {showHeader ? (
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
      ) : null}

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
            placeholder="例如：0.00"
            className={cn('h-10 border-slate-200 bg-slate-50 text-right text-lg font-semibold dark:border-white/10 dark:bg-black/20 dark:text-slate-100', examplePlaceholderClass)}
          />
        </FieldRow>

        <FieldRow label="标题" icon={<FileText className="h-4 w-4" />}>
          <Input
            value={form.title}
            onChange={(event) => onPatchForm({ title: event.target.value })}
            placeholder="例如：牛肉面 / 打车 / 酒店"
            className={cn('h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20', examplePlaceholderClass)}
          />
        </FieldRow>

        <FieldRow label="分类" icon={<CategoryIcon className="h-4 w-4" />}>
          <Select value={form.category_id || undefined} onValueChange={(categoryId) => onPatchForm({ category_id: categoryId })} disabled={!activeCategories.length}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="暂无分类" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="行程" icon={<MapPin className="h-4 w-4" />}>
          <Select value={form.trip_id || undefined} onValueChange={(tripId) => onPatchForm({ trip_id: tripId })} disabled={!trips.length}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="暂无行程" />
            </SelectTrigger>
            <SelectContent>
              {trips.map((trip) => (
                <SelectItem key={trip.id} value={trip.id}>
                  {trip.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="支付" icon={<CreditCard className="h-4 w-4" />}>
          <Select value={form.payment_method || undefined} onValueChange={(paymentMethod) => onPatchForm({ payment_method: paymentMethod })} disabled={!form.payment_method && !paymentMethods.length}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="暂无支付方式" />
            </SelectTrigger>
            <SelectContent>
              {!hasCurrentPaymentMethod && form.payment_method ? (
                <SelectItem value={form.payment_method}>{form.payment_method}</SelectItem>
              ) : null}
              {paymentMethods.map((method) => (
                <SelectItem key={method.id} value={method.name}>
                  {method.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="发票" icon={<Receipt className="h-4 w-4" />}>
          <Select value={form.invoice_status || undefined} onValueChange={(invoiceStatus) => onPatchForm({ invoice_status: invoiceStatus })} disabled={!form.invoice_status && !invoiceStatuses.length}>
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue placeholder="暂无发票状态" />
            </SelectTrigger>
            <SelectContent>
              {!hasCurrentInvoiceStatus && form.invoice_status ? (
                <SelectItem value={form.invoice_status}>{form.invoice_status}</SelectItem>
              ) : null}
              {invoiceStatuses.map((status) => (
                <SelectItem key={status.id} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldRow>

        <details className="group rounded-md border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20 overflow-hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-slate-500 [&::-webkit-details-marker]:hidden hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors dark:text-slate-400">
            <Briefcase className="h-4 w-4" />
            更多信息
            <div className="ml-auto flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span className="truncate text-xs">{form.expense_date} · {form.expense_time}</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <div className="grid gap-3.5 border-t border-slate-200 p-3.5 dark:border-white/10">
            
            {/* 支出日期与时间合并 */}
            <FieldRow label="时间">
              <DateTimePicker
                date={form.expense_date}
                time={form.expense_time}
                onDateChange={(expenseDate) => onPatchForm({ expense_date: expenseDate })}
                onTimeChange={(expenseTime) => onPatchForm({ expense_time: expenseTime })}
                className="min-w-0"
              />
            </FieldRow>

            {/* 商户名称 */}
            <FieldRow label="商户">
              <Input value={form.merchant} onChange={(event) => onPatchForm({ merchant: event.target.value })} placeholder="例如：滴滴出行 / 便利店" className={cn('h-9 text-xs', examplePlaceholderClass)} />
            </FieldRow>

            {/* 上传图片卡片组 */}
            <FieldRow label="图片" className="items-start pt-1">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-2.5">
                {/* 发票图片上传 */}
                <div
                  onMouseEnter={() => { pasteTargetRef.current = 'receipt' }}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">发票</p>
                    <p className="mt-1 text-[0.62rem] text-slate-400 dark:text-slate-500 leading-normal truncate">
                      {form.receipt_url ? '已准备就绪' : '限图片格式，最大 10MB，支持粘贴'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1">
                    {form.receipt_url ? (
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 text-slate-500 hover:text-slate-600 p-0" aria-label="查看发票图片">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto p-4 flex items-center justify-center border-slate-200 dark:border-white/10 bg-white dark:bg-[#101625]">
                            <DialogTitle className="sr-only">发票图片预览</DialogTitle>
                            <img src={form.receipt_url} alt="发票图片" className="max-w-full max-h-[75vh] object-contain rounded" />
                          </DialogContent>
                        </Dialog>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-0" onClick={() => onPatchForm({ receipt_url: '' })} aria-label="清除发票图片">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : <div className="w-14" />}
                    <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 text-[0.68rem] font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/25 dark:text-slate-200 dark:hover:bg-white/[0.05]">
                      <Upload className="h-3 w-3" />
                      选择
                      <input type="file" accept="image/*" className="sr-only" onChange={handleReceiptFile} />
                    </label>
                  </div>
                </div>

                {/* 消费截图上传 */}
                <div
                  onMouseEnter={() => { pasteTargetRef.current = 'screenshot' }}
                  className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">消费截图</p>
                    <p className="mt-1 text-[0.62rem] text-slate-400 dark:text-slate-500 leading-normal truncate">
                      {form.screenshot_url ? '已准备就绪' : '限图片格式，最大 10MB，支持粘贴'}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-1">
                    {form.screenshot_url ? (
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 text-slate-500 hover:text-slate-600 p-0" aria-label="查看消费截图">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto p-4 flex items-center justify-center border-slate-200 dark:border-white/10 bg-white dark:bg-[#101625]">
                            <DialogTitle className="sr-only">消费截图预览</DialogTitle>
                            <img src={form.screenshot_url} alt="消费截图" className="max-w-full max-h-[75vh] object-contain rounded" />
                          </DialogContent>
                        </Dialog>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 p-0" onClick={() => onPatchForm({ screenshot_url: '' })} aria-label="清除消费截图">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : <div className="w-14" />}
                    <label className="inline-flex h-7 cursor-pointer items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2.5 text-[0.68rem] font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-black/25 dark:text-slate-200 dark:hover:bg-white/[0.05]">
                      <Upload className="h-3 w-3" />
                      选择
                      <input type="file" accept="image/*" className="sr-only" onChange={handleScreenshotFile} />
                    </label>
                  </div>
                </div>
              </div>
            </FieldRow>

            {/* 备注 */}
            <FieldRow label="备注" className="items-start pt-1">
              <Textarea value={form.note} onChange={(event) => onPatchForm({ note: event.target.value })} placeholder="可在此添加支出说明..." rows={2} className="min-h-[58px] resize-none text-xs" />
            </FieldRow>

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

function FieldRow({ label, icon, children, className }: { label: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] sm:grid-cols-[4.75rem_minmax(0,1fr)] items-center gap-2 sm:gap-3", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        {icon ? <span className="text-slate-400 dark:text-slate-500">{icon}</span> : null}
        {label}
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  )
}
