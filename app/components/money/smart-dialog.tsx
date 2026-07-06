/**
 * 智能记账/语音记账弹窗
 */
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney, formatVoiceTime } from '@/app/components/money/money-utils'
import type { Category, ExpenseFormState, InvoiceStatus, SmartAiUsage, SmartMode, Trip } from '@/app/components/money/types'
import { CheckCircle2, Loader2, Mic, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartDialogProps {
  smartOpen: boolean
  smartMode: SmartMode
  smartText: string
  smartDrafts: ExpenseFormState[]
  smartUsage: SmartAiUsage | null
  listening: boolean
  analyzing: boolean
  saving: boolean
  recordingSeconds: number
  voiceStatus: string
  activeCategories: Category[]
  trips: Trip[]
  activeInvoiceStatuses: InvoiceStatus[]
  invoiceLabelMap: Record<string, string>
  onClose: () => void
  onSmartTextChange: (text: string) => void
  onDiscardVoiceSession: () => void
  onStartInlineSpeech: () => void
  onStopInlineSpeech: () => void
  onStartSpeech: () => void
  onCompleteVoiceAndAnalyze: () => void
  onAnalyzeSmartText: () => void
  onPatchSmartDraft: (index: number, patch: Partial<ExpenseFormState>) => void
  onAddSmartDrafts: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const selectTriggerClass = 'h-10 bg-white text-sm dark:bg-black/20'

export function SmartDialog({
  smartOpen,
  smartMode,
  smartText,
  smartDrafts,
  smartUsage,
  listening,
  analyzing,
  saving,
  recordingSeconds,
  voiceStatus,
  activeCategories,
  trips,
  activeInvoiceStatuses,
  invoiceLabelMap,
  onClose,
  onSmartTextChange,
  onDiscardVoiceSession,
  onStartInlineSpeech,
  onStopInlineSpeech,
  onStartSpeech,
  onCompleteVoiceAndAnalyze,
  onAnalyzeSmartText,
  onPatchSmartDraft,
  onAddSmartDrafts,
}: SmartDialogProps) {
  if (!smartOpen) return null

  const usageLabel = smartUsage ? `剩余 ${smartUsage.daily_remaining} 次` : '查询中'
  const quotaDepleted = smartUsage?.daily_remaining === 0
  const inputLength = smartText.length
  const inputTooLong = inputLength > 200
  const totalAmount = smartDrafts.reduce((sum, draft) => sum + Number(draft.amount || 0), 0)
  const hasInvalidDraft = smartDrafts.some((draft) => (
    Number(draft.amount) <= 0 ||
    !draft.title.trim() ||
    !draft.category_id ||
    !draft.expense_date
  ))

  return (
    <div className="fixed inset-0 z-50 flex h-dvh items-end justify-center bg-black/35 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
      <Card className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-lg border-slate-200/80 bg-white p-4 shadow-float custom-scrollbar dark:border-white/10 dark:bg-[#121a22] sm:rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">{smartMode === 'voice' ? '语音记账' : '智能记账'}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {smartMode === 'voice' || listening ? voiceStatus : '一次输入多笔账单，换行或连续描述都可以'}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400" onClick={onClose} aria-label="关闭">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {smartMode === 'voice' ? (
          <div className="mt-6">
            <div className="flex min-h-[270px] flex-col items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 px-4 py-6 dark:border-white/10 dark:bg-black/20">
              <div className="relative flex h-32 w-32 items-center justify-center">
                {listening ? (
                  <>
                    <span className="absolute h-32 w-32 rounded-full bg-emerald-400/20 animate-ping" />
                    <span className="absolute h-24 w-24 rounded-full bg-emerald-400/20 animate-pulse" />
                  </>
                ) : (
                  <span className="absolute h-28 w-28 rounded-full bg-slate-500/10" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    'relative h-20 w-20 rounded-full shadow-[0_0_34px_rgba(45,212,191,0.32)] transition hover:bg-slate-200 dark:hover:bg-slate-700',
                    listening ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                  )}
                  onClick={listening ? onCompleteVoiceAndAnalyze : onStartSpeech}
                  disabled={analyzing}
                  aria-label={listening ? '完成识别' : '开始识别'}
                >
                  {analyzing ? <Loader2 className="h-9 w-9 animate-spin" /> : <Mic className="h-10 w-10" />}
                </Button>
              </div>
              <div className="mt-6 text-center">
                <p className="text-2xl font-semibold tracking-normal">
                  {listening ? '正在识别' : analyzing ? '正在解析' : '语音待命'} {formatVoiceTime(recordingSeconds)}
                </p>
                <p className="mt-2 text-sm text-slate-400">说出金额、标题、分类或发票状态</p>
              </div>
              <div className="mt-5 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-3 text-left dark:border-white/10 dark:bg-white/[0.05]">
                <p className="text-xs font-semibold text-slate-500">识别结果</p>
                <Textarea
                  value={smartText}
                  onChange={(event) => {
                    onSmartTextChange(event.target.value)
                  }}
                  onFocus={onDiscardVoiceSession}
                  placeholder="识别到的文字会显示在这里；识别失败时可以直接手动输入或修改。"
                  maxLength={200}
                  rows={3}
                  className="mt-2 min-h-[88px] resize-none border-slate-200 bg-white text-base leading-relaxed text-[#111815] dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                />
                <p className={cn('mt-1.5 text-right text-xs', inputTooLong ? 'text-rose-500' : 'text-slate-400')}>
                  {inputLength}/200
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-300"
                onClick={onCompleteVoiceAndAnalyze}
                disabled={analyzing || !smartText.trim() || inputTooLong || quotaDepleted}
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                <span>{quotaDepleted ? '今日次数已用完' : '完成并解析'}</span>
                <span className="rounded-full bg-white/[0.18] px-2 py-0.5 text-[11px] font-semibold text-white/90 dark:bg-slate-950/[0.15] dark:text-slate-950/75">
                  {usageLabel}
                </span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mt-4">
              <Textarea
                value={smartText}
                onChange={(event) => {
                  onSmartTextChange(event.target.value)
                }}
                onFocus={onDiscardVoiceSession}
                placeholder={'例如：\n今天午饭 35 元，打车去机场 56 元，咖啡 18 元\n或每行输入一笔账单'}
                maxLength={200}
                rows={6}
                className="min-h-[132px] resize-none rounded-lg border-slate-200 bg-white pb-14 text-base leading-relaxed dark:border-white/10 dark:bg-black/20 sm:text-sm"
              />
              <span className={cn('absolute bottom-4 left-3 text-xs', inputTooLong ? 'font-medium text-rose-500' : 'text-slate-400')}>
                {inputLength}/200
              </span>
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                {listening ? (
                  <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:bg-slate-900/90 dark:text-emerald-300">
                    {formatVoiceTime(recordingSeconds)}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn(
                    'h-10 w-10 rounded-md border-slate-200 bg-white/95 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-white/10',
                    listening && 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-200'
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={listening ? onStopInlineSpeech : onStartInlineSpeech}
                  disabled={analyzing}
                  aria-label={listening ? '停止语音输入' : '开始语音输入'}
                  title={listening ? '停止语音输入' : '语音输入'}
                >
                  <Mic className={cn('h-5 w-5', listening && 'animate-pulse')} />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              className="mt-3 h-10 w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-300"
              onClick={onAnalyzeSmartText}
              disabled={analyzing || !smartText.trim() || inputTooLong || quotaDepleted}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              <span>{quotaDepleted ? '今日次数已用完' : '解析账单'}</span>
              <span className="rounded-full bg-white/[0.18] px-2 py-0.5 text-[11px] font-semibold text-white/90 dark:bg-slate-950/[0.15] dark:text-slate-950/75">
                {usageLabel}
              </span>
            </Button>
          </>
        )}

        {smartDrafts.length ? (
          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">解析出 {smartDrafts.length} 笔账单</p>
                <p className="mt-0.5 text-xs text-slate-400">可以逐笔检查和修改</p>
              </div>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(totalAmount)}</span>
            </div>
            <div className="space-y-3">
              {smartDrafts.map((smartDraft, index) => (
                <div key={index} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">账单 {index + 1}</p>
                    <span className="text-xs font-medium text-slate-400">{formatMoney(Number(smartDraft.amount || 0))}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <Field label="金额">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={smartDraft.amount}
                        onChange={(event) => onPatchSmartDraft(index, { amount: event.target.value })}
                        className="h-10 text-base font-semibold"
                      />
                    </Field>
                    <Field label="标题">
                      <Input value={smartDraft.title} onChange={(event) => onPatchSmartDraft(index, { title: event.target.value })} className="h-10" />
                    </Field>
                    <Field label="分类">
                      <Select value={smartDraft.category_id || undefined} onValueChange={(categoryId) => onPatchSmartDraft(index, { category_id: categoryId })} disabled={!activeCategories.length}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="暂无分类" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="行程">
                      <Select value={smartDraft.trip_id || undefined} onValueChange={(tripId) => onPatchSmartDraft(index, { trip_id: tripId })} disabled={!trips.length && !smartDraft.trip_id}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="暂无行程" />
                        </SelectTrigger>
                        <SelectContent>
                          {smartDraft.trip_id && !trips.some((trip) => trip.id === smartDraft.trip_id) ? (
                            <SelectItem value={smartDraft.trip_id}>{smartDraft.trip_id}</SelectItem>
                          ) : null}
                          {trips.map((trip) => (
                            <SelectItem key={trip.id} value={trip.id}>{trip.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="日期">
                      <DatePicker
                        value={smartDraft.expense_date}
                        onChange={(expenseDate) => onPatchSmartDraft(index, { expense_date: expenseDate })}
                        className="h-10 bg-white text-sm dark:bg-black/20"
                        ariaLabel={`选择第 ${index + 1} 笔账单日期`}
                      />
                    </Field>
                    <Field label="发票">
                      <Select value={smartDraft.invoice_status || undefined} onValueChange={(invoiceStatus) => onPatchSmartDraft(index, { invoice_status: invoiceStatus })} disabled={!activeInvoiceStatuses.length && !smartDraft.invoice_status}>
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="暂无发票状态" />
                        </SelectTrigger>
                        <SelectContent>
                          {smartDraft.invoice_status && !activeInvoiceStatuses.some((status) => status.value === smartDraft.invoice_status) ? (
                            <SelectItem value={smartDraft.invoice_status}>{invoiceLabelMap[smartDraft.invoice_status] || smartDraft.invoice_status}</SelectItem>
                          ) : null}
                          {activeInvoiceStatuses.map((status) => (
                            <SelectItem key={status.id} value={status.value}>{status.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="mt-3 h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              onClick={onAddSmartDrafts}
              disabled={saving || hasInvalidDraft}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              一键添加全部 {smartDrafts.length} 笔
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
