import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { Briefcase, CheckSquare, ChevronDown, CreditCard, Eye, FileText, Loader2, MapPin, Plus, Receipt, Tag, Trash2, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
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
  onPatchForm: (patch: Partial<ExpenseFormState>) => void
  onSaveExpense: (event?: FormEvent) => void | Promise<void>
  onResetForm: (form: ExpenseFormState) => void
}

export function ManualForm({
  activeCategories,
  trips,
  paymentMethods,
  invoiceStatuses,
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
  const hasScreenshotFile = form.screenshot_url.startsWith('data:')
  const hasCurrentPaymentMethod = paymentMethods.some((method) => method.name === form.payment_method)
  const hasCurrentInvoiceStatus = invoiceStatuses.some((status) => status.value === form.invoice_status)
  const receivedInvoiceStatus = invoiceStatuses.find((status) => status.value === 'received')?.value || form.invoice_status

  function handleReceiptFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      window.alert('文件太大了，建议上传 10MB 以内的图片。')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const receiptUrl = typeof reader.result === 'string' ? reader.result : ''
      if (receiptUrl) onPatchForm({ receipt_url: receiptUrl, invoice_status: receivedInvoiceStatus })
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function handleScreenshotFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      window.alert('文件太大了，建议上传 10MB 以内的图片。')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const screenshotUrl = typeof reader.result === 'string' ? reader.result : ''
      if (screenshotUrl) onPatchForm({ screenshot_url: screenshotUrl })
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
            {!hasCurrentPaymentMethod && form.payment_method ? (
              <option value={form.payment_method}>{form.payment_method}</option>
            ) : null}
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.name}>
                {method.name}
              </option>
            ))}
            {!paymentMethods.length ? <option value="">暂无支付方式</option> : null}
          </select>
        </FieldRow>

        <FieldRow label="发票" icon={<Receipt className="h-4 w-4" />}>
          <select value={form.invoice_status} onChange={(event) => onPatchForm({ invoice_status: event.target.value })} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
            {!hasCurrentInvoiceStatus && form.invoice_status ? (
              <option value={form.invoice_status}>{form.invoice_status}</option>
            ) : null}
            {invoiceStatuses.map((status) => (
              <option key={status.id} value={status.value}>
                {status.label}
              </option>
            ))}
            {!invoiceStatuses.length ? <option value="">暂无发票状态</option> : null}
          </select>
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
              <Input
                type="datetime-local"
                value={`${form.expense_date}T${form.expense_time ? form.expense_time.slice(0, 5) : '00:00'}`}
                onChange={(event) => {
                  const val = event.target.value
                  if (val) {
                    const [date, time] = val.split('T')
                    onPatchForm({ expense_date: date, expense_time: time })
                  }
                }}
                className="h-9 text-xs"
              />
            </FieldRow>

            {/* 商户名称 */}
            <FieldRow label="商户">
              <Input value={form.merchant} onChange={(event) => onPatchForm({ merchant: event.target.value })} placeholder="滴滴出行 / 全家便利店" className="h-9 text-xs" />
            </FieldRow>

            {/* 上传图片卡片组 */}
            <FieldRow label="图片" className="items-start pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 发票图片上传 */}
                <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">发票</p>
                    <p className="mt-1 text-[0.62rem] text-slate-400 dark:text-slate-500 leading-normal truncate">
                      {form.receipt_url ? '已准备就绪' : '限图片格式，最大 10MB'}
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
                <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">消费截图</p>
                    <p className="mt-1 text-[0.62rem] text-slate-400 dark:text-slate-500 leading-normal truncate">
                      {form.screenshot_url ? '已准备就绪' : '限图片格式，最大 10MB'}
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
