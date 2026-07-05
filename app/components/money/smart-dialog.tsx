/**
 * 智能记账/语音记账弹窗
 */
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatVoiceTime } from '@/app/components/money/money-utils'
import type { Category, ExpenseFormState, InvoiceStatus, SmartMode, Trip } from '@/app/components/money/types'
import { CheckCircle2, Loader2, Mic, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SmartDialogProps {
  smartOpen: boolean
  smartMode: SmartMode
  smartText: string
  smartDraft: ExpenseFormState | null
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
  onPatchSmartDraft: (patch: Partial<ExpenseFormState>) => void
  onAddSmartDraft: () => void
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

export function SmartDialog({
  smartOpen,
  smartMode,
  smartText,
  smartDraft,
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
  onAddSmartDraft,
}: SmartDialogProps) {
  if (!smartOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex h-dvh items-end justify-center bg-black/35 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
      <Card className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-lg border-slate-200/80 bg-white p-4 shadow-float custom-scrollbar dark:border-white/10 dark:bg-[#101624] sm:rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">{smartMode === 'voice' ? '语音记账' : '智能记账'}</h2>
            <p className="mt-1 text-xs text-slate-400">
              {smartMode === 'voice' || listening ? voiceStatus : '输入一句话，自动拆成账单字段'}
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
                  rows={3}
                  className="mt-2 min-h-[88px] resize-none border-slate-200 bg-white text-base leading-relaxed text-[#111815] dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="mt-3">
              <Button
                type="button"
                className="h-11 w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-400 dark:text-slate-950 dark:hover:bg-blue-300"
                onClick={onCompleteVoiceAndAnalyze}
                disabled={analyzing || !smartText.trim()}
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                完成并解析
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
                placeholder="例如：今天晚上客户招待吃饭 168 元 已开票"
                rows={4}
                className="min-h-[132px] resize-none rounded-lg border-slate-200 bg-white pb-14 text-base leading-relaxed dark:border-white/10 dark:bg-black/20 sm:text-sm"
              />
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
              disabled={analyzing || !smartText.trim()}
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              解析
            </Button>
          </>
        )}

        {smartDraft ? (
          <div className="mt-4 rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">快速修改</p>
              <span className="text-xs text-slate-400">确认后直接添加</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              <Field label="金额">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={smartDraft.amount}
                  onChange={(event) => onPatchSmartDraft({ amount: event.target.value })}
                  className="h-10 text-base font-semibold"
                />
              </Field>
              <Field label="标题">
                <Input value={smartDraft.title} onChange={(event) => onPatchSmartDraft({ title: event.target.value })} className="h-10" />
              </Field>
              <Field label="分类">
                <select value={smartDraft.category_id} onChange={(event) => onPatchSmartDraft({ category_id: event.target.value })} className="field-input h-10">
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="行程">
                <select value={smartDraft.trip_id} onChange={(event) => onPatchSmartDraft({ trip_id: event.target.value })} className="field-input h-10">
                  {trips.length ? (
                    trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>{trip.name}</option>
                    ))
                  ) : (
                    <option value="">暂无行程</option>
                  )}
                </select>
              </Field>
              <Field label="日期">
                <DatePicker
                  value={smartDraft.expense_date}
                  onChange={(expenseDate) => onPatchSmartDraft({ expense_date: expenseDate })}
                  className="h-10 bg-white text-sm dark:bg-black/20"
                  ariaLabel="选择智能记账日期"
                />
              </Field>
              <Field label="发票">
                <select value={smartDraft.invoice_status} onChange={(event) => onPatchSmartDraft({ invoice_status: event.target.value })} className="field-input h-10">
                  {smartDraft.invoice_status && !activeInvoiceStatuses.some((status) => status.value === smartDraft.invoice_status) ? (
                    <option value={smartDraft.invoice_status}>{invoiceLabelMap[smartDraft.invoice_status] || smartDraft.invoice_status}</option>
                  ) : null}
                  {activeInvoiceStatuses.map((status) => (
                    <option key={status.id} value={status.value}>{status.label}</option>
                  ))}
                  {!activeInvoiceStatuses.length ? <option value="">暂无发票状态</option> : null}
                </select>
              </Field>
            </div>
            <Button
              type="button"
              className="mt-3 h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
              onClick={onAddSmartDraft}
              disabled={saving || !smartDraft.amount || !smartDraft.title.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              添加账单
            </Button>
          </div>
        ) : null}
      </Card>
    </div>
  )
}
