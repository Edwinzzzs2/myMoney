"use client"

import { useMemo, useState } from 'react'
import { BarChart3, ChevronLeft, ChevronRight, MapPin, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { EmptyState } from './empty-state'
import type { Category, Expense, Trip } from './types'
import { formatMoney, formatMoneyCompact, getCategoryIcon, todayISO } from './money-utils'

type StatsPageProps = {
  expenses: Expense[]
  activeCategories: Category[]
  trips: Trip[]
}

type StatsMode = 'category' | 'trip' | 'trend'

const modes: Array<{ key: StatsMode; label: string }> = [
  { key: 'category', label: '分类' },
  { key: 'trip', label: '行程' },
  { key: 'trend', label: '趋势' },
]

/** 返回 YYYY-MM 格式的月份字符串 */
function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** 将 YYYY-MM 解析为 Date（当月1日） */
function parseMonthKey(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1)
}

/** 格式化月份为中文显示 */
function formatMonthLabel(key: string) {
  const d = parseMonthKey(key)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

export function StatsPage({ expenses, activeCategories, trips }: StatsPageProps) {
  const currentMonthKey = toMonthKey(new Date())
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)
  const [mode, setMode] = useState<StatsMode>('category')

  // 是否已经是当前月（不能往后翻）
  const isCurrentMonth = selectedMonth >= currentMonthKey

  // 获取已有记录的所有月份（用于判断能否往前翻）
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    for (const e of expenses) {
      if (e.expense_date) months.add(e.expense_date.slice(0, 7))
    }
    return months
  }, [expenses])

  // 切换月份
  function prevMonth() {
    const d = parseMonthKey(selectedMonth)
    d.setMonth(d.getMonth() - 1)
    setSelectedMonth(toMonthKey(d))
  }
  function nextMonth() {
    if (isCurrentMonth) return
    const d = parseMonthKey(selectedMonth)
    d.setMonth(d.getMonth() + 1)
    setSelectedMonth(toMonthKey(d))
  }
  // 按所选月份过滤账单
  const monthExpenses = useMemo(
    () => expenses.filter((e) => e.expense_date?.startsWith(selectedMonth)),
    [expenses, selectedMonth]
  )

  // 月度汇总
  const totals = useMemo(() => {
    let month = 0, pendingReimbursement = 0, reimbursed = 0
    for (const e of monthExpenses) {
      const amount = Number(e.amount || 0)
      month += amount
      if (e.reimbursement_status === 'pending') pendingReimbursement += amount
      if (e.reimbursement_status === 'reimbursed') reimbursed += amount
    }
    return { month, pendingReimbursement, reimbursed }
  }, [monthExpenses])

  // 分类统计
  const categoryTotals = useMemo(() =>
    activeCategories
      .map((category) => ({
        category,
        amount: monthExpenses
          .filter((e) => e.category_id === category.id)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    [activeCategories, monthExpenses]
  )

  // 周趋势（当月1-5周）
  const weekly = useMemo(() => {
    const arr = [0, 0, 0, 0, 0]
    for (const e of monthExpenses) {
      const day = Number(e.expense_date.slice(-2))
      const index = Math.min(4, Math.max(0, Math.ceil(day / 7) - 1))
      arr[index] += Number(e.amount || 0)
    }
    return arr
  }, [monthExpenses])

  const maxWeek = Math.max(1, ...weekly)

  // 行程统计
  const tripTotals = useMemo(() =>
    trips
      .map((trip) => ({
        trip,
        amount: monthExpenses
          .filter((e) => e.trip_id === trip.id)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount),
    [trips, monthExpenses]
  )

  // 圆环图数据
  const total = Math.max(1, totals.month)
  const topCategories = categoryTotals.slice(0, 5)
  const donut = useMemo(() => {
    let cursor = 0
    const conic = topCategories
      .map(({ category, amount }) => {
        const start = cursor
        const span = (amount / total) * 100
        cursor += span
        return `${category.color} ${start}% ${cursor}%`
      })
      .join(', ')
    return { conic, cursor }
  }, [topCategories, total])

  return (
    <div className="mx-auto max-w-[430px] space-y-3.5 lg:max-w-5xl">
      {/* 标题 + 月份选择器 */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">统计</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            onClick={prevMonth}
            aria-label="上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex h-9 min-w-[9rem] items-center justify-center rounded-md border border-slate-200/80 bg-white/80 px-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200">
            {formatMonthLabel(selectedMonth)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-9 w-9 rounded-md text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
              isCurrentMonth && 'cursor-not-allowed opacity-30'
            )}
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 月度汇总卡片 */}
      <Card className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_28px_rgba(15,23,42,0.07)] backdrop-blur dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none">
        <div className="grid grid-cols-3 divide-x divide-slate-200/70 dark:divide-white/10">
          <Metric label="当月支出" value={formatMoneyCompact(totals.month, 2)} tone="text-slate-950 dark:text-white" />
          <Metric label="待报销" value={formatMoneyCompact(totals.pendingReimbursement, 2)} tone="text-orange-500 dark:text-orange-400" />
          <Metric label="已报销" value={formatMoneyCompact(totals.reimbursed, 2)} tone="text-emerald-600 dark:text-emerald-300" />
        </div>
      </Card>

      {/* 模式切换 */}
      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200/80 bg-white/70 p-1 shadow-sm dark:border-white/10 dark:bg-white/[0.045]">
        {modes.map((item) => (
          <Button
            type="button"
            variant="ghost"
            key={item.key}
            className={cn(
              'h-8 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.06]',
              mode === item.key && 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-400/15 dark:text-emerald-200'
            )}
            onClick={() => setMode(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {/* 内容区 */}
      {mode === 'category' ? (
        <CategoryStats categories={topCategories} total={total} monthTotal={totals.month} conic={donut.conic} cursor={donut.cursor} />
      ) : null}
      {mode === 'trip' ? <TripStats tripTotals={tripTotals} /> : null}
      {mode === 'trend' ? <TrendStats weekly={weekly} maxWeek={maxWeek} /> : null}

      {/* 报销进度 */}
      <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
        <div className="flex items-center justify-between gap-3 text-sm">
          <h3 className="font-semibold text-slate-950 dark:text-white">报销进度</h3>
          <span className="text-slate-500 dark:text-slate-400">
            已报销 {formatMoney(totals.reimbursed)} / 总支出 {formatMoney(totals.month)}
          </span>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[repeating-linear-gradient(45deg,rgba(255,255,255,0.18)_0_8px,transparent_8px_16px),linear-gradient(90deg,#2ea86f,#63c98e)] transition-all duration-500"
            style={{ width: `${totals.month ? Math.min(100, (totals.reimbursed / totals.month) * 100) : 0}%` }}
          />
        </div>
        <p className="mt-2 text-right text-sm text-slate-600 dark:text-slate-300">
          {totals.month ? ((totals.reimbursed / totals.month) * 100).toFixed(1) : '0.0'}%
        </p>
      </Card>
    </div>
  )
}

// ─── 子组件 ────────────────────────────────────────────────────────────────────

function CategoryStats({
  categories,
  total,
  monthTotal,
  conic,
  cursor,
}: {
  categories: Array<{ category: Category; amount: number }>
  total: number
  monthTotal: number
  conic: string
  cursor: number
}) {
  return (
    <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
      <h3 className="font-semibold text-slate-950 dark:text-white">支出分类占比</h3>
      {categories.length ? (
        <>
          <div className="mt-4 grid grid-cols-[10rem_minmax(0,1fr)] items-center gap-4">
            <div className="relative h-36 w-36">
              <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${conic}, rgba(148,163,184,0.16) ${cursor}% 100%)` }} />
              <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white text-center shadow-inner dark:bg-[#101720]">
                <span className="text-xs text-slate-500 dark:text-slate-400">总支出</span>
                <span className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{formatMoneyCompact(monthTotal, 2)}</span>
              </div>
            </div>
            <div className="space-y-3">
              {categories.slice(0, 4).map(({ category, amount }) => (
                <div key={category.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <span className="shrink-0 font-medium">{((amount / total) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200/80 dark:border-white/10">
            <div className="grid grid-cols-[1fr_6rem_4rem_1rem] px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
              <span>分类</span>
              <span className="text-right">金额</span>
              <span className="text-right">占比</span>
              <span />
            </div>
            {categories.map(({ category, amount }, index) => {
              const Icon = getCategoryIcon(category.icon)
              const percent = (amount / total) * 100
              return (
                <div key={category.id} className={cn('grid grid-cols-[1fr_6rem_4rem_1rem] items-center gap-2 px-3 py-2.5 text-sm', index > 0 && 'border-t border-slate-200/80 dark:border-white/10')}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: category.color }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{category.name}</p>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${Math.max(6, percent)}%`, backgroundColor: category.color }} />
                      </div>
                    </div>
                  </div>
                  <span className="text-right font-medium">{formatMoney(amount)}</span>
                  <span className="text-right text-slate-500 dark:text-slate-400">{percent.toFixed(1)}%</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} title="暂无本月统计" detail="记录账单后这里会自动生成分布。" />
      )}
    </Card>
  )
}

function TripStats({ tripTotals }: { tripTotals: Array<{ trip: Trip; amount: number }> }) {
  const maxTrip = Math.max(1, ...tripTotals.map((item) => item.amount))
  return (
    <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
      <h3 className="font-semibold text-slate-950 dark:text-white">行程支出</h3>
      {tripTotals.length ? (
        <div className="mt-4 space-y-3">
          {tripTotals.map(({ trip, amount }) => {
            const budget = Number(trip.budget || 0)
            const percent = budget > 0 ? Math.min(100, (amount / budget) * 100) : (amount / maxTrip) * 100
            return (
              <div key={trip.id} className="rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950 dark:text-white">{trip.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{trip.destination || '未设置目的地'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-slate-950 dark:text-white">{formatMoney(amount)}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{budget > 0 ? `预算 ${formatMoney(budget)}` : '未设预算'}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500 dark:bg-emerald-300" style={{ width: `${Math.max(6, percent)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={MapPin} title="暂无行程数据" detail="给账单选择行程后，这里会按行程汇总支出。" />
      )}
    </Card>
  )
}

function TrendStats({ weekly, maxWeek }: { weekly: number[]; maxWeek: number }) {
  return (
    <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
      <h3 className="font-semibold text-slate-950 dark:text-white">本月趋势</h3>
      {weekly.some((amount) => amount > 0) ? (
        <div className="mt-4 grid h-52 grid-cols-5 items-end gap-2 rounded-lg border border-slate-200/80 bg-white/60 px-3 pb-3 pt-4 dark:border-white/10 dark:bg-black/15">
          {weekly.map((amount, index) => {
            const percent = maxWeek ? (amount / maxWeek) * 100 : 0
            return (
              <div key={index} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
                <span className="text-[0.68rem] font-medium text-slate-500 dark:text-slate-400">{formatMoneyCompact(amount)}</span>
                <div className="flex h-32 w-full max-w-10 items-end rounded-full bg-slate-100 dark:bg-white/10">
                  <div className="w-full rounded-full bg-gradient-to-t from-emerald-600 to-emerald-300 transition-all duration-500" style={{ height: `${Math.max(5, percent)}%` }} />
                </div>
                <span className="text-[0.68rem] text-slate-500 dark:text-slate-400">第{index + 1}周</span>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState icon={TrendingUp} title="暂无趋势数据" detail="本月记录支出后，这里会显示每周变化。" />
      )}
    </Card>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="truncate text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">{label}</p>
      <p className={cn('mt-1 truncate text-base font-semibold leading-6', tone)}>{value}</p>
    </div>
  )
}
