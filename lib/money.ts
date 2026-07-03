import { query } from '@/lib/db'

export type ExpensePayload = {
  trip_id?: number | string | null
  category_id?: number | string | null
  amount?: number | string
  title?: string
  merchant?: string | null
  expense_date?: string
  expense_time?: string | null
  payment_method?: string
  invoice_status?: string
  reimbursement_status?: string
  reimbursable?: boolean
  note?: string | null
  receipt_url?: string | null
}

export const categorySelect =
  'SELECT id::text, name, icon, color, sort_order, is_active, created_at FROM my_money_categories'

export const tripSelect =
  'SELECT id::text, name, destination, to_char(start_date, \'YYYY-MM-DD\') AS start_date, to_char(end_date, \'YYYY-MM-DD\') AS end_date, budget::float AS budget, status, created_at, updated_at FROM my_money_trips'

export const expenseSelect =
  'SELECT e.id::text, e.trip_id::text, e.category_id::text, e.amount::float AS amount, e.currency, e.title, e.merchant, ' +
  'to_char(e.expense_date, \'YYYY-MM-DD\') AS expense_date, to_char(e.expense_time, \'HH24:MI\') AS expense_time, ' +
  'e.payment_method, e.invoice_status, e.reimbursement_status, e.reimbursable, e.note, e.receipt_url, e.created_at, e.updated_at, ' +
  'c.name AS category_name, c.icon AS category_icon, c.color AS category_color, t.name AS trip_name, t.destination ' +
  'FROM my_money_expenses e ' +
  'LEFT JOIN my_money_categories c ON c.id = e.category_id ' +
  'LEFT JOIN my_money_trips t ON t.id = e.trip_id'

export function normalizeExpensePayload(data: ExpensePayload) {
  const amount = Number(data.amount)
  const categoryId = data.category_id ? Number(data.category_id) : null
  const tripId = data.trip_id ? Number(data.trip_id) : null
  const title = String(data.title || '').trim()
  const expenseDate = String(data.expense_date || '').trim()

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请填写有效金额')
  }
  if (!title) {
    throw new Error('请填写账单标题')
  }
  if (!categoryId || !Number.isInteger(categoryId)) {
    throw new Error('请选择分类')
  }
  if (!expenseDate) {
    throw new Error('请选择日期')
  }

  return {
    tripId: tripId && Number.isInteger(tripId) ? tripId : null,
    categoryId,
    amount,
    title,
    merchant: data.merchant ? String(data.merchant).trim() : null,
    expenseDate,
    expenseTime: data.expense_time ? String(data.expense_time).trim() : null,
    paymentMethod: String(data.payment_method || '个人垫付').trim(),
    invoiceStatus: String(data.invoice_status || 'pending').trim(),
    reimbursementStatus: String(data.reimbursement_status || 'unsubmitted').trim(),
    reimbursable: data.reimbursable !== false,
    note: data.note ? String(data.note).trim() : null,
    receiptUrl: data.receipt_url ? String(data.receipt_url).trim() : null,
  }
}

export async function getBootstrapData() {
  const [categories, trips, expenses] = await Promise.all([
    query(`${categorySelect} ORDER BY sort_order ASC, id ASC`),
    query(`${tripSelect} WHERE status <> 'archived' ORDER BY created_at DESC, id DESC`),
    query(`${expenseSelect} ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC`),
  ])

  return { categories, trips, expenses }
}

export function buildSummary(expenses: any[]) {
  const today = new Date()
  const todayKey = today.toISOString().slice(0, 10)
  const monthKey = todayKey.slice(0, 7)
  const totals = {
    total: 0,
    month: 0,
    today: 0,
    reimbursable: 0,
    submitted: 0,
    reimbursed: 0,
    unsubmitted: 0,
  }

  for (const expense of expenses) {
    const amount = Number(expense.amount || 0)
    totals.total += amount
    if (String(expense.expense_date || '').startsWith(monthKey)) totals.month += amount
    if (expense.expense_date === todayKey) totals.today += amount
    if (expense.reimbursable) totals.reimbursable += amount
    if (expense.reimbursement_status === 'submitted') totals.submitted += amount
    if (expense.reimbursement_status === 'reimbursed') totals.reimbursed += amount
    if (expense.reimbursement_status === 'unsubmitted') totals.unsubmitted += amount
  }

  return totals
}
