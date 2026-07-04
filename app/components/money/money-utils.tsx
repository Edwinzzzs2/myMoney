import {
  BarChart3,
  Briefcase,
  Car,
  ClipboardList,
  Clock3,
  Hotel,
  MoreHorizontal,
  Plane,
  Receipt,
  Settings,
  Utensils,
  Wifi,
} from 'lucide-react'

import type { Expense, ExpenseFormState, TabKey } from './types'

export const iconMap = {
  utensils: Utensils,
  car: Car,
  hotel: Hotel,
  plane: Plane,
  briefcase: Briefcase,
  wifi: Wifi,
  receipt: Receipt,
  more: MoreHorizontal,
}

export const tabs = [
  { key: 'record' as const, label: '记账', icon: ClipboardList },
  { key: 'stats' as const, label: '统计', icon: BarChart3 },
  { key: 'history' as const, label: '历史', icon: Clock3 },
  { key: 'settings' as const, label: '设置', icon: Settings },
] satisfies Array<{ key: TabKey; label: string; icon: typeof ClipboardList }>

export const invoiceLabels: Record<string, string> = {
  pending: '待开票',
  received: '已开票',
  none: '无发票',
}

export const reimbursementLabels: Record<string, string> = {
  pending: '待报销',
  reimbursed: '已报销',
}

export const paymentMethods = ['个人垫付', '公司卡', '微信', '支付宝', '银行卡', '现金']
export const invoiceOptions = ['pending', 'received', 'none']

export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

export function makeBlankForm(categoryId = '', tripId = ''): ExpenseFormState {
  return {
    trip_id: tripId,
    category_id: categoryId,
    amount: '',
    title: '',
    merchant: '',
    expense_date: todayISO(),
    expense_time: nowTime(),
    payment_method: '个人垫付',
    invoice_status: 'pending',
    reimbursement_status: 'pending',
    reimbursable: true,
    note: '',
    receipt_url: '',
  }
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0)
  return `¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatVoiceTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export function formatMonthDay(dateString = todayISO()) {
  const date = new Date(`${dateString}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatMoneyCompact(value: number | string | null | undefined, digits = 0) {
  const amount = Number(value || 0)
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

export function getCategoryIcon(icon?: string | null) {
  return iconMap[(icon || 'more') as keyof typeof iconMap] || MoreHorizontal
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    let message = `请求失败：${res.status}`
    try {
      const body = await res.json()
      message = body?.message || body?.error || message
    } catch {}
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

export function expenseToPayload(expense: Expense) {
  return {
    trip_id: expense.trip_id,
    category_id: expense.category_id,
    amount: expense.amount,
    title: expense.title,
    merchant: expense.merchant || '',
    expense_date: expense.expense_date,
    expense_time: expense.expense_time || '',
    payment_method: expense.payment_method,
    invoice_status: expense.invoice_status,
    reimbursement_status: expense.reimbursement_status,
    reimbursable: expense.reimbursable,
    note: expense.note || '',
    receipt_url: expense.receipt_url || '',
  }
}

export function formToPayload(form: ExpenseFormState) {
  return {
    trip_id: form.trip_id || null,
    category_id: form.category_id || null,
    amount: Number(form.amount),
    title: form.title.trim(),
    merchant: form.merchant.trim(),
    expense_date: form.expense_date,
    expense_time: form.expense_time,
    payment_method: form.payment_method,
    invoice_status: form.invoice_status,
    reimbursement_status: form.reimbursement_status,
    reimbursable: form.reimbursable,
    note: form.note.trim(),
    receipt_url: form.receipt_url.trim(),
  }
}

export function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}
