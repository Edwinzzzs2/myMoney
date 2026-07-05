"use client"

import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { ManualForm as ManualExpenseForm } from '@/app/components/money/manual-form'
import { RecordPage } from '@/app/components/money/record-page'
import { StatsPage } from '@/app/components/money/stats-page'
import { LoginScreen } from '@/app/components/money/login-screen'
import { HistoryView } from '@/app/components/money/history-view'
import { SettingsView } from '@/app/components/money/settings-view'
import { SettingsPanelDrawer } from '@/app/components/money/settings-panel'
import { ExpenseFormSheet } from '@/app/components/money/expense-form-sheet'
import { ConfirmActionDialog } from '@/app/components/money/confirm-action-dialog'
import { BatchConfirmDialog } from '@/app/components/money/batch-confirm-dialog'
import { SmartDialog } from '@/app/components/money/smart-dialog'
import { DesktopNav, BottomNav, MoneyTopBar } from '@/app/components/money/nav'
import { toast } from 'sonner'
import type {
  AiParsedExpense,
  BootstrapData,
  Category,
  CategoryFormState,
  Expense,
  ExpenseFormState,
  InvoiceStatus,
  PaymentMethod,
  SettingsPanel,
  SmartAiUsage,
  SmartMode,
  TabKey,
  Trip,
  TripFormState,
} from '@/app/components/money/types'
import {
  escapeCsv,
  expenseToPayload,
  fetchJson,
  formToPayload,
  formatMoney,
  friendlyErrorMessage,
  invoiceLabels as defaultInvoiceLabels,
  makeBlankForm,
  nowTime,
  paymentMethods as defaultPaymentMethods,
  reimbursementLabels,
  todayISO,
} from '@/app/components/money/money-utils'
import {
  createZipArchive,
  createReceiptZipFile,
  downloadBlob,
  safeFileName,
} from '@/app/components/money/file-utils'
import { Loader2 } from 'lucide-react'

type HistoryFilter = 'all' | 'invoice' | 'invoiced' | 'reimbursement' | 'reimbursed'
type BatchReimbursementStatus = 'pending' | 'reimbursed'
type ConfirmActionState = {
  title: string
  description: string
  confirmLabel: string
  tone?: 'danger' | 'warning'
  onConfirm: () => Promise<void>
}
const preferredTripStorageKey = 'myMoney.preferredTripId'

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMonthKey(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function formatStatsMonthLabel(key: string) {
  return parseMonthKey(key).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

export function MoneyApp() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [activeTab, setActiveTab] = useState<TabKey>('record')
  const [statsSelectedMonth, setStatsSelectedMonth] = useState(() => toMonthKey(new Date()))
  const [categories, setCategories] = useState<Category[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([])
  const [accountPaymentMethods, setAccountPaymentMethods] = useState<PaymentMethod[]>([])
  const [accountInvoiceStatuses, setAccountInvoiceStatuses] = useState<InvoiceStatus[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<ExpenseFormState>(makeBlankForm())
  const [editingExpenseForm, setEditingExpenseForm] = useState<ExpenseFormState | null>(null)
  const [search, setSearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [batchSelecting, setBatchSelecting] = useState(false)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [batchConfirmStatus, setBatchConfirmStatus] = useState<BatchReimbursementStatus | null>(null)
  const [confirmAction, setConfirmAction] = useState<ConfirmActionState | null>(null)
  const [confirmActionPending, setConfirmActionPending] = useState(false)
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>(null)
  const [user, setUser] = useState<{ id: string; username: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [pwdSuccess, setPwdSuccess] = useState('')
  const [adminUsers, setAdminUsers] = useState<any[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminResetUserId, setAdminResetUserId] = useState<string | null>(null)
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [adminResetError, setAdminResetError] = useState('')
  const [adminResetSuccess, setAdminResetSuccess] = useState('')
  const [adminResetLoading, setAdminResetLoading] = useState(false)
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAdminResetPassword, setShowAdminResetPassword] = useState(false)
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', icon: 'more', color: '#94a3b8' })
  const [tripForm, setTripForm] = useState<TripFormState>({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [paymentMethodForm, setPaymentMethodForm] = useState('')
  const [editingPaymentMethodId, setEditingPaymentMethodId] = useState<string | null>(null)
  const [invoiceStatusForm, setInvoiceStatusForm] = useState('')
  const [editingInvoiceStatusId, setEditingInvoiceStatusId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportingDoc, setExportingDoc] = useState(false)
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartMode, setSmartMode] = useState<SmartMode>('text')
  const [smartText, setSmartText] = useState('')
  const [smartDraft, setSmartDraft] = useState<ExpenseFormState | null>(null)
  const [smartUsage, setSmartUsage] = useState<SmartAiUsage | null>(null)
  const [listening, setListening] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState('点击语音输入后会自动开始识别')
  const speechRecognitionRef = useRef<any>(null)
  const voiceTimerRef = useRef<number | null>(null)
  const voiceSessionStartTextRef = useRef('')
  const voiceRecognizedTextRef = useRef('')
  const voiceManualEditedRef = useRef(false)

  function setError(message: string) {
    if (!message) {
      toast.dismiss('app-error')
      return
    }
    toast.error(message, { id: 'app-error' })
  }

  async function executeConfirmAction() {
    if (!confirmAction || confirmActionPending) return
    setConfirmActionPending(true)
    try {
      await confirmAction.onConfirm()
      setConfirmAction(null)
    } finally {
      setConfirmActionPending(false)
    }
  }

  const activeCategories = useMemo(() => categories.filter((item) => item.is_active), [categories])
  const archivedCategories = useMemo(() => categories.filter((item) => !item.is_active), [categories])
  const exportTrips = useMemo(() => [...trips, ...archivedTrips], [trips, archivedTrips])
  const archivedItemCount = archivedCategories.length + archivedTrips.length
  const activePaymentMethods = useMemo(() => accountPaymentMethods.filter((item) => item.is_active), [accountPaymentMethods])
  const activeInvoiceStatuses = useMemo(() => accountInvoiceStatuses.filter((item) => item.is_active), [accountInvoiceStatuses])
  const invoiceLabelMap = useMemo(
    () => ({
      ...defaultInvoiceLabels,
      ...Object.fromEntries(accountInvoiceStatuses.map((status) => [status.value, status.label])),
    }),
    [accountInvoiceStatuses]
  )

  const totals = useMemo(() => {
    const currentDate = todayISO()
    const monthKey = currentDate.slice(0, 7)
    const summary = {
      total: 0,
      month: 0,
      today: 0,
      pendingReimbursement: 0,
      reimbursed: 0,
      countToday: 0,
    }
    for (const expense of expenses) {
      const amount = Number(expense.amount || 0)
      summary.total += amount
      if (expense.expense_date?.startsWith(monthKey)) summary.month += amount
      if (expense.expense_date === currentDate) {
        summary.today += amount
        summary.countToday += 1
      }
      if (expense.reimbursement_status === 'pending') summary.pendingReimbursement += amount
      if (expense.expense_date?.startsWith(monthKey) && expense.reimbursement_status === 'reimbursed') summary.reimbursed += amount
    }
    return summary
  }, [expenses])

  const todayExpenses = useMemo(() => expenses.filter((item) => item.expense_date === todayISO()), [expenses])

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = expenses
    if (historyFilter === 'invoice') list = list.filter((e) => e.invoice_status === 'pending')
    if (historyFilter === 'invoiced') list = list.filter((e) => e.invoice_status === 'received')
    if (historyFilter === 'reimbursement') list = list.filter((e) => e.reimbursement_status === 'pending')
    if (historyFilter === 'reimbursed') list = list.filter((e) => e.reimbursement_status === 'reimbursed')
    if (!q) return list
    return list.filter((expense) => {
      const hay = [expense.title, expense.merchant, expense.category_name, expense.trip_name, expense.destination, expense.note, expense.amount]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [expenses, historyFilter, search])

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const expense of filteredExpenses) {
      const list = groups.get(expense.expense_date) || []
      list.push(expense)
      groups.set(expense.expense_date, list)
    }
    return Array.from(groups.entries())
  }, [filteredExpenses])

  const selectedExpenseIdSet = useMemo(() => new Set(selectedExpenseIds), [selectedExpenseIds])
  const selectedExpenses = useMemo(() => expenses.filter((e) => selectedExpenseIdSet.has(e.id)), [expenses, selectedExpenseIdSet])
  const selectedExpenseTotal = useMemo(() => selectedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0), [selectedExpenses])
  const allFilteredExpensesSelected = filteredExpenses.length > 0 && filteredExpenses.every((e) => selectedExpenseIdSet.has(e.id))




  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    const existingIds = new Set(expenses.map((e) => e.id))
    setSelectedExpenseIds((current) => current.filter((id) => existingIds.has(id)))
  }, [expenses])

  useEffect(() => {
    return () => {
      stopVoiceTimer()
      stopBrowserRecognition()
    }
  }, [])

  // ─── 数据加载 ─────────────────────────────────────────────
  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const authRes = await fetch('/api/auth/me')
      if (authRes.status === 401) {
        setUser(null)
        setAuthLoading(false)
        setLoading(false)
        return
      }

      const data = await fetchJson<BootstrapData & { authenticated: boolean; user: any }>('/api/bootstrap')
      if (!data.authenticated) {
        setUser(null)
        setAuthLoading(false)
        setLoading(false)
        return
      }

      setUser(data.user)
      setAuthLoading(false)
      const preferredTripId = getPreferredTripId(data.trips)
      const nextPaymentMethods = data.paymentMethods || []
      const nextInvoiceStatuses = data.invoiceStatuses || []
      const nextActivePaymentMethods = nextPaymentMethods.filter((item) => item.is_active)
      const nextActiveInvoiceStatuses = nextInvoiceStatuses.filter((item) => item.is_active)
      setCategories(data.categories)
      setTrips(data.trips)
      setArchivedTrips(data.archivedTrips || [])
      setAccountPaymentMethods(nextPaymentMethods)
      setAccountInvoiceStatuses(nextInvoiceStatuses)
      setExpenses(data.expenses)
      setForm((current) => ({
        ...current,
        category_id: current.category_id || data.categories.find((item) => item.is_active)?.id || '',
        trip_id: data.trips.some((trip) => trip.id === current.trip_id) ? current.trip_id : preferredTripId,
        payment_method: current.id ? current.payment_method : normalizePaymentMethod(current.payment_method, nextActivePaymentMethods),
        invoice_status: current.id ? current.invoice_status : normalizeInvoiceStatus(current.invoice_status, nextActiveInvoiceStatuses),
      }))
    } catch (e: any) {
      if (e.message?.includes('401')) {
        setUser(null)
      } else {
        setError(friendlyErrorMessage(e, '加载失败'))
      }
      setAuthLoading(false)
    } finally {
      setLoading(false)
    }
  }

  // ─── 认证 ─────────────────────────────────────────────────
  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setUser(null)
      setSmartUsage(null)
      setActiveTab('record')
      setSettingsPanel(null)
    } catch (e) {
      console.error(e)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!oldPassword || !newPassword) return
    if (newPassword.length < 2) { setPwdError('新密码长度不能少于 2 位'); return }
    if (newPassword !== confirmPassword) { setPwdError('两次输入的新密码不一致'); return }
    setPwdLoading(true)
    setPwdError('')
    setPwdSuccess('')
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '修改密码失败')
      setPwdSuccess('密码修改成功！')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwdError(friendlyErrorMessage(err, '系统错误，请重试'))
    } finally {
      setPwdLoading(false)
    }
  }

  // ─── 管理员 ───────────────────────────────────────────────
  async function fetchAdminUsers() {
    setAdminUsersLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('获取用户列表失败')
      const data = await res.json()
      setAdminUsers(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setAdminUsersLoading(false)
    }
  }

  async function handleAdminResetPassword() {
    if (!adminResetUserId || adminNewPassword.length < 2) return
    setAdminResetLoading(true)
    setAdminResetError('')
    setAdminResetSuccess('')
    try {
      const res = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: adminResetUserId, newPassword: adminNewPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '重置密码失败')
      setAdminResetSuccess('重置密码成功！')
      setAdminNewPassword('')
      fetchAdminUsers()
      setTimeout(() => setAdminResetUserId(null), 1500)
    } catch (err: any) {
      setAdminResetError(friendlyErrorMessage(err, '重置失败'))
    } finally {
      setAdminResetLoading(false)
    }
  }

  async function handleAdminDeleteUser(targetUserId: string, confirmed = false) {
    if (!confirmed) {
      const targetUsername = adminUsers.find((item) => item.id === targetUserId)?.username || '该用户'
      setConfirmAction({
        title: `删除用户「${targetUsername}」？`,
        description: '该用户的全部账单、分类和行程数据将同时删除，且无法恢复。',
        confirmLabel: '确认删除',
        onConfirm: () => handleAdminDeleteUser(targetUserId, true),
      })
      return
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '删除用户失败')
      fetchAdminUsers()
      toast.success(`已删除用户「${adminUsers.find((item) => item.id === targetUserId)?.username || targetUserId}」`)
    } catch (err: any) {
      setError(friendlyErrorMessage(err, '删除失败'))
    }
  }

  // ─── 表单辅助 ─────────────────────────────────────────────
  function patchForm(patch: Partial<ExpenseFormState>) {
    if (patch.trip_id !== undefined) rememberPreferredTripId(patch.trip_id)
    setForm((current) => ({ ...current, ...patch }))
  }

  function patchEditingExpenseForm(patch: Partial<ExpenseFormState>) {
    if (patch.trip_id !== undefined) rememberPreferredTripId(patch.trip_id)
    setEditingExpenseForm((current) => (current ? { ...current, ...patch } : current))
  }

  function patchSmartDraft(patch: Partial<ExpenseFormState>) {
    if (patch.trip_id !== undefined) rememberPreferredTripId(patch.trip_id)
    setSmartDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function getPreferredTripId(nextTrips = trips) {
    const fallbackTripId = nextTrips[0]?.id || ''
    try {
      const storedTripId = window.localStorage.getItem(preferredTripStorageKey) || ''
      return nextTrips.some((trip) => trip.id === storedTripId) ? storedTripId : fallbackTripId
    } catch {
      return fallbackTripId
    }
  }

  function rememberPreferredTripId(tripId: string) {
    if (!tripId) return
    try { window.localStorage.setItem(preferredTripStorageKey, tripId) } catch {}
  }

  function getDefaultPaymentMethod(nextMethods = activePaymentMethods) {
    return nextMethods.find((m) => m.name === defaultPaymentMethods[0])?.name || nextMethods[0]?.name || defaultPaymentMethods[0] || ''
  }

  function getDefaultInvoiceStatus(nextStatuses = activeInvoiceStatuses) {
    return nextStatuses.find((s) => s.value === 'pending')?.value || nextStatuses[0]?.value || 'pending'
  }

  function normalizePaymentMethod(value: string, nextMethods = activePaymentMethods) {
    return nextMethods.some((m) => m.name === value) ? value : getDefaultPaymentMethod(nextMethods)
  }

  function normalizeInvoiceStatus(value: string, nextStatuses = activeInvoiceStatuses) {
    return nextStatuses.some((s) => s.value === value) ? value : getDefaultInvoiceStatus(nextStatuses)
  }

  function makeAccountBlankForm(categoryId = activeCategories[0]?.id || '', tripId = getPreferredTripId(trips)) {
    return {
      ...makeBlankForm(categoryId, tripId),
      payment_method: getDefaultPaymentMethod(),
      invoice_status: getDefaultInvoiceStatus(),
    }
  }

  function resetFormWithPreferredTrip(nextForm: ExpenseFormState) {
    setForm({
      ...nextForm,
      trip_id: getPreferredTripId(trips),
      payment_method: normalizePaymentMethod(nextForm.payment_method),
      invoice_status: normalizeInvoiceStatus(nextForm.invoice_status),
    })
  }

  function focusManualForm() {
    setActiveTab('record')
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const formNode = document.getElementById('manual-entry-form')
        formNode?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        formNode?.querySelector<HTMLInputElement>('input[name="amount"]')?.focus()
      })
    })
  }

  // ─── 账单 CRUD ────────────────────────────────────────────
  async function saveExpense(event?: FormEvent) {
    event?.preventDefault()
    const nextTripId = form.trip_id || getPreferredTripId(trips)
    const wasEditing = Boolean(form.id)
    setSaving(true)
    setError('')
    try {
      const endpoint = form.id ? `/api/expenses/${form.id}` : '/api/expenses'
      await fetchJson<Expense>(endpoint, {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify(formToPayload(form)),
      })
      await loadData()
      toast.success(wasEditing ? '账单已保存' : '账单添加成功')
      setForm(makeAccountBlankForm(activeCategories[0]?.id || '', nextTripId))
      setSmartDraft(null)
      setSmartText('')
      setSmartOpen(false)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  function editExpense(expense: Expense) {
    setEditingExpenseForm({
      id: expense.id,
      trip_id: expense.trip_id || '',
      category_id: expense.category_id || '',
      amount: String(expense.amount),
      title: expense.title,
      merchant: expense.merchant || '',
      expense_date: expense.expense_date,
      expense_time: expense.expense_time || '',
      payment_method: expense.payment_method,
      invoice_status: expense.invoice_status,
      reimbursement_status: expense.reimbursement_status,
      note: expense.note || '',
      receipt_url: expense.receipt_url || '',
      screenshot_url: expense.screenshot_url || '',
    })
  }

  async function saveEditedExpense(event?: FormEvent) {
    event?.preventDefault()
    if (!editingExpenseForm?.id) return

    setSaving(true)
    setError('')
    try {
      await fetchJson<Expense>(`/api/expenses/${editingExpenseForm.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formToPayload(editingExpenseForm)),
      })
      await loadData()
      toast.success(`已保存「${editingExpenseForm.title}」`)
      setEditingExpenseForm(null)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteExpense(expense: Expense, confirmed = false) {
    if (!confirmed) {
      setConfirmAction({
        title: `删除账单「${expense.title}」？`,
        description: `金额：${formatMoney(expense.amount)}\n日期：${expense.expense_date}\n删除后无法恢复。`,
        confirmLabel: '确认删除',
        onConfirm: () => deleteExpense(expense, true),
      })
      return
    }

    setError('')
    try {
      await fetchJson(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      setExpenses((current) => current.filter((item) => item.id !== expense.id))
      toast.success(`已删除「${expense.title}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '删除失败'))
    }
  }

  async function quickStatus(expense: Expense, status: string) {
    setError('')
    try {
      await fetchJson<Expense>(`/api/expenses/${expense.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...expenseToPayload(expense), reimbursement_status: status }),
      })
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '更新状态失败'))
    }
  }

  // ─── 批量操作 ─────────────────────────────────────────────
  function toggleExpenseSelection(expense: Expense) {
    setSelectedExpenseIds((current) =>
      current.includes(expense.id) ? current.filter((id) => id !== expense.id) : [...current, expense.id]
    )
  }

  function toggleFilteredExpenseSelection() {
    const filteredIds = filteredExpenses.map((e) => e.id)
    if (!filteredIds.length) return
    setSelectedExpenseIds((current) => {
      const next = new Set(current)
      if (filteredIds.every((id) => next.has(id))) {
        filteredIds.forEach((id) => next.delete(id))
      } else {
        filteredIds.forEach((id) => next.add(id))
      }
      return Array.from(next)
    })
  }

  function clearSelectedExpenses() { setSelectedExpenseIds([]) }

  function exitBatchSelection() {
    setBatchSelecting(false)
    setBatchConfirmStatus(null)
    clearSelectedExpenses()
  }

  function requestBatchUpdateReimbursementStatus(status: BatchReimbursementStatus) {
    if (!selectedExpenseIds.length) { setError('请先选择账单'); return }
    setBatchConfirmStatus(status)
  }

  async function confirmBatchUpdateReimbursementStatus() {
    if (!batchConfirmStatus || !selectedExpenseIds.length) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<{ updatedCount: number }>('/api/expenses/batch', {
        method: 'PATCH',
        body: JSON.stringify({ ids: selectedExpenseIds, reimbursement_status: batchConfirmStatus }),
      })
      setBatchConfirmStatus(null)
      clearSelectedExpenses()
      setBatchSelecting(false)
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '批量更新失败'))
    } finally {
      setSaving(false)
    }
  }

  // ─── 分类 ─────────────────────────────────────────────────
  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    const name = categoryForm.name.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ ...categoryForm, name }),
      })
      setCategoryForm({ name: '', icon: 'more', color: '#94a3b8' })
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存分类失败'))
    } finally {
      setSaving(false)
    }
  }

  async function disableCategory(category: Category, confirmed = false) {
    if (!confirmed) {
      setConfirmAction({
        title: `停用分类「${category.name}」？`,
        description: '该分类将不再用于新账单，历史账单会保留。',
        confirmLabel: '确认停用',
        tone: 'warning',
        onConfirm: () => disableCategory(category, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/categories/${category.id}`, { method: 'DELETE' })
      await loadData()
      toast.success(`已停用分类「${category.name}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '停用分类失败'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteArchivedCategory(category: Category, confirmed = false) {
    const usageCount = expenses.filter((e) => e.category_id === category.id).length
    if (usageCount > 0) return
    if (!confirmed) {
      setConfirmAction({
        title: `删除分类「${category.name}」？`,
        description: '该分类将被彻底删除，且无法恢复。',
        confirmLabel: '确认删除',
        onConfirm: () => deleteArchivedCategory(category, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/categories/${category.id}?hard=1`, { method: 'DELETE' })
      await loadData()
      toast.success(`已删除分类「${category.name}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '删除归档分类失败'))
    } finally {
      setSaving(false)
    }
  }

  // ─── 行程 ─────────────────────────────────────────────────
  async function saveTrip(event: FormEvent) {
    event.preventDefault()
    const name = tripForm.name.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<Trip>(editingTripId ? `/api/trips/${editingTripId}` : '/api/trips', {
        method: editingTripId ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...tripForm, name }),
      })
      setTripForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
      setEditingTripId(null)
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存行程失败'))
    } finally {
      setSaving(false)
    }
  }

  function beginEditTrip(trip: Trip) {
    setEditingTripId(trip.id)
    setTripForm({
      name: trip.name,
      destination: trip.destination || '',
      start_date: trip.start_date || '',
      end_date: trip.end_date || '',
      budget: trip.budget ? String(trip.budget) : '',
    })
  }

  function cancelEditTrip() {
    setEditingTripId(null)
    setTripForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
  }

  async function archiveTrip(trip: Trip, confirmed = false) {
    if (!confirmed) {
      setConfirmAction({
        title: `归档行程「${trip.name}」？`,
        description: '该行程将不再用于新账单，历史账单会保留。',
        confirmLabel: '确认归档',
        tone: 'warning',
        onConfirm: () => archiveTrip(trip, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/trips/${trip.id}`, { method: 'DELETE' })
      await loadData()
      toast.success(`已归档行程「${trip.name}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '归档行程失败'))
    } finally {
      setSaving(false)
    }
  }

  async function deleteArchivedTrip(trip: Trip, confirmed = false) {
    const usageCount = expenses.filter((e) => e.trip_id === trip.id).length
    if (usageCount > 0) return
    if (!confirmed) {
      setConfirmAction({
        title: `删除行程「${trip.name}」？`,
        description: '该行程将被彻底删除，且无法恢复。',
        confirmLabel: '确认删除',
        onConfirm: () => deleteArchivedTrip(trip, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/trips/${trip.id}?hard=1`, { method: 'DELETE' })
      await loadData()
      toast.success(`已删除行程「${trip.name}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '删除归档行程失败'))
    } finally {
      setSaving(false)
    }
  }

  // ─── 支付方式 ─────────────────────────────────────────────
  async function savePaymentMethod(event: FormEvent) {
    event.preventDefault()
    const name = paymentMethodForm.trim()
    if (!name) return
    const currentMethod = accountPaymentMethods.find((m) => m.id === editingPaymentMethodId)
    setSaving(true)
    setError('')
    try {
      await fetchJson<PaymentMethod>(editingPaymentMethodId ? `/api/payment-methods/${editingPaymentMethodId}` : '/api/payment-methods', {
        method: editingPaymentMethodId ? 'PATCH' : 'POST',
        body: JSON.stringify({ name, sort_order: currentMethod?.sort_order ?? accountPaymentMethods.length, is_active: true }),
      })
      setPaymentMethodForm('')
      setEditingPaymentMethodId(null)
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存支付方式失败'))
    } finally {
      setSaving(false)
    }
  }

  function beginEditPaymentMethod(method: PaymentMethod) {
    setEditingPaymentMethodId(method.id)
    setPaymentMethodForm(method.name)
  }

  function cancelEditPaymentMethod() {
    setEditingPaymentMethodId(null)
    setPaymentMethodForm('')
  }

  async function deletePaymentMethod(method: PaymentMethod, confirmed = false) {
    const usageCount = expenses.filter((e) => e.payment_method === method.name).length
    const actionText = usageCount > 0 ? '停用' : '删除'
    if (!confirmed) {
      setConfirmAction({
        title: `${actionText}支付方式「${method.name}」？`,
        description: usageCount > 0
          ? `该支付方式已被 ${usageCount} 笔账单使用，历史账单会保留原支付方式。`
          : '该支付方式将被彻底删除，且无法恢复。',
        confirmLabel: `确认${actionText}`,
        tone: usageCount > 0 ? 'warning' : 'danger',
        onConfirm: () => deletePaymentMethod(method, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/payment-methods/${method.id}${usageCount === 0 ? '?hard=1' : ''}`, { method: 'DELETE' })
      await loadData()
      toast.success(`已${actionText}支付方式「${method.name}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, `${actionText}支付方式失败`))
    } finally {
      setSaving(false)
    }
  }

  // ─── 发票状态 ─────────────────────────────────────────────
  async function saveInvoiceStatus(event: FormEvent) {
    event.preventDefault()
    const label = invoiceStatusForm.trim()
    if (!label) return
    const currentStatus = accountInvoiceStatuses.find((s) => s.id === editingInvoiceStatusId)
    setSaving(true)
    setError('')
    try {
      await fetchJson<InvoiceStatus>(editingInvoiceStatusId ? `/api/invoice-statuses/${editingInvoiceStatusId}` : '/api/invoice-statuses', {
        method: editingInvoiceStatusId ? 'PATCH' : 'POST',
        body: JSON.stringify({ label, sort_order: currentStatus?.sort_order ?? accountInvoiceStatuses.length, is_active: true }),
      })
      setInvoiceStatusForm('')
      setEditingInvoiceStatusId(null)
      await loadData()
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '保存发票状态失败'))
    } finally {
      setSaving(false)
    }
  }

  function beginEditInvoiceStatus(status: InvoiceStatus) {
    setEditingInvoiceStatusId(status.id)
    setInvoiceStatusForm(status.label)
  }

  function cancelEditInvoiceStatus() {
    setEditingInvoiceStatusId(null)
    setInvoiceStatusForm('')
  }

  async function deleteInvoiceStatus(status: InvoiceStatus, confirmed = false) {
    const usageCount = expenses.filter((e) => e.invoice_status === status.value).length
    const actionText = usageCount > 0 ? '停用' : '删除'
    if (!confirmed) {
      setConfirmAction({
        title: `${actionText}发票状态「${status.label}」？`,
        description: usageCount > 0
          ? `该状态已被 ${usageCount} 笔账单使用，历史账单会保留原发票状态。`
          : '该发票状态将被彻底删除，且无法恢复。',
        confirmLabel: `确认${actionText}`,
        tone: usageCount > 0 ? 'warning' : 'danger',
        onConfirm: () => deleteInvoiceStatus(status, true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/invoice-statuses/${status.id}${usageCount === 0 ? '?hard=1' : ''}`, { method: 'DELETE' })
      await loadData()
      toast.success(`已${actionText}发票状态「${status.label}」`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, `${actionText}发票状态失败`))
    } finally {
      setSaving(false)
    }
  }

  // ─── 历史清空 ─────────────────────────────────────────────
  async function clearHistory(confirmed = false) {
    if (!expenses.length) return
    if (!confirmed) {
      setConfirmAction({
        title: '清空全部历史账单？',
        description: `将永久删除当前全部 ${expenses.length} 笔账单，分类与行程会保留。`,
        confirmLabel: '确认清空',
        onConfirm: () => clearHistory(true),
      })
      return
    }

    setSaving(true)
    setError('')
    try {
      await fetchJson<{ ok: boolean }>('/api/expenses', { method: 'DELETE' })
      setExpenses([])
      setSearch('')
      setHistoryFilter('all')
      toast.success('历史账单已清空')
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '清空历史失败'))
    } finally {
      setSaving(false)
    }
  }

  // ─── 导出 ─────────────────────────────────────────────────
  function getExportExpenses(tripId = '') {
    return tripId ? expenses.filter((e) => e.trip_id === tripId) : expenses
  }

  function getExportLabel(tripId = '') {
    return exportTrips.find((t) => t.id === tripId)?.name || '全部行程'
  }

  function buildExportData(expensesToExport: Expense[]) {
    const receiptFiles: ReturnType<typeof createReceiptZipFile>[] = []
    const receiptPaths = new Map<string, string>()
    const screenshotPaths = new Map<string, string>()
    for (const expense of expensesToExport) {
      if (expense.receipt_url) {
        const receiptFile = createReceiptZipFile({ ...expense, receipt_url: expense.receipt_url })
        if (receiptFile) {
          receiptFiles.push(receiptFile)
          receiptPaths.set(expense.id, receiptFile.name)
        }
      }
      if (expense.screenshot_url) {
        const screenshotFile = createReceiptZipFile({
          id: expense.id + '-screenshot',
          expense_date: expense.expense_date,
          title: expense.title + '-消费截图',
          receipt_url: expense.screenshot_url,
        })
        if (screenshotFile) {
          receiptFiles.push(screenshotFile)
          screenshotPaths.set(expense.id, screenshotFile.name)
        }
      }
    }
    const rows = [
      ['日期', '时间', '行程', '目的地', '分类', '标题', '商户', '金额', '支付方式', '发票', '报销状态', '备注', '发票文件', '发票链接', '消费截图文件', '消费截图链接'],
      ...expensesToExport.map((expense) => [
        expense.expense_date,
        expense.expense_time || '',
        expense.trip_name || '',
        expense.destination || '',
        expense.category_name || '',
        expense.title,
        expense.merchant || '',
        expense.amount,
        expense.payment_method,
        invoiceLabelMap[expense.invoice_status] || expense.invoice_status,
        reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status,
        expense.note || '',
        receiptPaths.get(expense.id) || '',
        expense.receipt_url && !expense.receipt_url.startsWith('data:') ? expense.receipt_url : '',
        screenshotPaths.get(expense.id) || '',
        expense.screenshot_url && !expense.screenshot_url.startsWith('data:') ? expense.screenshot_url : '',
      ]),
    ]
    return {
      csv: rows.map((row) => row.map(escapeCsv).join(',')).join('\n'),
      receiptFiles: receiptFiles.filter(Boolean) as NonNullable<ReturnType<typeof createReceiptZipFile>>[],
    }
  }

  function exportCsv(tripId = '') {
    const exportExpenses = getExportExpenses(tripId)
    if (!exportExpenses.length) { setError('没有可导出的账单'); return }
    const { csv } = buildExportData(exportExpenses)
    downloadBlob(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), `记账-${safeFileName(getExportLabel(tripId))}-${todayISO()}.csv`)
  }

  function exportZip(tripId = '') {
    const exportExpenses = getExportExpenses(tripId)
    if (!exportExpenses.length) { setError('没有可导出的账单'); return }
    const { csv, receiptFiles } = buildExportData(exportExpenses)
    const csvFile = { name: 'ledger.csv', data: new TextEncoder().encode(`\ufeff${csv}`) }
    downloadBlob(createZipArchive([csvFile, ...receiptFiles]), `记账-${safeFileName(getExportLabel(tripId))}-${todayISO()}.zip`)
  }

  async function exportTripDoc(tripId: string) {
    if (!tripId) { setError('请选择要导出的行程'); return }
    const exportExpenses = getExportExpenses(tripId)
    if (!exportExpenses.length) { setError('没有可导出的账单'); return }

    setExportingDoc(true)
    setError('')
    try {
      const res = await fetch(`/api/exports/trip-doc?tripId=${encodeURIComponent(tripId)}`)
      if (!res.ok) {
        let message = `请求失败：${res.status}`
        try {
          const body = await res.json()
          message = body?.message || body?.error || message
        } catch {}
        throw new Error(message)
      }
      downloadBlob(await res.blob(), `${safeFileName(getExportLabel(tripId))}.docx`)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '导出报销文档失败'))
    } finally {
      setExportingDoc(false)
    }
  }

  // ─── 智能/语音记账 ────────────────────────────────────────
  function inferCategoryId(text: string) {
    const lower = text.toLowerCase()
    const rules = [
      { keys: ['餐', '饭', '面', '咖啡', '奶茶', '早餐', '午餐', '晚餐'], name: '餐饮' },
      { keys: ['打车', '地铁', '公交', '停车', '高速', '油费', '交通'], name: '交通' },
      { keys: ['酒店', '住宿', '宾馆', '民宿'], name: '住宿' },
      { keys: ['机票', '高铁', '火车', '飞机', '航班'], name: '机票高铁' },
      { keys: ['办公', '文具', '打印', '设备'], name: '办公采购' },
      { keys: ['流量', '电话', '网络', '话费'], name: '通讯网络' },
      { keys: ['招待', '客户', '请客'], name: '招待' },
    ]
    const matched = rules.find((rule) => rule.keys.some((key) => lower.includes(key)))
    return activeCategories.find((item) => item.name === matched?.name)?.id || activeCategories[0]?.id || ''
  }

  function parseSmartRecord(text: string) {
    const normalized = text.trim()
    const prefixed = normalized.match(/[¥￥]\s*(\d+(?:\.\d{1,2})?)/)
    const suffixed = normalized.match(/(\d+(?:\.\d{1,2})?)\s*(元|块|rmb|RMB)/)
    const allNumbers = Array.from(normalized.matchAll(/\d+(?:\.\d{1,2})?/g)).map((item) => Number(item[0]))
    const amount = Number(prefixed?.[1] || suffixed?.[1] || Math.max(0, ...allNumbers))
    const categoryId = inferCategoryId(normalized)
    const category = activeCategories.find((item) => item.id === categoryId)
    let date = todayISO()
    if (normalized.includes('昨天')) { const d = new Date(); d.setDate(d.getDate() - 1); date = d.toISOString().slice(0, 10) }
    if (normalized.includes('前天')) { const d = new Date(); d.setDate(d.getDate() - 2); date = d.toISOString().slice(0, 10) }
    const monthDay = normalized.match(/(\d{1,2})月(\d{1,2})[日号]?/)
    if (monthDay) { const year = new Date().getFullYear(); date = `${year}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}` }
    const title = normalized
      .replace(/[¥￥]?\s*\d+(?:\.\d{1,2})?\s*(元|块|rmb|RMB)?/g, '')
      .replace(/今天|昨天|前天|报销|出差|开票|发票/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    return {
      ...makeBlankForm(categoryId, form.trip_id || getPreferredTripId(trips)),
      amount: amount > 0 ? String(amount) : '',
      title: title || category?.name || '出差支出',
      expense_date: date,
      expense_time: nowTime(),
      payment_method: getDefaultPaymentMethod(),
      invoice_status: normalizeInvoiceStatus(normalized.includes('无票') ? 'none' : normalized.includes('发票') || normalized.includes('开票') ? 'received' : 'pending'),
      note: normalized,
    }
  }

  function normalizeAiDraft(parsed: AiParsedExpense, sourceText = smartText) {
    return {
      ...makeBlankForm(parsed.category_id || activeCategories[0]?.id || '', parsed.trip_id || form.trip_id || getPreferredTripId(trips)),
      ...parsed,
      amount: parsed.amount === undefined || parsed.amount === null ? '' : String(parsed.amount),
      merchant: parsed.merchant || '',
      note: parsed.note || sourceText,
      receipt_url: parsed.receipt_url || '',
      screenshot_url: parsed.screenshot_url || '',
      expense_date: parsed.expense_date || todayISO(),
      expense_time: parsed.expense_time || nowTime(),
      payment_method: normalizePaymentMethod(parsed.payment_method || ''),
      invoice_status: normalizeInvoiceStatus(parsed.invoice_status || ''),
      reimbursement_status: parsed.reimbursement_status || 'pending',
    }
  }

  async function loadSmartUsage() {
    try {
      const usage = await fetchJson<SmartAiUsage>('/api/ai/parse-expense')
      setSmartUsage(usage)
    } catch {}
  }

  async function analyzeSmartText(inputText = smartText) {
    const text = inputText.trim()
    if (!text) return
    if (smartUsage?.daily_remaining === 0) {
      setError(`今天的智能记账次数已用完（每天最多 ${smartUsage.daily_limit} 次），请明天再试。`)
      return
    }
    setAnalyzing(true)
    setError('')
    try {
      const parsed = await fetchJson<AiParsedExpense>('/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({
          text,
          today: todayISO(),
          now: nowTime(),
          categories: activeCategories.map((c) => ({ id: c.id, name: c.name })),
          trips: trips.map((t) => ({ id: t.id, name: t.name, destination: t.destination })),
          default_trip_id: form.trip_id || getPreferredTripId(trips),
        }),
      })
      const { ai_usage, ...expenseDraft } = parsed
      if (ai_usage) setSmartUsage(ai_usage)
      setSmartDraft(normalizeAiDraft(expenseDraft, text))
      setVoiceStatus('智能解析已完成，请确认账单明细')
    } catch (e: any) {
      if (smartUsage && friendlyErrorMessage(e, '').includes('次数已用完')) {
        setSmartUsage({ ...smartUsage, daily_remaining: 0 })
      }
      void loadSmartUsage()
      setSmartDraft(parseSmartRecord(text))
      setError(`${friendlyErrorMessage(e, '智能解析不可用')}，已使用本地规则兜底`)
      setVoiceStatus('智能解析暂不可用，已用本地规则生成草稿')
    } finally {
      setAnalyzing(false)
    }
  }

  async function addSmartDraft() {
    if (!smartDraft) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<Expense>('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(formToPayload(smartDraft)),
      })
      await loadData()
      toast.success('账单添加成功')
      setForm(makeAccountBlankForm(activeCategories[0]?.id || '', getPreferredTripId(trips)))
      setSmartDraft(null)
      setSmartText('')
      setSmartOpen(false)
      setActiveTab('record')
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '添加账单失败'))
    } finally {
      setSaving(false)
    }
  }

  function startVoiceTimer() {
    stopVoiceTimer()
    setRecordingSeconds(0)
    voiceTimerRef.current = window.setInterval(() => { setRecordingSeconds((v) => v + 1) }, 1000)
  }

  function stopVoiceTimer() {
    if (!voiceTimerRef.current) return
    window.clearInterval(voiceTimerRef.current)
    voiceTimerRef.current = null
  }

  function stopBrowserRecognition() {
    const recognition = speechRecognitionRef.current
    if (!recognition) return
    speechRecognitionRef.current = null
    try {
      recognition.onend = null
      recognition.onerror = null
      recognition.onresult = null
      recognition.stop()
    } catch {}
  }

  function discardVoiceSession() {
    stopBrowserRecognition()
    stopVoiceTimer()
    setListening(false)
  }

  function closeSmartDialog() {
    discardVoiceSession()
    setSmartOpen(false)
  }

  function openTextSmartDialog() {
    discardVoiceSession()
    setSmartMode('text')
    setVoiceStatus('点击语音输入后会自动开始识别')
    setSmartOpen(true)
    void loadSmartUsage()
  }

  function startBrowserRecognition() {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) return false
    const recognition = new Recognition()
    speechRecognitionRef.current = recognition
    recognition.lang = 'zh-CN'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      setSmartDraft(null)
      setListening(true)
      startVoiceTimer()
      setVoiceStatus('浏览器实时识别已启动')
    }
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join('')
        .trim()
      if (!transcript) return
      voiceRecognizedTextRef.current = transcript
      setSmartText(transcript)
      setSmartDraft(null)
      setVoiceStatus('已识别到文字，讲完后点完成解析')
    }
    recognition.onerror = () => {
      setListening(false)
      stopVoiceTimer()
      setVoiceStatus('浏览器实时识别不可用，可以直接修改下方文字后解析')
    }
    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition) speechRecognitionRef.current = null
      setListening(false)
      stopVoiceTimer()
    }
    try { recognition.start(); return true } catch { speechRecognitionRef.current = null; return false }
  }

  async function startSpeech() {
    discardVoiceSession()
    setSmartMode('voice')
    setSmartOpen(true)
    void loadSmartUsage()
    setSmartDraft(null)
    setError('')
    setVoiceStatus('正在请求浏览器语音识别权限...')
    voiceSessionStartTextRef.current = smartText
    voiceRecognizedTextRef.current = ''
    voiceManualEditedRef.current = false
    const speechStarted = startBrowserRecognition()
    if (!speechStarted) setVoiceStatus('当前浏览器不支持实时语音识别，可以直接在下方输入文字后解析')
  }

  function startInlineSpeech() {
    discardVoiceSession()
    setSmartMode('text')
    setSmartOpen(true)
    void loadSmartUsage()
    setSmartDraft(null)
    setError('')
    setVoiceStatus('正在请求浏览器语音识别权限...')
    voiceSessionStartTextRef.current = smartText
    voiceRecognizedTextRef.current = ''
    voiceManualEditedRef.current = false
    const speechStarted = startBrowserRecognition()
    if (!speechStarted) setVoiceStatus('当前浏览器不支持实时语音识别，可以直接输入文字后解析')
  }

  function stopInlineSpeech() {
    stopBrowserRecognition()
    stopVoiceTimer()
    setListening(false)
    setVoiceStatus(smartText.trim() ? '语音输入已填入，可以继续修改或解析' : '没有识别到内容，可以再试一次')
  }

  async function completeVoiceAndAnalyze() {
    setAnalyzing(true)
    setVoiceStatus('正在结束识别...')
    stopBrowserRecognition()
    stopVoiceTimer()
    setListening(false)
    try {
      const transcript = smartText.trim()
      if (!transcript) { setVoiceStatus('没有识别到内容，可以直接在下方输入后解析'); return }
      const hasNewVoiceText = Boolean(voiceRecognizedTextRef.current.trim())
      const hasManualEdit = voiceManualEditedRef.current
      const isOriginalText = transcript === voiceSessionStartTextRef.current.trim()
      if (!hasNewVoiceText && !hasManualEdit && isOriginalText) {
        setVoiceStatus('没有识别到新的内容，已保留原文本，可以手动修改后解析')
        return
      }
      setVoiceStatus('正在智能解析账单...')
      await analyzeSmartText(transcript)
    } catch (e: any) {
      setError(friendlyErrorMessage(e, '语音解析失败'))
      setVoiceStatus('语音解析失败，可以再试一次或切到文字输入')
    } finally {
      setAnalyzing(false)
    }
  }

  const currentStatsMonthKey = toMonthKey(new Date())
  const statsIsCurrentMonth = statsSelectedMonth >= currentStatsMonthKey

  function prevStatsMonth() {
    const date = parseMonthKey(statsSelectedMonth)
    date.setMonth(date.getMonth() - 1)
    setStatsSelectedMonth(toMonthKey(date))
  }

  function nextStatsMonth() {
    if (statsIsCurrentMonth) return
    const date = parseMonthKey(statsSelectedMonth)
    date.setMonth(date.getMonth() + 1)
    setStatsSelectedMonth(toMonthKey(date))
  }

  // ─── 渲染 ─────────────────────────────────────────────────
  const manualForm = (
    <ManualExpenseForm
      activeCategories={activeCategories}
      trips={trips}
      paymentMethods={activePaymentMethods}
      invoiceStatuses={activeInvoiceStatuses}
      form={form}
      saving={saving}
      formId="manual-entry-form"
      onPatchForm={patchForm}
      onSaveExpense={saveExpense}
      onResetForm={resetFormWithPreferredTrip}
    />
  )

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f6f5] dark:bg-[#070a12]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={() => { setActiveTab('record'); loadData() }} />
  }

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-[#f6f7f4] pt-[env(safe-area-inset-top)] text-[#161a17] dark:bg-[#070a12] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#fffdf8_0%,#f3f6f1_48%,#eef3f8_100%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(91,140,255,0.18),transparent_28%),linear-gradient(145deg,#070a12_0%,#0b1020_55%,#070a12_100%)]" />
      <div className="relative mx-auto grid min-h-0 w-full max-w-[1560px] flex-1 grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_390px] xl:grid-cols-[270px_minmax(0,1fr)_440px] 2xl:grid-cols-[270px_minmax(0,1fr)_480px]">
        <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} totals={totals} />

        <div className="flex min-h-0 min-w-0 flex-col">
          <MoneyTopBar
            activeTab={activeTab}
            username={user?.username}
            loading={loading}
            batchSelecting={batchSelecting}
            statsMonthLabel={formatStatsMonthLabel(statsSelectedMonth)}
            statsNextDisabled={statsIsCurrentMonth}
            onReload={loadData}
            onToggleBatchSelecting={() => (batchSelecting ? exitBatchSelection() : setBatchSelecting(true))}
            onStatsPrevMonth={prevStatsMonth}
            onStatsNextMonth={nextStatsMonth}
          />

          <section className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[calc(6.25rem+env(safe-area-inset-bottom))] custom-scrollbar lg:pb-8">
            {activeTab === 'record' ? (
              <RecordPage
                totals={totals}
                todayExpenses={todayExpenses}
                manualForm={manualForm}
                analyzing={analyzing}
                invoiceLabelMap={invoiceLabelMap}
                onManualRecord={focusManualForm}
                onOpenTextSmartDialog={openTextSmartDialog}
                onGoHistory={() => setActiveTab('history')}
                onEditExpense={editExpense}
                onDeleteExpense={deleteExpense}
                onQuickStatus={quickStatus}
              />
            ) : null}

            {activeTab === 'stats' ? (
              <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-7">
                <StatsPage
                  expenses={expenses}
                  activeCategories={activeCategories}
                  trips={trips}
                  selectedMonth={statsSelectedMonth}
                />
              </div>
            ) : null}

            {activeTab === 'history' ? (
              <HistoryView
                groupedExpenses={groupedExpenses}
                filteredExpenses={filteredExpenses}
                search={search}
                historyFilter={historyFilter}
                batchSelecting={batchSelecting}
                selectedExpenseIdSet={selectedExpenseIdSet}
                selectedExpenses={selectedExpenses}
                selectedExpenseTotal={selectedExpenseTotal}
                allFilteredExpensesSelected={allFilteredExpensesSelected}
                saving={saving}
                invoiceLabelMap={invoiceLabelMap}
                onSearchChange={setSearch}
                onFilterChange={setHistoryFilter}
                onToggleFilteredExpenseSelection={toggleFilteredExpenseSelection}
                onToggleExpenseSelection={toggleExpenseSelection}
                onRequestBatchUpdate={requestBatchUpdateReimbursementStatus}
                onEditExpense={editExpense}
                onDeleteExpense={deleteExpense}
              />
            ) : null}

            {activeTab === 'settings' ? (
              <div className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-7">
                <SettingsView
                  user={user}
                  isDark={isDark}
                  settingsPanel={settingsPanel}
                  activeCategories={activeCategories}
                  trips={trips}
                  exportTrips={exportTrips}
                  activePaymentMethods={activePaymentMethods}
                  activeInvoiceStatuses={activeInvoiceStatuses}
                  archivedItemCount={archivedItemCount}
                  adminUsers={adminUsers}
                  exportingDoc={exportingDoc}
                  onSetSettingsPanel={setSettingsPanel}
                  onToggleTheme={(dark) => setTheme(dark ? 'dark' : 'light')}
                  onClearHistory={clearHistory}
                  onExportTripDoc={exportTripDoc}
                  onLogout={handleLogout}
                  onOpenUserPanel={() => {
                    setSettingsPanel('profile')
                    setOldPassword('')
                    setNewPassword('')
                    setConfirmPassword('')
                    setPwdError('')
                    setPwdSuccess('')
                    setShowOldPassword(false)
                    setShowNewPassword(false)
                    setShowConfirmPassword(false)
                  }}
                  onOpenUsersPanel={() => { setSettingsPanel('users'); fetchAdminUsers() }}
                />
              </div>
            ) : null}
          </section>
        </div>

        <aside className="hidden h-full overflow-y-auto border-l border-slate-200/80 bg-white/90 px-5 py-7 custom-scrollbar dark:border-white/10 dark:bg-white/[0.035] xl:px-6 lg:block">
          <ManualExpenseForm
            activeCategories={activeCategories}
            trips={trips}
            paymentMethods={activePaymentMethods}
            invoiceStatuses={activeInvoiceStatuses}
            form={form}
            saving={saving}
            compact
            onPatchForm={patchForm}
            onSaveExpense={saveExpense}
            onResetForm={resetFormWithPreferredTrip}
          />
        </aside>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <ExpenseFormSheet
        open={Boolean(editingExpenseForm)}
        onOpenChange={(open) => {
          if (!open) setEditingExpenseForm(null)
        }}
      >
        {editingExpenseForm ? (
          <ManualExpenseForm
            activeCategories={activeCategories}
            trips={trips}
            paymentMethods={activePaymentMethods}
            invoiceStatuses={activeInvoiceStatuses}
            form={editingExpenseForm}
            saving={saving}
            formId="edit-expense-form"
            showHeader={false}
            className="border-0 bg-transparent p-0 shadow-none backdrop-blur-none dark:bg-transparent lg:p-0"
            onPatchForm={patchEditingExpenseForm}
            onSaveExpense={saveEditedExpense}
            onResetForm={() => setEditingExpenseForm(null)}
          />
        ) : null}
      </ExpenseFormSheet>

      <SettingsPanelDrawer
        settingsPanel={settingsPanel}
        user={user}
        saving={saving}
        expenses={expenses}
        activeCategories={activeCategories}
        archivedCategories={archivedCategories}
        categoryForm={categoryForm}
        onCategoryFormChange={setCategoryForm}
        onSaveCategory={saveCategory}
        onDisableCategory={disableCategory}
        onDeleteArchivedCategory={deleteArchivedCategory}
        trips={trips}
        archivedTrips={archivedTrips}
        tripForm={tripForm}
        editingTripId={editingTripId}
        onTripFormChange={setTripForm}
        onSaveTrip={saveTrip}
        onBeginEditTrip={beginEditTrip}
        onCancelEditTrip={cancelEditTrip}
        onArchiveTrip={archiveTrip}
        onDeleteArchivedTrip={deleteArchivedTrip}
        accountPaymentMethods={accountPaymentMethods}
        activePaymentMethods={activePaymentMethods}
        paymentMethodForm={paymentMethodForm}
        editingPaymentMethodId={editingPaymentMethodId}
        onPaymentMethodFormChange={setPaymentMethodForm}
        onSavePaymentMethod={savePaymentMethod}
        onBeginEditPaymentMethod={beginEditPaymentMethod}
        onCancelEditPaymentMethod={cancelEditPaymentMethod}
        onDeletePaymentMethod={deletePaymentMethod}
        accountInvoiceStatuses={accountInvoiceStatuses}
        activeInvoiceStatuses={activeInvoiceStatuses}
        invoiceStatusForm={invoiceStatusForm}
        editingInvoiceStatusId={editingInvoiceStatusId}
        onInvoiceStatusFormChange={setInvoiceStatusForm}
        onSaveInvoiceStatus={saveInvoiceStatus}
        onBeginEditInvoiceStatus={beginEditInvoiceStatus}
        onCancelEditInvoiceStatus={cancelEditInvoiceStatus}
        onDeleteInvoiceStatus={deleteInvoiceStatus}
        oldPassword={oldPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        pwdLoading={pwdLoading}
        pwdError={pwdError}
        pwdSuccess={pwdSuccess}
        showOldPassword={showOldPassword}
        showNewPassword={showNewPassword}
        showConfirmPassword={showConfirmPassword}
        onOldPasswordChange={setOldPassword}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onToggleShowOldPassword={() => setShowOldPassword((v) => !v)}
        onToggleShowNewPassword={() => setShowNewPassword((v) => !v)}
        onToggleShowConfirmPassword={() => setShowConfirmPassword((v) => !v)}
        onPasswordChange={handlePasswordChange}
        adminUsers={adminUsers}
        adminUsersLoading={adminUsersLoading}
        adminResetUserId={adminResetUserId}
        adminNewPassword={adminNewPassword}
        adminResetError={adminResetError}
        adminResetSuccess={adminResetSuccess}
        adminResetLoading={adminResetLoading}
        showAdminResetPassword={showAdminResetPassword}
        onSetAdminResetUserId={setAdminResetUserId}
        onAdminNewPasswordChange={setAdminNewPassword}
        onToggleShowAdminResetPassword={() => setShowAdminResetPassword((v) => !v)}
        onAdminResetPassword={handleAdminResetPassword}
        onAdminDeleteUser={handleAdminDeleteUser}
        onClose={() => setSettingsPanel(null)}
      />

      <ConfirmActionDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title || ''}
        description={confirmAction?.description || ''}
        confirmLabel={confirmAction?.confirmLabel || '确认'}
        tone={confirmAction?.tone}
        pending={confirmActionPending}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null)
        }}
        onConfirm={() => {
          void executeConfirmAction()
        }}
      />

      <BatchConfirmDialog
        batchConfirmStatus={batchConfirmStatus}
        selectedExpenses={selectedExpenses}
        selectedExpenseTotal={selectedExpenseTotal}
        saving={saving}
        onCancel={() => setBatchConfirmStatus(null)}
        onConfirm={confirmBatchUpdateReimbursementStatus}
      />

      <SmartDialog
        smartOpen={smartOpen}
        smartMode={smartMode}
        smartText={smartText}
        smartDraft={smartDraft}
        smartUsage={smartUsage}
        listening={listening}
        analyzing={analyzing}
        saving={saving}
        recordingSeconds={recordingSeconds}
        voiceStatus={voiceStatus}
        activeCategories={activeCategories}
        trips={trips}
        activeInvoiceStatuses={activeInvoiceStatuses}
        invoiceLabelMap={invoiceLabelMap}
        onClose={closeSmartDialog}
        onSmartTextChange={(text) => {
          setSmartText(text)
          setSmartDraft(null)
        }}
        onDiscardVoiceSession={discardVoiceSession}
        onStartInlineSpeech={startInlineSpeech}
        onStopInlineSpeech={stopInlineSpeech}
        onStartSpeech={startSpeech}
        onCompleteVoiceAndAnalyze={completeVoiceAndAnalyze}
        onAnalyzeSmartText={() => { discardVoiceSession(); void analyzeSmartText() }}
        onPatchSmartDraft={patchSmartDraft}
        onAddSmartDraft={addSmartDraft}
      />
    </main>
  )
}
