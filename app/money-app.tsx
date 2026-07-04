"use client"

import type { ComponentType, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Archive,
  BarChart3,
  Briefcase,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Hotel,
  Info,
  Loader2,
  MapPin,
  Mic,
  Moon,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Receipt,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  Utensils,
  UserRound,
  Wallet,
  Wifi,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type TabKey = 'record' | 'stats' | 'history' | 'settings'

type Category = {
  id: string
  name: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

type Trip = {
  id: string
  name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  budget: number
  status: string
}

type Expense = {
  id: string
  trip_id: string | null
  category_id: string | null
  amount: number
  currency: string
  title: string
  merchant: string | null
  expense_date: string
  expense_time: string | null
  payment_method: string
  invoice_status: string
  reimbursement_status: string
  reimbursable: boolean
  note: string | null
  receipt_url: string | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
  trip_name: string | null
  destination: string | null
}

type BootstrapData = {
  categories: Category[]
  trips: Trip[]
  expenses: Expense[]
}

type ExpenseFormState = {
  id?: string
  trip_id: string
  category_id: string
  amount: string
  title: string
  merchant: string
  expense_date: string
  expense_time: string
  payment_method: string
  invoice_status: string
  reimbursement_status: string
  reimbursable: boolean
  note: string
  receipt_url: string
}

type AiParsedExpense = Omit<Partial<ExpenseFormState>, 'amount'> & {
  amount?: string | number
  source?: string
}

type SmartMode = 'text' | 'voice'

type CategoryFormState = {
  name: string
  icon: string
  color: string
}

type TripFormState = {
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: string
}

const iconMap = {
  utensils: Utensils,
  car: Car,
  hotel: Hotel,
  plane: Plane,
  briefcase: Briefcase,
  wifi: Wifi,
  receipt: Receipt,
  more: MoreHorizontal,
}

const tabs = [
  { key: 'record' as const, label: '记录', icon: ClipboardList },
  { key: 'stats' as const, label: '统计', icon: BarChart3 },
  { key: 'history' as const, label: '历史', icon: Clock3 },
  { key: 'settings' as const, label: '设置', icon: Settings },
]

const invoiceLabels: Record<string, string> = {
  pending: '待开票',
  received: '已开票',
  none: '无发票',
}

const reimbursementLabels: Record<string, string> = {
  pending: '待报销',
  reimbursed: '已报销',
}

const paymentMethods = ['个人垫付', '公司卡', '微信', '支付宝', '银行卡', '现金']
const invoiceOptions = ['pending', 'received', 'none']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5)
}

function makeBlankForm(categoryId = '', tripId = ''): ExpenseFormState {
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

function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value || 0)
  return `¥ ${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatVoiceTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

function formatMonthDay(dateString = todayISO()) {
  const date = new Date(`${dateString}T00:00:00`)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatMoneyCompact(value: number | string | null | undefined, digits = 0) {
  const amount = Number(value || 0)
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

function getCategoryIcon(icon?: string | null) {
  return iconMap[(icon || 'more') as keyof typeof iconMap] || MoreHorizontal
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
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
      message = body?.message || message
    } catch {}
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

function expenseToPayload(expense: Expense) {
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

function formToPayload(form: ExpenseFormState) {
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

function escapeCsv(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function MoneyApp() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [activeTab, setActiveTab] = useState<TabKey>('record')
  const [categories, setCategories] = useState<Category[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<ExpenseFormState>(makeBlankForm())
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', icon: 'more', color: '#94a3b8' })
  const [tripForm, setTripForm] = useState<TripFormState>({ name: '', destination: '', start_date: todayISO(), end_date: todayISO(), budget: '' })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [smartOpen, setSmartOpen] = useState(false)
  const [smartMode, setSmartMode] = useState<SmartMode>('text')
  const [smartText, setSmartText] = useState('')
  const [smartDraft, setSmartDraft] = useState<ExpenseFormState | null>(null)
  const [listening, setListening] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState('点击语音输入后会自动开始识别')
  const speechRecognitionRef = useRef<any>(null)
  const voiceTimerRef = useRef<number | null>(null)
  const voiceSessionStartTextRef = useRef('')
  const voiceRecognizedTextRef = useRef('')
  const voiceManualEditedRef = useRef(false)

  const activeCategories = useMemo(() => categories.filter((item) => item.is_active), [categories])

  const totals = useMemo(() => {
    const currentDate = todayISO()
    const monthKey = currentDate.slice(0, 7)
    const summary = {
      total: 0,
      month: 0,
      today: 0,
      reimbursable: 0,
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
      if (expense.reimbursable) summary.reimbursable += amount
      if (expense.expense_date?.startsWith(monthKey) && expense.reimbursement_status === 'pending') summary.pendingReimbursement += amount
      if (expense.expense_date?.startsWith(monthKey) && expense.reimbursement_status === 'reimbursed') summary.reimbursed += amount
    }
    return summary
  }, [expenses])

  const todayExpenses = useMemo(() => expenses.filter((item) => item.expense_date === todayISO()), [expenses])
  const currentTrip = useMemo(() => trips.find((trip) => trip.id === form.trip_id) || trips[0], [form.trip_id, trips])
  const homeTripLabel = currentTrip?.name || currentTrip?.destination || '出差记账'

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return expenses
    return expenses.filter((expense) => {
      const hay = [
        expense.title,
        expense.merchant,
        expense.category_name,
        expense.trip_name,
        expense.destination,
        expense.note,
        expense.amount,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [expenses, search])

  const groupedExpenses = useMemo(() => {
    const groups = new Map<string, Expense[]>()
    for (const expense of filteredExpenses) {
      const list = groups.get(expense.expense_date) || []
      list.push(expense)
      groups.set(expense.expense_date, list)
    }
    return Array.from(groups.entries())
  }, [filteredExpenses])

  const stats = useMemo(() => {
    const monthKey = todayISO().slice(0, 7)
    const monthExpenses = expenses.filter((item) => item.expense_date?.startsWith(monthKey))
    const categoryTotals = activeCategories
      .map((category) => ({
        category,
        amount: monthExpenses
          .filter((expense) => expense.category_id === category.id)
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    const weekly = [0, 0, 0, 0, 0]
    for (const expense of monthExpenses) {
      const day = Number(expense.expense_date.slice(-2))
      const index = Math.min(4, Math.max(0, Math.ceil(day / 7) - 1))
      weekly[index] += Number(expense.amount || 0)
    }

    const tripTotals = trips
      .map((trip) => ({
        trip,
        amount: expenses
          .filter((expense) => expense.trip_id === trip.id)
          .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)

    return { categoryTotals, weekly, tripTotals, maxWeek: Math.max(1, ...weekly) }
  }, [activeCategories, expenses, trips])

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    return () => {
      stopVoiceTimer()
      stopBrowserRecognition()
    }
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchJson<BootstrapData>('/api/bootstrap')
      setCategories(data.categories)
      setTrips(data.trips)
      setExpenses(data.expenses)
      setForm((current) => ({
        ...current,
        category_id: current.category_id || data.categories.find((item) => item.is_active)?.id || '',
        trip_id: current.trip_id || data.trips[0]?.id || '',
      }))
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  function patchForm(patch: Partial<ExpenseFormState>) {
    setForm((current) => ({ ...current, ...patch }))
  }

  function patchSmartDraft(patch: Partial<ExpenseFormState>) {
    setSmartDraft((current) => (current ? { ...current, ...patch } : current))
  }

  async function saveExpense(event?: FormEvent) {
    event?.preventDefault()
    setSaving(true)
    setError('')
    try {
      const endpoint = form.id ? `/api/expenses/${form.id}` : '/api/expenses'
      await fetchJson<Expense>(endpoint, {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify(formToPayload(form)),
      })
      await loadData()
      setForm(makeBlankForm(activeCategories[0]?.id || '', trips[0]?.id || ''))
      setSmartDraft(null)
      setSmartText('')
      setSmartOpen(false)
    } catch (e: any) {
      setError(e.message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  function editExpense(expense: Expense) {
    setForm({
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
      reimbursable: expense.reimbursable,
      note: expense.note || '',
      receipt_url: expense.receipt_url || '',
    })
    setActiveTab('record')
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`删除「${expense.title}」这笔账单？`)) return
    setError('')
    try {
      await fetchJson(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      setExpenses((current) => current.filter((item) => item.id !== expense.id))
    } catch (e: any) {
      setError(e.message || '删除失败')
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
      setError(e.message || '更新状态失败')
    }
  }

  async function saveCategory(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await fetchJson<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(categoryForm),
      })
      setCategoryForm({ name: '', icon: 'more', color: '#94a3b8' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '保存分类失败')
    }
  }

  async function disableCategory(category: Category) {
    if (!window.confirm(`停用「${category.name}」分类？已有账单会保留。`)) return
    setError('')
    try {
      await fetchJson(`/api/categories/${category.id}`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '停用分类失败')
    }
  }

  async function saveTrip(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await fetchJson<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify(tripForm),
      })
      setTripForm({ name: '', destination: '', start_date: todayISO(), end_date: todayISO(), budget: '' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '保存行程失败')
    }
  }

  async function archiveTrip(trip: Trip) {
    if (!window.confirm(`归档「${trip.name}」行程？已有账单会保留。`)) return
    setError('')
    try {
      await fetchJson(`/api/trips/${trip.id}`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '归档行程失败')
    }
  }

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

    if (normalized.includes('昨天')) {
      const d = new Date()
      d.setDate(d.getDate() - 1)
      date = d.toISOString().slice(0, 10)
    }
    if (normalized.includes('前天')) {
      const d = new Date()
      d.setDate(d.getDate() - 2)
      date = d.toISOString().slice(0, 10)
    }
    const monthDay = normalized.match(/(\d{1,2})月(\d{1,2})[日号]?/)
    if (monthDay) {
      const year = new Date().getFullYear()
      date = `${year}-${monthDay[1].padStart(2, '0')}-${monthDay[2].padStart(2, '0')}`
    }

    const title = normalized
      .replace(/[¥￥]?\s*\d+(?:\.\d{1,2})?\s*(元|块|rmb|RMB)?/g, '')
      .replace(/今天|昨天|前天|报销|出差|开票|发票/g, '')
      .replace(/\s+/g, ' ')
      .trim()

    return {
      ...makeBlankForm(categoryId, form.trip_id || trips[0]?.id || ''),
      amount: amount > 0 ? String(amount) : '',
      title: title || category?.name || '出差支出',
      expense_date: date,
      expense_time: nowTime(),
      invoice_status: normalized.includes('无票') ? 'none' : normalized.includes('发票') || normalized.includes('开票') ? 'received' : 'pending',
      note: normalized,
    }
  }

  function startVoiceTimer() {
    stopVoiceTimer()
    setRecordingSeconds(0)
    voiceTimerRef.current = window.setInterval(() => {
      setRecordingSeconds((value) => value + 1)
    }, 1000)
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
  }

  function normalizeAiDraft(parsed: AiParsedExpense, sourceText = smartText) {
    return {
      ...makeBlankForm(parsed.category_id || activeCategories[0]?.id || '', parsed.trip_id || form.trip_id || trips[0]?.id || ''),
      ...parsed,
      amount: parsed.amount === undefined || parsed.amount === null ? '' : String(parsed.amount),
      merchant: parsed.merchant || '',
      note: parsed.note || sourceText,
      receipt_url: parsed.receipt_url || '',
      expense_date: parsed.expense_date || todayISO(),
      expense_time: parsed.expense_time || nowTime(),
      payment_method: parsed.payment_method || '个人垫付',
      invoice_status: parsed.invoice_status || 'pending',
      reimbursement_status: parsed.reimbursement_status || 'pending',
      reimbursable: parsed.reimbursable !== false,
    }
  }

  async function analyzeSmartText(inputText = smartText) {
    const text = inputText.trim()
    if (!text) return
    setAnalyzing(true)
    setError('')
    try {
      const parsed = await fetchJson<AiParsedExpense>('/api/ai/parse-expense', {
        method: 'POST',
        body: JSON.stringify({
          text,
          today: todayISO(),
          now: nowTime(),
          categories: activeCategories.map((category) => ({ id: category.id, name: category.name })),
          trips: trips.map((trip) => ({ id: trip.id, name: trip.name, destination: trip.destination })),
          default_trip_id: form.trip_id || trips[0]?.id || '',
        }),
      })
      setSmartDraft(normalizeAiDraft(parsed, text))
      setVoiceStatus('AI 已解析完成，请确认账单明细')
    } catch (e: any) {
      setSmartDraft(parseSmartRecord(text))
      setError(`${e.message || 'AI 解析不可用'}，已使用本地规则兜底`)
      setVoiceStatus('AI 暂不可用，已用本地规则生成草稿')
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
      setForm(makeBlankForm(activeCategories[0]?.id || '', trips[0]?.id || ''))
      setSmartDraft(null)
      setSmartText('')
      setSmartOpen(false)
      setActiveTab('record')
    } catch (e: any) {
      setError(e.message || '添加账单失败')
    } finally {
      setSaving(false)
    }
  }

  async function completeVoiceAndAnalyze() {
    setAnalyzing(true)
    setVoiceStatus('正在结束识别...')
    stopBrowserRecognition()
    stopVoiceTimer()
    setListening(false)

    try {
      const transcript = smartText.trim()
      if (!transcript) {
        setVoiceStatus('没有识别到内容，可以直接在下方输入后解析')
        return
      }
      const hasNewVoiceText = Boolean(voiceRecognizedTextRef.current.trim())
      const hasManualEdit = voiceManualEditedRef.current
      const isOriginalText = transcript === voiceSessionStartTextRef.current.trim()
      if (!hasNewVoiceText && !hasManualEdit && isOriginalText) {
        setVoiceStatus('没有识别到新的内容，已保留原文本，可以手动修改后解析')
        return
      }
      setVoiceStatus('正在让 AI 解析账单...')
      await analyzeSmartText(transcript)
    } catch (e: any) {
      setError(e.message || '语音解析失败')
      setVoiceStatus('语音解析失败，可以再试一次或切到文字输入')
    } finally {
      setAnalyzing(false)
    }
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
    try {
      recognition.start()
      return true
    } catch {
      speechRecognitionRef.current = null
      return false
    }
  }

  async function startSpeech() {
    discardVoiceSession()
    setSmartMode('voice')
    setSmartOpen(true)
    setSmartDraft(null)
    setError('')
    setVoiceStatus('正在请求浏览器语音识别权限...')
    voiceSessionStartTextRef.current = smartText
    voiceRecognizedTextRef.current = ''
    voiceManualEditedRef.current = false

    const speechStarted = startBrowserRecognition()
    if (!speechStarted) setVoiceStatus('当前浏览器不支持实时语音识别，可以直接在下方输入文字后解析')
  }

  function exportCsv() {
    const rows = [
      ['日期', '时间', '行程', '目的地', '分类', '标题', '商户', '金额', '支付方式', '发票', '报销状态', '备注'],
      ...filteredExpenses.map((expense) => [
        expense.expense_date,
        expense.expense_time || '',
        expense.trip_name || '',
        expense.destination || '',
        expense.category_name || '',
        expense.title,
        expense.merchant || '',
        expense.amount,
        expense.payment_method,
        invoiceLabels[expense.invoice_status] || expense.invoice_status,
        reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status,
        expense.note || '',
      ]),
    ]
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `myMoney-${todayISO()}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f5f6f5] text-[#1a1a1a] dark:bg-[#070a12] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f5f6f5_100%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(91,140,255,0.18),transparent_28%),linear-gradient(145deg,#070a12_0%,#0b1020_55%,#070a12_100%)]" />
      <div className="relative mx-auto grid h-full min-h-0 max-w-[1440px] grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_390px]">
        <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} totals={totals} />

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(env(safe-area-inset-top),1rem)] custom-scrollbar sm:px-6 lg:h-full lg:px-8 lg:pb-8 lg:pt-7">
          <TopBar
            loading={loading}
            dateLabel={formatMonthDay()}
            tripLabel={homeTripLabel}
            isDark={isDark}
            onReload={loadData}
            onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
          />
          {error ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              <span>{error}</span>
              <button className="rounded-md p-1 hover:bg-red-100 dark:hover:bg-white/10" onClick={() => setError('')} aria-label="关闭错误">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {activeTab === 'record' ? RecordView() : null}
          {activeTab === 'stats' ? StatsView() : null}
          {activeTab === 'history' ? HistoryView() : null}
          {activeTab === 'settings' ? SettingsView() : null}
        </section>

        <aside className="hidden h-full overflow-y-auto border-l border-slate-200/80 bg-white/90 px-5 py-7 custom-scrollbar dark:border-white/10 dark:bg-white/[0.035] lg:block">
          {ManualForm({ compact: true })}
        </aside>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {SmartDialog()}
    </main>
  )

  function RecordView() {
    return (
      <div className="mx-auto mt-2 max-w-3xl space-y-3 sm:mt-4 sm:space-y-3.5">
        <h2 className="text-[1.55rem] font-black tracking-tight text-black dark:text-white lg:text-[1.75rem]">今天记一笔</h2>
        {SummaryCard()}
        <div className="block lg:hidden">
          {ManualForm({})}
        </div>
        {SmartInlineBar()}
        {TodayList()}
      </div>
    )
  }

  function SummaryCard() {
    return (
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-none">
        <div className="grid grid-cols-[1.55fr_0.9fr_0.9fr]">
          <div className="px-4 py-3.5 lg:px-7 lg:py-5">
            <p className="text-[0.88rem] font-semibold text-[#1e2521] dark:text-slate-200 lg:text-lg">本月可报销</p>
            <div className="mt-2 text-[1.8rem] font-black tracking-normal text-black dark:text-white lg:text-[2.5rem]">{formatMoney(totals.pendingReimbursement)}</div>
          </div>
          <div className="border-l border-dashed border-slate-200 px-3 py-3.5 dark:border-white/15 lg:px-6 lg:py-5">
            <div className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#1e2521] dark:text-slate-200 lg:text-base">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              待报销
            </div>
            <p className="mt-3 text-lg font-black text-amber-600 lg:mt-4 lg:text-xl">{formatMoneyCompact(totals.pendingReimbursement)}</p>
          </div>
          <div className="border-l border-dashed border-slate-200 px-3 py-3.5 dark:border-white/15 lg:px-6 lg:py-5">
            <div className="flex items-center gap-1.5 text-[0.82rem] font-semibold text-[#1e2521] dark:text-slate-200 lg:text-base">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
              已报销
            </div>
            <p className="mt-3 text-lg font-black text-emerald-700 dark:text-emerald-300 lg:mt-4 lg:text-xl">{formatMoneyCompact(totals.reimbursed)}</p>
          </div>
        </div>
      </section>
    )
  }

  function SmartInlineBar() {
    return (
      <section className="flex items-center gap-2.5 rounded-xl border border-emerald-200/50 bg-gradient-to-r from-emerald-50/70 via-cyan-50/50 to-teal-50/40 px-3 py-2.5 shadow-sm dark:border-cyan-300/20 dark:from-cyan-950/30 dark:via-cyan-950/20 dark:to-transparent lg:px-4 lg:py-3">
        <Sparkles className="h-5 w-5 shrink-0 text-teal-600 dark:text-cyan-200" />
        <button className="shrink-0 text-[0.9rem] font-bold text-slate-800 dark:text-cyan-100 lg:text-[0.95rem]" onClick={openTextSmartDialog}>
          智能识别
        </button>
        <div className="h-5 w-px bg-slate-300/50 dark:bg-cyan-300/20 lg:h-6" />
        <p className={cn('min-w-0 flex-1 truncate text-sm lg:text-sm', smartText ? 'text-slate-700 dark:text-slate-100' : 'text-slate-400 dark:text-slate-400')}>
          {smartText || '今天打车花了78'}
        </p>
        <button
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-cyan-300/40 dark:bg-transparent dark:text-cyan-100 dark:hover:bg-cyan-300/10 lg:h-8 lg:w-8"
          onClick={startSpeech}
          disabled={analyzing}
          aria-label="语音输入"
          title="语音输入"
        >
          <Mic className={cn('h-3.5 w-3.5 lg:h-4 lg:w-4', listening && 'text-emerald-600 dark:text-emerald-300')} />
        </button>
        <button
          className="inline-flex h-7 shrink-0 items-center justify-center rounded-lg border border-teal-600/60 bg-white px-3 text-sm font-bold text-teal-700 shadow-sm transition hover:bg-teal-50 disabled:opacity-50 dark:border-cyan-300/50 dark:bg-transparent dark:text-cyan-100 dark:hover:bg-cyan-300/10 lg:h-8 lg:px-4"
          onClick={() => analyzeSmartText()}
          disabled={analyzing || !smartText.trim()}
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : '解析'}
        </button>
      </section>
    )
  }

  function TodayList() {
    const previewExpenses = todayExpenses.slice(0, 2)
    return (
      <section className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none lg:p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-black dark:text-white lg:text-xl">今天</h2>
          <p className="text-sm font-semibold text-slate-500 lg:text-base">{totals.countToday} 笔 · {formatMoney(totals.today)}</p>
        </div>
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200/80 dark:border-white/10 lg:mt-4">
          {todayExpenses.length ? (
            <>
              {previewExpenses.map((expense, index) => (
                <div key={expense.id} className={cn(index > 0 && 'border-t border-slate-200/80 dark:border-white/10')}>
                  <ExpenseRow expense={expense} compact />
                </div>
              ))}
              <button className="flex h-10 w-full items-center justify-center gap-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5 lg:h-12 lg:text-sm" onClick={() => setActiveTab('history')}>
                查看全部记录
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : (
            <EmptyState icon={Receipt} title="今天还没有记录" detail="添加一笔餐饮、交通或住宿支出，后面报销更省心。" />
          )}
        </div>
      </section>
    )
  }

  function StatsView() {
    return (
      <div className="mt-5 space-y-4">
        <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">统计</h2>
              <p className="mt-1 text-sm text-slate-400">本月支出 · 按周和分类汇总</p>
            </div>
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-right dark:bg-white/10">
              <p className="text-xs text-slate-400">合计</p>
              <p className="font-bold">{formatMoney(totals.month)}</p>
            </div>
          </div>
          <div className="mt-6 grid h-52 grid-cols-5 items-end gap-4 rounded-lg bg-slate-50 px-4 py-5 dark:bg-black/20">
            {stats.weekly.map((amount, index) => (
              <div key={index} className="flex h-full flex-col justify-end gap-2">
                <div className="text-center text-xs text-slate-400">{formatMoney(amount).replace('¥ ', '¥')}</div>
                <div className="relative flex min-h-8 items-end justify-center">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-blue-500 to-emerald-300 shadow-[0_0_24px_rgba(91,140,255,0.25)]"
                    style={{ height: `${Math.max(12, (amount / stats.maxWeek) * 100)}%` }}
                  />
                </div>
                <div className="text-center text-xs text-slate-500">第{index + 1}周</div>
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">分类分布</h3>
              <span className="text-xs text-slate-400">从高到低</span>
            </div>
            <div className="mt-4 space-y-3">
              {stats.categoryTotals.length ? (
                stats.categoryTotals.map(({ category, amount }) => {
                  const width = totals.month ? Math.max(6, (amount / totals.month) * 100) : 0
                  const Icon = getCategoryIcon(category.icon)
                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `${category.color}33`, color: category.color }}>
                            <Icon className="h-4 w-4" />
                          </span>
                          {category.name}
                        </span>
                        <span className="font-semibold">{formatMoney(amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-white/10">
                        <div className="h-2 rounded-full" style={{ width: `${width}%`, backgroundColor: category.color }} />
                      </div>
                    </div>
                  )
                })
              ) : (
                <EmptyState icon={BarChart3} title="暂无本月统计" detail="记录账单后这里会自动生成分布。" />
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">行程报销</h3>
              <span className="text-xs text-slate-400">预算对比</span>
            </div>
            <div className="mt-4 space-y-3">
              {stats.tripTotals.length ? (
                stats.tripTotals.map(({ trip, amount }) => {
                  const percent = trip.budget > 0 ? Math.min(100, (amount / trip.budget) * 100) : 0
                  return (
                    <div key={trip.id} className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{trip.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{trip.destination || '未填写目的地'}</p>
                        </div>
                        <p className="font-bold">{formatMoney(amount)}</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-white/10">
                        <div className="h-2 rounded-full bg-emerald-300" style={{ width: `${trip.budget ? percent : 100}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-400">预算 {trip.budget ? formatMoney(trip.budget) : '未设置'}</p>
                    </div>
                  )
                })
              ) : (
                <EmptyState icon={MapPin} title="暂无行程数据" detail="先在设置里建一个出差行程。" />
              )}
            </div>
          </section>
        </div>
      </div>
    )
  }

  function HistoryView() {
    return (
      <div className="mt-5 space-y-4">
        <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(20,30,24,0.07)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">历史</h2>
              <p className="mt-1 text-sm text-slate-400">{filteredExpenses.length} 笔 · {formatMoney(filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</p>
            </div>
            <div className="flex min-w-0 gap-2 sm:w-[26rem]">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索标题、分类、金额"
                  className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-600/60 dark:border-white/10 dark:bg-black/20 dark:focus:border-emerald-300/60"
                />
              </div>
              <button className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-black/20 dark:text-slate-200 dark:hover:bg-white/10" onClick={exportCsv}>
                <FileText className="h-4 w-4" />
                导出
              </button>
            </div>
          </div>
        </section>
        <div className="space-y-4">
          {groupedExpenses.length ? (
            groupedExpenses.map(([date, list]) => (
              <section key={date} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.035] dark:shadow-none">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-bold">{date}</h3>
                  <span className="text-sm font-semibold text-slate-700 dark:text-rose-200">-{formatMoney(list.reduce((sum, item) => sum + Number(item.amount || 0), 0)).replace('¥ ', '¥')}</span>
                </div>
                <div className="space-y-2">
                  {list.map((expense) => <ExpenseRow key={expense.id} expense={expense} />)}
                </div>
              </section>
            ))
          ) : (
            <EmptyState icon={Search} title="没有匹配记录" detail="换一个关键词，或者先添加一笔账单。" />
          )}
        </div>
      </div>
    )
  }

  function SettingsView() {
    return (
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">分类管理</h2>
              <p className="mt-1 text-sm text-slate-400">按报销科目管理支出类型</p>
            </div>
            <Settings className="h-5 w-5 text-slate-400" />
          </div>
          <form onSubmit={saveCategory} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_92px]">
            <input
              value={categoryForm.name}
              onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="新增分类"
              className="field-input"
            />
            <select
              value={categoryForm.icon}
              onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
              className="field-input"
            >
              {Object.keys(iconMap).map((icon) => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-bold text-slate-950 hover:bg-emerald-300">
              <Plus className="h-4 w-4" />
              新增
            </button>
          </form>
          <div className="mt-4 divide-y divide-slate-200/80 dark:divide-white/10">
            {categories.map((category) => {
              const Icon = getCategoryIcon(category.icon)
              return (
                <div key={category.id} className={cn('flex items-center justify-between gap-3 py-3', !category.is_active && 'opacity-45')}>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${category.color}33`, color: category.color }}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{category.name}</p>
                      <p className="text-xs text-slate-500">{category.is_active ? '启用中' : '已停用'}</p>
                    </div>
                  </div>
                  {category.is_active ? (
                    <button className="rounded-md px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10" onClick={() => disableCategory(category)}>
                      停用
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-[0_10px_28px_rgba(20,30,24,0.07)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">行程管理</h2>
              <p className="mt-1 text-sm text-slate-400">按出差项目归集账单</p>
            </div>
            <MapPin className="h-5 w-5 text-slate-400" />
          </div>
          <form onSubmit={saveTrip} className="mt-4 grid gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={tripForm.name}
                onChange={(event) => setTripForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="行程名称"
                className="field-input"
              />
              <input
                value={tripForm.destination}
                onChange={(event) => setTripForm((current) => ({ ...current, destination: event.target.value }))}
                placeholder="目的地"
                className="field-input"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="date"
                value={tripForm.start_date}
                onChange={(event) => setTripForm((current) => ({ ...current, start_date: event.target.value }))}
                className="field-input"
              />
              <input
                type="date"
                value={tripForm.end_date}
                onChange={(event) => setTripForm((current) => ({ ...current, end_date: event.target.value }))}
                className="field-input"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={tripForm.budget}
                onChange={(event) => setTripForm((current) => ({ ...current, budget: event.target.value }))}
                placeholder="预算"
                className="field-input"
              />
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-400 px-3 text-sm font-bold text-slate-950 hover:bg-blue-300">
              <Plus className="h-4 w-4" />
              新增行程
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {trips.map((trip) => (
              <div key={trip.id} className="rounded-lg border border-slate-200/80 bg-slate-50 p-3 dark:border-white/10 dark:bg-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{trip.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{trip.destination || '未填写目的地'} · {trip.start_date || '未定'} 至 {trip.end_date || '未定'}</p>
                  </div>
                  <button className="rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => archiveTrip(trip)} aria-label="归档行程">
                    <Archive className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>预算 {trip.budget ? formatMoney(trip.budget) : '未设置'}</span>
                  <span>{trip.status === 'open' ? '进行中' : trip.status}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    )
  }

  function ManualForm({ compact = false }: { compact?: boolean }) {
    const selectedCategory = activeCategories.find((category) => category.id === form.category_id)
    const CategoryIcon = getCategoryIcon(selectedCategory?.icon)

    return (
      <section className={cn('rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none lg:p-5', compact && 'bg-white/80 dark:bg-white/[0.035]')}>
        <div className="mb-3.5 flex items-center justify-between lg:mb-5">
          <h2 className="flex items-center gap-2 text-lg font-black text-black dark:text-white lg:gap-2.5 lg:text-xl">
            <Pencil className="h-5 w-5 text-emerald-700 dark:text-emerald-300 lg:h-5 lg:w-5" />
            {form.id ? '编辑账单' : '快速记账'}
          </h2>
          {form.id ? (
            <button
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              onClick={() => setForm(makeBlankForm(activeCategories[0]?.id || '', trips[0]?.id || ''))}
              aria-label="退出编辑"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <form onSubmit={saveExpense} className="space-y-3 lg:space-y-4">
          <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)] gap-2 lg:gap-3">
            <label className="block min-w-0 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-black/20 lg:px-4 lg:py-3">
              <span className="text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 lg:text-base">金额</span>
              <div className="mt-2 flex items-end gap-1.5 lg:mt-4 lg:gap-2">
                <span className="pb-0.5 text-xl font-black text-[#6b7078] dark:text-slate-300 lg:pb-1 lg:text-2xl">¥</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => patchForm({ amount: event.target.value })}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent text-[1.65rem] font-black leading-none text-[#6b7078] outline-none placeholder:text-[#6b7078] dark:text-slate-200 dark:placeholder:text-slate-500 lg:text-3xl"
                />
              </div>
            </label>
            <label className="block min-w-0 rounded-lg border border-slate-200 bg-white/95 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-black/20 lg:px-4 lg:py-3">
              <span className="text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 lg:text-base">标题</span>
              <input
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder="打车 / 餐饮 / 酒店"
                className="mt-2.5 w-full min-w-0 bg-transparent text-[1.22rem] font-black text-[#6b7078] outline-none placeholder:text-[#6b7078] dark:text-slate-100 dark:placeholder:text-slate-500 lg:mt-4 lg:text-xl"
              />
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-3">
            <label className="block min-w-0 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-black/20 lg:px-3 lg:py-3">
              <span className="text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 lg:text-base">分类</span>
              <div className="mt-2 flex items-center gap-1.5 lg:mt-3 lg:gap-2">
                <CategoryIcon className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300 lg:h-6 lg:w-6" />
                <select value={form.category_id} onChange={(event) => patchForm({ category_id: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-bold text-[#111815] outline-none dark:text-white lg:text-lg">
                  {activeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </label>
            <label className="block min-w-0 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-black/20 lg:px-3 lg:py-3">
              <span className="text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 lg:text-base">行程</span>
              <div className="mt-2 flex items-center gap-1.5 lg:mt-3 lg:gap-2">
                <Briefcase className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300 lg:h-6 lg:w-6" />
                <select value={form.trip_id} onChange={(event) => patchForm({ trip_id: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-bold text-[#111815] outline-none dark:text-white lg:text-lg">
                  <option value="">无行程</option>
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>{trip.name}</option>
                  ))}
                </select>
              </div>
            </label>
            <label className="block min-w-0 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-black/20 lg:px-3 lg:py-3">
              <span className="text-[0.82rem] font-semibold text-slate-500 dark:text-slate-400 lg:text-base">发票</span>
              <div className="mt-2 flex items-center gap-1.5 lg:mt-3 lg:gap-2">
                <Receipt className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-300 lg:h-6 lg:w-6" />
                <select value={form.invoice_status} onChange={(event) => patchForm({ invoice_status: event.target.value })} className="min-w-0 flex-1 bg-transparent text-[0.95rem] font-bold text-[#111815] outline-none dark:text-white lg:text-lg">
                  {invoiceOptions.map((status) => (
                    <option key={status} value={status}>{invoiceLabels[status]}</option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 px-1.5 lg:px-2">
            <label className="flex min-w-0 flex-1 items-center gap-1.5 text-sm font-semibold text-[#111815] dark:text-slate-100 lg:gap-2 lg:text-xl">
              <UserRound className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 lg:h-7 lg:w-7" />
              <select value={form.payment_method} onChange={(event) => patchForm({ payment_method: event.target.value })} className="max-w-[7.5rem] bg-transparent outline-none">
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              <span className="text-slate-400">·</span>
              <input
                type="checkbox"
                checked={form.reimbursable}
                onChange={(event) => patchForm({ reimbursable: event.target.checked })}
                className="h-4 w-4 accent-emerald-700 lg:h-5 lg:w-5"
                aria-label="计入报销"
              />
              <span>计入报销</span>
            </label>
            <Info className="h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400 lg:h-6 lg:w-6" />
          </div>

          <details className="group rounded-lg border border-slate-200/80 bg-[#fffdfa] dark:border-white/10 dark:bg-black/15">
            <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-semibold text-slate-500 [&::-webkit-details-marker]:hidden dark:text-slate-400 lg:h-11">
              <MoreHorizontal className="h-4 w-4" />
              更多信息
              <span className="min-w-0 flex-1 truncate text-right text-xs">{form.expense_date} · {form.expense_time}</span>
              <ChevronRight className="h-4 w-4 transition group-open:rotate-90" />
            </summary>
            <div className="grid gap-3 border-t border-slate-200/80 p-3 dark:border-white/10 lg:grid-cols-2">
              <Field label="日期">
                <input type="date" value={form.expense_date} onChange={(event) => patchForm({ expense_date: event.target.value })} className="field-input" />
              </Field>
              <Field label="时间">
                <input type="time" value={form.expense_time} onChange={(event) => patchForm({ expense_time: event.target.value })} className="field-input" />
              </Field>
              <Field label="商户">
                <input value={form.merchant} onChange={(event) => patchForm({ merchant: event.target.value })} placeholder="可选" className="field-input" />
              </Field>
              <Field label="票据链接">
                <input value={form.receipt_url} onChange={(event) => patchForm({ receipt_url: event.target.value })} placeholder="可放图片或网盘地址" className="field-input" />
              </Field>
              <div className="lg:col-span-2">
                <Field label="备注">
                  <textarea
                    value={form.note}
                    onChange={(event) => patchForm({ note: event.target.value })}
                    placeholder="发票抬头、同行人、项目说明等"
                    rows={2}
                    className="field-input min-h-[64px] resize-none py-2"
                  />
                </Field>
              </div>
            </div>
          </details>

          <button
            disabled={saving || !form.amount || !form.title.trim()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-700 via-emerald-600 to-emerald-700 text-lg font-black text-white shadow-[0_12px_26px_rgba(4,120,87,0.24)] transition hover:brightness-105 disabled:opacity-75 dark:from-emerald-400 dark:via-emerald-300 dark:to-emerald-400 dark:text-slate-950 lg:h-14 lg:gap-2.5 lg:text-lg"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin lg:h-6 lg:w-6" /> : <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current lg:h-8 lg:w-8"><Plus className="h-4 w-4 lg:h-5 lg:w-5" /></span>}
            {form.id ? '保存修改' : '添加账单'}
          </button>
        </form>
      </section>
    )
  }

  function ExpenseRow({ expense, compact = false }: { expense: Expense; compact?: boolean }) {
    const Icon = getCategoryIcon(expense.category_icon)
    const isPending = expense.reimbursement_status === 'pending'
    return (
      <article className={cn('bg-white p-3 transition hover:bg-slate-50 dark:bg-transparent dark:hover:bg-white/[0.04] lg:p-4', !compact && 'rounded-lg border border-slate-200/80 dark:border-white/10')}>
        <div className="flex items-center gap-3 lg:gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg lg:h-12 lg:w-12" style={{ backgroundColor: `${expense.category_color || '#0f9f8f'}22`, color: expense.category_color || '#0f9f8f' }}>
            <Icon className="h-5 w-5 lg:h-6 lg:w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-base font-black text-black dark:text-white lg:text-lg">{expense.title}</p>
                <p className="mt-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400 lg:mt-1.5 lg:text-sm">
                  {expense.expense_time || '--:--'} · {expense.category_name || '未分类'}{expense.trip_name ? ` · ${expense.trip_name}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-black dark:text-white lg:text-lg">-{formatMoneyCompact(expense.amount, 2)}</p>
                <div className="mt-1.5 flex items-center justify-end gap-2 lg:mt-2">
                  <span className={cn('rounded-md px-2 py-1 text-xs font-bold lg:text-sm', expense.invoice_status === 'received' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200')}>
                    {invoiceLabels[expense.invoice_status] || expense.invoice_status}
                  </span>
                  {isPending ? (
                    <button className="text-xs font-black text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 lg:text-sm" onClick={() => quickStatus(expense, 'reimbursed')}>
                      标记报销
                    </button>
                  ) : (
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 lg:text-sm">{reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status}</span>
                  )}
                </div>
              </div>
            </div>
            {!compact ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{expense.payment_method}</span>
                <button className="ml-auto rounded-md p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => editExpense(expense)} aria-label="编辑">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-400/10 dark:hover:text-red-200" onClick={() => deleteExpense(expense)} aria-label="删除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  function SmartDialog() {
    if (!smartOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex h-dvh items-end justify-center bg-black/35 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
        <section className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-lg border border-slate-200/80 bg-white p-4 shadow-float custom-scrollbar dark:border-white/10 dark:bg-[#101624] sm:rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">{smartMode === 'voice' ? '语音记账' : '智能记账'}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {smartMode === 'voice' ? voiceStatus : '输入一句话，AI 自动拆成账单字段'}
              </p>
            </div>
            <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10" onClick={closeSmartDialog} aria-label="关闭">
              <X className="h-4 w-4" />
            </button>
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
                  <button
                    className={cn(
                      'relative flex h-20 w-20 items-center justify-center rounded-full shadow-[0_0_34px_rgba(45,212,191,0.32)] transition',
                      listening ? 'bg-emerald-500 text-slate-950' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                    )}
                    onClick={listening ? completeVoiceAndAnalyze : startSpeech}
                    disabled={analyzing}
                    aria-label={listening ? '完成识别' : '开始识别'}
                  >
                    {analyzing ? <Loader2 className="h-9 w-9 animate-spin" /> : <Mic className="h-10 w-10" />}
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-black">{listening ? '正在识别' : analyzing ? '正在解析' : '语音待命'} {formatVoiceTime(recordingSeconds)}</p>
                  <p className="mt-2 text-sm text-slate-400">说出金额、标题、分类或发票状态</p>
                </div>
                <div className="mt-5 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-3 text-left dark:border-white/10 dark:bg-white/[0.05]">
                  <p className="text-xs font-semibold text-slate-500">识别结果</p>
                  <textarea
                    value={smartText}
                    onChange={(event) => {
                      voiceManualEditedRef.current = true
                      setSmartText(event.target.value)
                      setSmartDraft(null)
                    }}
                    onFocus={discardVoiceSession}
                    placeholder="识别到的文字会显示在这里；识别失败时可以直接手动输入或修改。"
                    rows={3}
                    className="mt-2 min-h-[88px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-base leading-relaxed text-[#111815] outline-none placeholder:text-slate-400 focus:border-blue-400/60 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-blue-300/60"
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-400 text-sm font-bold text-slate-950 hover:bg-blue-300 disabled:opacity-60"
                  onClick={completeVoiceAndAnalyze}
                  disabled={analyzing || !smartText.trim()}
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  完成并解析
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <textarea
                  value={smartText}
                  onChange={(event) => {
                    setSmartText(event.target.value)
                    setSmartDraft(null)
                  }}
                  onFocus={discardVoiceSession}
                  placeholder="例如：今天晚上客户招待吃饭 168 元 已开票"
                  rows={4}
                  className="min-h-[112px] w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-base leading-relaxed outline-none focus:border-emerald-600/60 dark:border-white/10 dark:bg-black/20 dark:focus:border-emerald-300/60 sm:text-sm"
                />
              </div>
              <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-400 text-sm font-bold text-slate-950 hover:bg-blue-300 disabled:opacity-60" onClick={() => analyzeSmartText()} disabled={analyzing || !smartText.trim()}>
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                解析
              </button>
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
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={smartDraft.amount}
                    onChange={(event) => patchSmartDraft({ amount: event.target.value })}
                    className="field-input h-10 text-base font-black"
                  />
                </Field>
                <Field label="标题">
                  <input value={smartDraft.title} onChange={(event) => patchSmartDraft({ title: event.target.value })} className="field-input h-10" />
                </Field>
                <Field label="分类">
                  <select value={smartDraft.category_id} onChange={(event) => patchSmartDraft({ category_id: event.target.value })} className="field-input h-10">
                    {activeCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="行程">
                  <select value={smartDraft.trip_id} onChange={(event) => patchSmartDraft({ trip_id: event.target.value })} className="field-input h-10">
                    <option value="">不归属行程</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>{trip.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="日期">
                  <input type="date" value={smartDraft.expense_date} onChange={(event) => patchSmartDraft({ expense_date: event.target.value })} className="field-input h-10" />
                </Field>
                <Field label="发票">
                  <select value={smartDraft.invoice_status} onChange={(event) => patchSmartDraft({ invoice_status: event.target.value })} className="field-input h-10">
                    {invoiceOptions.map((status) => (
                      <option key={status} value={status}>{invoiceLabels[status]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 text-sm font-black text-slate-950 hover:bg-emerald-300 disabled:opacity-60" onClick={addSmartDraft} disabled={saving || !smartDraft.amount || !smartDraft.title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                添加账单
              </button>
            </div>
          ) : null}
        </section>
      </div>
    )
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function DesktopNav({ activeTab, setActiveTab, totals }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void; totals: { month: number; pendingReimbursement: number; reimbursed: number } }) {
  return (
    <aside className="hidden h-dvh border-r border-slate-200/80 bg-white/90 px-5 py-7 dark:border-white/10 dark:bg-white/[0.035] lg:block">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-700 text-white dark:bg-emerald-400 dark:text-slate-950">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-black text-emerald-700 dark:text-white">myMoney</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">出差报销记账</p>
        </div>
      </div>
      <div className="mt-8 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
                activeTab === tab.key && 'bg-emerald-50 text-emerald-800 shadow-card dark:bg-white/[0.12] dark:text-white'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <ChevronRight className="ml-auto h-4 w-4 opacity-40" />
            </button>
          )
        })}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-black/20 dark:shadow-none">
        <p className="text-xs text-slate-500 dark:text-slate-400">本月支出</p>
        <p className="mt-2 text-2xl font-black text-black dark:text-white">{formatMoney(totals.month)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-amber-50 p-2 text-amber-700 dark:bg-amber-300/10 dark:text-amber-100">
            <p className="opacity-70">待报销</p>
            <p className="mt-1 font-bold">{formatMoney(totals.pendingReimbursement)}</p>
          </div>
          <div className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-100">
            <p className="opacity-70">已报销</p>
            <p className="mt-1 font-bold">{formatMoney(totals.reimbursed)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function TopBar({
  loading,
  dateLabel,
  tripLabel,
  isDark,
  onReload,
  onToggleTheme,
}: {
  loading: boolean
  dateLabel: string
  tripLabel: string
  isDark: boolean
  onReload: () => void
  onToggleTheme: () => void
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.3rem] font-black text-emerald-700 dark:text-white lg:hidden">myMoney</h1>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.82rem] text-slate-500 dark:text-slate-400 lg:mt-0 lg:text-[0.95rem] lg:font-semibold lg:text-slate-700 dark:lg:text-slate-200">
          <span className="shrink-0 lg:hidden">{tripLabel} · {dateLabel}</span>
          <span className="hidden shrink-0 lg:inline">{dateLabel}</span>
          <span className="hidden shrink-0 text-slate-400 dark:text-slate-500 lg:inline">·</span>
          <span className="hidden min-w-0 truncate lg:inline">{tripLabel}</span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-300 dark:hover:bg-white/[0.12] lg:inline-flex"
          onClick={onToggleTheme}
          aria-label="切换皮肤"
          title="切换皮肤"
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-200 dark:hover:bg-white/[0.12]"
          onClick={onReload}
          aria-label="同步"
          title="同步"
        >
          <RefreshCcw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          同步
        </button>
      </div>
    </header>
  )
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-slate-200/80 bg-white/[0.97] p-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-[#090d18]/95">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              className={cn(
                'flex h-14 flex-col items-center justify-center gap-0.5 rounded-md text-sm font-semibold text-slate-500 transition hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.08]',
                activeTab === tab.key && 'bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-white/[0.14] dark:text-emerald-300'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-6 w-6" />
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function EmptyState({ icon: Icon, title, detail }: { icon: ComponentType<{ className?: string }>; title: string; detail: string }) {
  return (
    <div className="flex min-h-[128px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-white/10 dark:bg-black/15">
      <Icon className="h-8 w-8 text-slate-500" />
      <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{detail}</p>
    </div>
  )
}
