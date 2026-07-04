"use client"

import type { ComponentType, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { EmptyState } from '@/app/components/money/empty-state'
import { ManualForm as ManualExpenseForm } from '@/app/components/money/manual-form'
import { RecordPage } from '@/app/components/money/record-page'
import { StatsPage } from '@/app/components/money/stats-page'
import { ExpenseRow as ExpenseItemRow } from '@/app/components/money/expense-row'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type {
  AiParsedExpense,
  BootstrapData,
  Category,
  CategoryFormState,
  Expense,
  ExpenseFormState,
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
  formatVoiceTime,
  getCategoryIcon,
  iconMap,
  invoiceLabels,
  invoiceOptions,
  makeBlankForm,
  nowTime,
  paymentMethods,
  reimbursementLabels,
  tabs,
  todayISO,
} from '@/app/components/money/money-utils'
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Download,
  FileCheck2,
  Loader2,
  MapPin,
  Mic,
  Moon,
  Plus,
  RefreshCcw,
  Receipt,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type HistoryFilter = 'all' | 'invoice' | 'reimbursement' | 'reimbursed'
type SettingsPanel = 'ledger' | 'categories' | 'trips' | 'archive' | 'payment' | 'invoice' | 'export' | null
type ZipFile = { name: string; data: Uint8Array }
type CategoryIconValue = keyof typeof iconMap

const categoryIconOptions: Array<{ value: CategoryIconValue; label: string }> = [
  { value: 'utensils', label: '餐饮' },
  { value: 'car', label: '交通' },
  { value: 'hotel', label: '住宿' },
  { value: 'plane', label: '机票高铁' },
  { value: 'briefcase', label: '办公采购' },
  { value: 'wifi', label: '通讯网络' },
  { value: 'receipt', label: '票据' },
  { value: 'more', label: '其他' },
]

export function MoneyApp() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const [activeTab, setActiveTab] = useState<TabKey>('record')
  const [categories, setCategories] = useState<Category[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [archivedTrips, setArchivedTrips] = useState<Trip[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState<ExpenseFormState>(makeBlankForm())
  const [search, setSearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [settingsPanel, setSettingsPanel] = useState<SettingsPanel>(null)
  const [exportTripId, setExportTripId] = useState('')
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({ name: '', icon: 'more', color: '#94a3b8' })
  const [tripForm, setTripForm] = useState<TripFormState>({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
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
  const archivedCategories = useMemo(() => categories.filter((item) => !item.is_active), [categories])
  const archivedItemCount = archivedCategories.length + archivedTrips.length

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

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = expenses
    if (historyFilter === 'invoice') {
      list = list.filter((expense) => expense.invoice_status === 'pending')
    }
    if (historyFilter === 'reimbursement') {
      list = list.filter((expense) => expense.reimbursement_status === 'pending')
    }
    if (historyFilter === 'reimbursed') {
      list = list.filter((expense) => expense.reimbursement_status === 'reimbursed')
    }
    if (!q) return list
    return list.filter((expense) => {
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
      setArchivedTrips(data.archivedTrips || [])
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
      setError(e.message || '保存分类失败')
    } finally {
      setSaving(false)
    }
  }

  async function disableCategory(category: Category) {
    if (!window.confirm(`停用「${category.name}」分类？历史账单会保留。`)) return
    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/categories/${category.id}`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '停用分类失败')
    } finally {
      setSaving(false)
    }
  }

  async function saveTrip(event: FormEvent) {
    event.preventDefault()
    const name = tripForm.name.trim()
    if (!name) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<Trip>('/api/trips', {
        method: 'POST',
        body: JSON.stringify({ ...tripForm, name }),
      })
      setTripForm({ name: '', destination: '', start_date: '', end_date: '', budget: '' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '保存行程失败')
    } finally {
      setSaving(false)
    }
  }

  async function archiveTrip(trip: Trip) {
    if (!window.confirm(`归档「${trip.name}」行程？历史账单会保留。`)) return
    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/trips/${trip.id}`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '归档行程失败')
    } finally {
      setSaving(false)
    }
  }

  async function deleteArchivedCategory(category: Category) {
    const usageCount = getCategoryUsageCount(category.id)
    if (usageCount > 0) return
    if (!window.confirm(`彻底删除「${category.name}」分类？此操作无法恢复。`)) return
    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/categories/${category.id}?hard=1`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '删除归档分类失败')
    } finally {
      setSaving(false)
    }
  }

  async function deleteArchivedTrip(trip: Trip) {
    const usageCount = getTripUsageCount(trip.id)
    if (usageCount > 0) return
    if (!window.confirm(`彻底删除「${trip.name}」行程？此操作无法恢复。`)) return
    setSaving(true)
    setError('')
    try {
      await fetchJson(`/api/trips/${trip.id}?hard=1`, { method: 'DELETE' })
      await loadData()
    } catch (e: any) {
      setError(e.message || '删除归档行程失败')
    } finally {
      setSaving(false)
    }
  }

  async function clearHistory() {
    if (!expenses.length) return
    if (!window.confirm('确定清空全部历史账单？分类与行程会保留。')) return
    setSaving(true)
    setError('')
    try {
      await fetchJson<{ ok: boolean }>('/api/expenses', { method: 'DELETE' })
      setExpenses([])
      setSearch('')
      setHistoryFilter('all')
    } catch (e: any) {
      setError(e.message || '清空历史失败')
    } finally {
      setSaving(false)
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

  function startInlineSpeech() {
    discardVoiceSession()
    setSmartMode('text')
    setSmartOpen(true)
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

  function getCategoryUsageCount(categoryId: string) {
    return expenses.filter((expense) => expense.category_id === categoryId).length
  }

  function getTripUsageCount(tripId: string) {
    return expenses.filter((expense) => expense.trip_id === tripId).length
  }

  function getExportExpenses(tripId = exportTripId) {
    return tripId ? expenses.filter((expense) => expense.trip_id === tripId) : expenses
  }

  function getExportLabel(tripId = exportTripId) {
    return trips.find((trip) => trip.id === tripId)?.name || '全部行程'
  }

  function buildExportData(expensesToExport: Expense[]) {
    const receiptFiles: ZipFile[] = []
    const receiptPaths = new Map<string, string>()

    for (const expense of expensesToExport) {
      const receiptFile = createReceiptZipFile(expense)
      if (!receiptFile) continue
      receiptFiles.push(receiptFile)
      receiptPaths.set(expense.id, receiptFile.name)
    }

    const rows = [
      ['日期', '时间', '行程', '目的地', '分类', '标题', '商户', '金额', '支付方式', '发票', '报销状态', '备注', '票据文件', '票据链接'],
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
        invoiceLabels[expense.invoice_status] || expense.invoice_status,
        reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status,
        expense.note || '',
        receiptPaths.get(expense.id) || '',
        expense.receipt_url && !expense.receipt_url.startsWith('data:') ? expense.receipt_url : '',
      ]),
    ]

    return {
      csv: rows.map((row) => row.map(escapeCsv).join(',')).join('\n'),
      receiptFiles,
    }
  }

  function downloadCsv(expensesToExport: Expense[], label: string) {
    if (!expensesToExport.length) {
      setError('没有可导出的账单')
      return
    }
    const { csv } = buildExportData(expensesToExport)
    downloadBlob(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }), `记账-${safeFileName(label)}-${todayISO()}.csv`)
  }

  function exportCsv(tripId = exportTripId) {
    downloadCsv(getExportExpenses(tripId), getExportLabel(tripId))
  }

  function exportZip(tripId = exportTripId) {
    const exportExpenses = getExportExpenses(tripId)
    if (!exportExpenses.length) {
      setError('没有可导出的账单')
      return
    }
    const { csv, receiptFiles } = buildExportData(exportExpenses)
    const csvFile = { name: 'ledger.csv', data: new TextEncoder().encode(`\ufeff${csv}`) }
    downloadBlob(createZipArchive([csvFile, ...receiptFiles]), `记账-${safeFileName(getExportLabel(tripId))}-${todayISO()}.zip`)
  }

  const manualForm = (
    <ManualExpenseForm
      activeCategories={activeCategories}
      trips={trips}
      form={form}
      saving={saving}
      formId="manual-entry-form"
      onPatchForm={patchForm}
      onSaveExpense={saveExpense}
      onResetForm={setForm}
    />
  )

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f6f7f4] text-[#161a17] dark:bg-[#070a12] dark:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#fffdf8_0%,#f3f6f1_48%,#eef3f8_100%)] dark:bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(91,140,255,0.18),transparent_28%),linear-gradient(145deg,#070a12_0%,#0b1020_55%,#070a12_100%)]" />
      <div className="relative mx-auto grid h-full min-h-0 max-w-[1440px] grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_390px]">
        <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} totals={totals} />

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] pt-[max(env(safe-area-inset-top),1rem)] custom-scrollbar sm:px-6 lg:h-full lg:px-8 lg:pb-8 lg:pt-7">
          {error ? (
            <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
              <span>{error}</span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-100 dark:hover:bg-white/10" onClick={() => setError('')} aria-label="关闭错误">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          {activeTab === 'record' ? (
            <RecordPage
              totals={totals}
              todayExpenses={todayExpenses}
              manualForm={manualForm}
              loading={loading}
              listening={listening}
              analyzing={analyzing}
              onReload={loadData}
              onManualRecord={focusManualForm}
              onOpenTextSmartDialog={openTextSmartDialog}
              onStartSpeech={startSpeech}
              onGoHistory={() => setActiveTab('history')}
              onEditExpense={editExpense}
              onDeleteExpense={deleteExpense}
              onQuickStatus={quickStatus}
            />
          ) : null}
          {activeTab === 'stats' ? <StatsPage totals={totals} stats={stats} /> : null}
          {activeTab === 'history' ? HistoryView() : null}
          {activeTab === 'settings' ? SettingsView() : null}
        </section>

        <aside className="hidden h-full overflow-y-auto border-l border-slate-200/80 bg-white/90 px-5 py-7 custom-scrollbar dark:border-white/10 dark:bg-white/[0.035] lg:block">
          <ManualExpenseForm
            activeCategories={activeCategories}
            trips={trips}
            form={form}
            saving={saving}
            compact
            onPatchForm={patchForm}
            onSaveExpense={saveExpense}
            onResetForm={setForm}
          />
        </aside>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {SettingsPanelView()}
      {SmartDialog()}
    </main>
  )

  function HistoryView() {
    return (
      <div className="mx-auto max-w-[430px] space-y-3.5 lg:max-w-5xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">历史</h2>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-700 dark:text-slate-100" onClick={loadData} aria-label="同步">
            <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索标题、分类、金额"
            className="h-11 rounded-lg border-slate-200/80 bg-white/80 pl-9 text-sm shadow-sm dark:border-white/10 dark:bg-white/[0.045]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all' as const, label: '全部' },
            { key: 'invoice' as const, label: '待开票' },
            { key: 'reimbursement' as const, label: '待报销' },
            { key: 'reimbursed' as const, label: '已报销' },
          ].map((item) => (
            <Button
              type="button"
              variant="outline"
              key={item.key}
              className={cn(
                'h-8 shrink-0 rounded-md border-slate-200/80 bg-white/70 px-3 text-sm dark:border-white/10 dark:bg-white/[0.045]',
                historyFilter === item.key && 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-200'
              )}
              onClick={() => setHistoryFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {groupedExpenses.length ? (
            groupedExpenses.map(([date, list]) => (
              <Card key={date} className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
                <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2.5 dark:border-white/10">
                  <h3 className="font-semibold text-slate-950 dark:text-white">{date.replaceAll('-', '/')}</h3>
                  <span className="text-sm font-semibold text-red-500">-{formatMoney(list.reduce((sum, item) => sum + Number(item.amount || 0), 0)).replace('¥ ', '¥')}</span>
                </div>
                <div className="divide-y divide-slate-200/80 dark:divide-white/10">
                  {list.map((expense) => (
                    <ExpenseItemRow key={expense.id} expense={expense} compact onEdit={editExpense} onDelete={deleteExpense} onQuickStatus={quickStatus} />
                  ))}
                </div>
              </Card>
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
      <div className="mx-auto max-w-[430px] space-y-4 lg:max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">设置</h2>

        <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
              <BookOpen className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-950 dark:text-white">本地账本</p>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{expenses.length} 笔记录</p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => setSettingsPanel('ledger')} aria-label="查看账本">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </Card>

        <SettingGroup title="账本设置">
          <SettingRow icon={SlidersHorizontal} label="分类管理" detail={`${activeCategories.length} 个可用分类`} active={settingsPanel === 'categories'} onClick={() => setSettingsPanel('categories')} />
          <SettingRow icon={MapPin} label="行程管理" detail={`${trips.length} 个行程`} active={settingsPanel === 'trips'} onClick={() => setSettingsPanel('trips')} />
          <SettingRow icon={CreditCard} label="支付方式" detail={`${paymentMethods.length} 种方式`} active={settingsPanel === 'payment'} onClick={() => setSettingsPanel('payment')} />
          <SettingRow icon={FileCheck2} label="发票状态" detail="待开票 / 已开票 / 无发票" active={settingsPanel === 'invoice'} onClick={() => setSettingsPanel('invoice')} />
        </SettingGroup>

        <SettingGroup title="数据管理">
          <SettingRow icon={Download} label="数据导出" detail="按行程导出 CSV / ZIP" active={settingsPanel === 'export'} onClick={() => setSettingsPanel('export')} />
          <SettingRow icon={Archive} label="归档数据" detail={`${archivedItemCount} 项归档`} active={settingsPanel === 'archive'} onClick={() => setSettingsPanel('archive')} />
          <SettingRow icon={Trash2} label="清空历史数据" danger detail="保留分类与行程" onClick={clearHistory} />
        </SettingGroup>

        <SettingGroup title="外观">
          <div className="flex h-14 items-center justify-between px-4">
            <span className="flex items-center gap-3 text-sm font-medium text-slate-900 dark:text-slate-100">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              {isDark ? '黑暗皮肤' : '白天皮肤'}
            </span>
            <Switch checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} aria-label="切换皮肤" />
          </div>
        </SettingGroup>

        <p className="pt-1 text-center text-xs text-slate-400">Travel Ledger · v1.0</p>
      </div>
    )
  }

  function SettingGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
      <section>
        <h3 className="mb-2 px-1 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
        <Card className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
          <div className="divide-y divide-slate-200/80 dark:divide-white/10">{children}</div>
        </Card>
      </section>
    )
  }

  function SettingRow({
    icon: Icon,
    label,
    detail,
    danger = false,
    active = false,
    onClick,
  }: {
    icon: ComponentType<{ className?: string }>
    label: string
    detail?: string
    danger?: boolean
    active?: boolean
    onClick?: () => void
  }) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          'h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.06]',
          active && 'bg-emerald-50/80 dark:bg-emerald-400/10'
        )}
        onClick={onClick}
      >
        <Icon className={cn('h-5 w-5 shrink-0', danger ? 'text-red-500' : 'text-slate-800 dark:text-slate-100')} />
        <span className="min-w-0 flex-1">
          <span className={cn('block text-sm font-medium', danger ? 'text-red-500' : 'text-slate-900 dark:text-slate-100')}>{label}</span>
          {detail ? <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{detail}</span> : null}
        </span>
        <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
      </Button>
    )
  }

  function SettingsPanelView() {
    if (!settingsPanel) return null

    const titleMap: Record<Exclude<SettingsPanel, null>, string> = {
      ledger: '本地账本',
      categories: '分类管理',
      trips: '行程管理',
      archive: '归档数据',
      payment: '支付方式',
      invoice: '发票状态',
      export: '数据导出',
    }
    const exportRows = getExportExpenses(exportTripId)
    const exportReceiptCount = exportRows.filter((expense) => Boolean(expense.receipt_url)).length

    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/65" role="dialog" aria-modal="true" aria-label={titleMap[settingsPanel]}>
        <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭设置面板" onClick={() => setSettingsPanel(null)} />
        <div className="relative z-10 flex h-dvh w-full max-w-[430px] flex-col border-l border-slate-200/80 bg-[#f7f8f5] shadow-[0_24px_80px_rgba(15,23,42,0.24)] animate-in slide-in-from-right duration-200 dark:border-white/10 dark:bg-[#090d18] sm:m-4 sm:h-[calc(100dvh-2rem)] sm:rounded-xl sm:border">
          <div className="border-b border-slate-200/80 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] dark:border-white/10 sm:pt-4">
            <h3 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-white">{titleMap[settingsPanel]}</h3>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">

        {settingsPanel === 'ledger' ? (
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="账单" value={`${expenses.length} 笔`} />
            <MiniStat label="分类" value={`${activeCategories.length} 个`} />
            <MiniStat label="行程" value={`${trips.length} 个`} />
            <Button type="button" variant="outline" className="col-span-3 mt-1 h-10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]" onClick={loadData}>
              <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
              同步本地账本
            </Button>
          </div>
        ) : null}

        {settingsPanel === 'categories' ? (
          <div className="space-y-3">
            <MiniStat label="可用分类" value={`${activeCategories.length} 个`} />

            <form onSubmit={saveCategory} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
              <Input value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} placeholder="分类名称" className="h-10" />
              <div className="grid grid-cols-2 gap-2">
                {categoryIconOptions.map((option) => {
                  const Icon = getCategoryIcon(option.value)
                  const selected = categoryForm.icon === option.value
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      className={cn(
                        'h-11 justify-start rounded-md border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-white/10',
                        selected && 'border-transparent text-white shadow-sm hover:text-white dark:border-transparent dark:text-white'
                      )}
                      style={selected ? { backgroundColor: categoryForm.color } : undefined}
                      aria-pressed={selected}
                      onClick={() => setCategoryForm((current) => ({ ...current, icon: option.value }))}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{option.label}</span>
                    </Button>
                  )
                })}
              </div>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20">
                <span className="min-w-0 flex-1 text-sm font-medium text-slate-600 dark:text-slate-300">分类颜色</span>
                <Input type="color" value={categoryForm.color} onChange={(event) => setCategoryForm((current) => ({ ...current, color: event.target.value }))} className="h-9 w-14 p-1" aria-label="分类颜色" />
              </div>
              <Button type="submit" className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !categoryForm.name.trim()}>
                <Plus className="h-4 w-4" />
                新增分类
              </Button>
            </form>

            <div className="grid gap-2">
              {activeCategories.map((category) => {
                const Icon = getCategoryIcon(category.icon)
                return (
                  <div key={category.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: category.color }}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => disableCategory(category)} aria-label={`停用${category.name}`}>
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {settingsPanel === 'trips' ? (
          <div className="space-y-3">
            <MiniStat label="行程" value={`${trips.length} 个`} />

            <form onSubmit={saveTrip} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
              <Input value={tripForm.name} onChange={(event) => setTripForm((current) => ({ ...current, name: event.target.value }))} placeholder="行程名称" className="h-10" />
              <Input value={tripForm.destination} onChange={(event) => setTripForm((current) => ({ ...current, destination: event.target.value }))} placeholder="目的地" className="h-10" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={tripForm.start_date} onChange={(event) => setTripForm((current) => ({ ...current, start_date: event.target.value }))} className="h-10" />
                <Input type="date" value={tripForm.end_date} onChange={(event) => setTripForm((current) => ({ ...current, end_date: event.target.value }))} className="h-10" />
              </div>
              <Input type="number" inputMode="decimal" min="0" step="0.01" value={tripForm.budget} onChange={(event) => setTripForm((current) => ({ ...current, budget: event.target.value }))} placeholder="预算（可选）" className="h-10" />
              <Button type="submit" className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !tripForm.name.trim()}>
                <Plus className="h-4 w-4" />
                新增行程
              </Button>
            </form>

            <div className="grid gap-2">
              {trips.map((trip) => (
                <div key={trip.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{trip.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{trip.destination || '未设置目的地'}</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => archiveTrip(trip)} aria-label={`归档${trip.name}`}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {settingsPanel === 'archive' ? (
          archivedItemCount ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">归档分类</h4>
                {archivedCategories.length ? (
                  <div className="grid gap-2">
                    {archivedCategories.map((category) => {
                      const Icon = getCategoryIcon(category.icon)
                      const usageCount = getCategoryUsageCount(category.id)
                      return (
                        <div key={category.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: category.color }}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{category.name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{usageCount ? `已使用 ${usageCount} 笔` : '未被使用'}</p>
                          </div>
                          {usageCount === 0 ? (
                            <Button type="button" variant="ghost" className="h-8 shrink-0 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => deleteArchivedCategory(category)} disabled={saving}>
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200/80 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">暂无归档分类</p>
                )}
              </div>

              <div className="space-y-2">
                <h4 className="px-1 text-xs font-semibold text-slate-500 dark:text-slate-400">归档行程</h4>
                {archivedTrips.length ? (
                  <div className="grid gap-2">
                    {archivedTrips.map((trip) => {
                      const usageCount = getTripUsageCount(trip.id)
                      return (
                        <div key={trip.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                          <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{trip.name}</p>
                            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{usageCount ? `已使用 ${usageCount} 笔` : trip.destination || '未被使用'}</p>
                          </div>
                          {usageCount === 0 ? (
                            <Button type="button" variant="ghost" className="h-8 shrink-0 px-2 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => deleteArchivedTrip(trip)} disabled={saving}>
                              <Trash2 className="h-4 w-4" />
                              删除
                            </Button>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200/80 px-3 py-3 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">暂无归档行程</p>
                )}
              </div>
            </div>
          ) : (
            <EmptyState icon={Archive} title="暂无归档数据" detail="停用分类或归档行程后，会在这里处理。" />
          )
        ) : null}

        {settingsPanel === 'payment' ? (
          <div className="grid gap-2">
            {paymentMethods.map((method) => (
              <div key={method} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-white/10 dark:bg-black/15">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <CreditCard className="h-4 w-4 text-slate-500" />
                  <span className="truncate">{method}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{expenses.filter((expense) => expense.payment_method === method).length} 笔</span>
              </div>
            ))}
          </div>
        ) : null}

        {settingsPanel === 'invoice' ? (
          <div className="grid gap-2">
            {invoiceOptions.map((status) => (
              <div key={status} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-3 text-sm dark:border-white/10 dark:bg-black/15">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <Receipt className="h-4 w-4 text-slate-500" />
                  <span className="truncate">{invoiceLabels[status]}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{expenses.filter((expense) => expense.invoice_status === status).length} 笔</span>
              </div>
            ))}
          </div>
        ) : null}

        {settingsPanel === 'export' ? (
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">导出范围</span>
              <select value={exportTripId} onChange={(event) => setExportTripId(event.target.value)} className="field-input h-10 border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-black/20">
                <option value="">全部行程</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="账单" value={`${exportRows.length} 笔`} />
              <MiniStat label="票据" value={`${exportReceiptCount} 个`} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" className="h-10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]" onClick={() => exportCsv(exportTripId)}>
                <Download className="h-4 w-4" />
                CSV
              </Button>
              <Button type="button" className="h-10 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => exportZip(exportTripId)}>
                <Download className="h-4 w-4" />
                ZIP 含票据
              </Button>
            </div>
          </div>
        ) : null}
          </div>
          <div className="border-t border-slate-200/80 bg-white/92 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 dark:border-white/10 dark:bg-[#090d18]/95">
            <Button type="button" variant="outline" className="h-11 w-full rounded-lg border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]" onClick={() => setSettingsPanel(null)}>
              返回
            </Button>
          </div>
        </div>
      </div>
    )
  }

  function SmartDialog() {
    if (!smartOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex h-dvh items-end justify-center bg-black/35 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm dark:bg-black/70 sm:items-center sm:p-6">
        <Card className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-lg border-slate-200/80 bg-white p-4 shadow-float custom-scrollbar dark:border-white/10 dark:bg-[#101624] sm:rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">{smartMode === 'voice' ? '语音记账' : '智能记账'}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {smartMode === 'voice' || listening ? voiceStatus : '输入一句话，AI 自动拆成账单字段'}
              </p>
            </div>
            <Button type="button" variant="ghost" size="icon" className="text-slate-500 dark:text-slate-400" onClick={closeSmartDialog} aria-label="关闭">
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
                    onClick={listening ? completeVoiceAndAnalyze : startSpeech}
                    disabled={analyzing}
                    aria-label={listening ? '完成识别' : '开始识别'}
                  >
                    {analyzing ? <Loader2 className="h-9 w-9 animate-spin" /> : <Mic className="h-10 w-10" />}
                  </Button>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-semibold tracking-normal">{listening ? '正在识别' : analyzing ? '正在解析' : '语音待命'} {formatVoiceTime(recordingSeconds)}</p>
                  <p className="mt-2 text-sm text-slate-400">说出金额、标题、分类或发票状态</p>
                </div>
                <div className="mt-5 w-full rounded-lg border border-slate-200/80 bg-white px-3 py-3 text-left dark:border-white/10 dark:bg-white/[0.05]">
                  <p className="text-xs font-semibold text-slate-500">识别结果</p>
                  <Textarea
                    value={smartText}
                    onChange={(event) => {
                      voiceManualEditedRef.current = true
                      setSmartText(event.target.value)
                      setSmartDraft(null)
                    }}
                    onFocus={discardVoiceSession}
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
                  onClick={completeVoiceAndAnalyze}
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
                    setSmartText(event.target.value)
                    setSmartDraft(null)
                  }}
                  onFocus={discardVoiceSession}
                  placeholder="例如：今天晚上客户招待吃饭 168 元 已开票"
                  rows={4}
                  className="min-h-[132px] resize-none rounded-lg border-slate-200 bg-white pb-14 text-base leading-relaxed dark:border-white/10 dark:bg-black/20 sm:text-sm"
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {listening ? <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:bg-slate-900/90 dark:text-emerald-300">{formatVoiceTime(recordingSeconds)}</span> : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className={cn(
                      'h-10 w-10 rounded-md border-slate-200 bg-white/95 text-slate-600 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-white/10',
                      listening && 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-4 ring-emerald-500/10 dark:border-emerald-400/40 dark:bg-emerald-400/15 dark:text-emerald-200'
                    )}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={listening ? stopInlineSpeech : startInlineSpeech}
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
                onClick={() => {
                  discardVoiceSession()
                  void analyzeSmartText()
                }}
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
                    onChange={(event) => patchSmartDraft({ amount: event.target.value })}
                    className="h-10 text-base font-semibold"
                  />
                </Field>
                <Field label="标题">
                  <Input value={smartDraft.title} onChange={(event) => patchSmartDraft({ title: event.target.value })} className="h-10" />
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
                  <Input type="date" value={smartDraft.expense_date} onChange={(event) => patchSmartDraft({ expense_date: event.target.value })} className="h-10" />
                </Field>
                <Field label="发票">
                  <select value={smartDraft.invoice_status} onChange={(event) => patchSmartDraft({ invoice_status: event.target.value })} className="field-input h-10">
                    {invoiceOptions.map((status) => (
                      <option key={status} value={status}>{invoiceLabels[status]}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Button type="button" className="mt-3 h-10 w-full bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300" onClick={addSmartDraft} disabled={saving || !smartDraft.amount || !smartDraft.title.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                添加账单
              </Button>
            </div>
          ) : null}
        </Card>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
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
          <h1 className="text-lg font-semibold tracking-normal text-emerald-700 dark:text-white">记账</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">轻量报销记录</p>
        </div>
      </div>
      <div className="mt-8 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              type="button"
              variant="ghost"
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
            </Button>
          )
        })}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-black/20 dark:shadow-none">
        <p className="text-xs text-slate-500 dark:text-slate-400">本月支出</p>
        <p className="mt-2 text-2xl font-semibold tracking-normal text-black dark:text-white">{formatMoney(totals.month)}</p>
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

function BottomNav({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-slate-200/80 bg-white/[0.96] p-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-[#090d18]/95">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <Button
              type="button"
              variant="ghost"
              key={tab.key}
              className={cn(
                'flex h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-md text-[0.72rem] font-medium leading-4 text-slate-500 transition hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/[0.08]',
                activeTab === tab.key && 'bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:bg-white/[0.14] dark:text-emerald-300'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-5 w-5" />
              {tab.label}
            </Button>
          )
        })}
      </div>
    </nav>
  )
}

function createReceiptZipFile(expense: Expense): ZipFile | null {
  const decoded = decodeDataUrl(expense.receipt_url || '')
  if (!decoded) return null
  const extension = mimeToExtension(decoded.mime)
  return {
    name: `receipts/${safeFileName(`${expense.expense_date}-${expense.title}-${expense.id}`)}.${extension}`,
    data: decoded.data,
  }
}

function decodeDataUrl(value: string): { mime: string; data: Uint8Array } | null {
  const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/)
  if (!match) return null
  const mime = match[1] || 'application/octet-stream'
  const body = match[3] || ''

  if (match[2]) {
    const binary = atob(body)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }
    return { mime, data: bytes }
  }

  try {
    return { mime, data: new TextEncoder().encode(decodeURIComponent(body)) }
  } catch {
    return null
  }
}

function mimeToExtension(mime: string) {
  if (mime.includes('png')) return 'png'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('gif')) return 'gif'
  if (mime.includes('pdf')) return 'pdf'
  return 'bin'
}

function safeFileName(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 88) || '账单'
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const crcTable = createCrcTable()
const zipEncoder = new TextEncoder()

function createCrcTable() {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    }
    table[index] = value >>> 0
  }
  return table
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff
  for (let index = 0; index < data.length; index += 1) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[index]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function createZipArchive(files: ZipFile[]) {
  const now = new Date()
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const name = zipEncoder.encode(file.name)
    const checksum = crc32(file.data)
    const local = new Uint8Array(30 + name.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0x0800, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, checksum, true)
    localView.setUint32(18, file.data.length, true)
    localView.setUint32(22, file.data.length, true)
    localView.setUint16(26, name.length, true)
    localView.setUint16(28, 0, true)
    local.set(name, 30)
    localParts.push(local, file.data)

    const central = new Uint8Array(46 + name.length)
    const centralView = new DataView(central.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0x0800, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, checksum, true)
    centralView.setUint32(20, file.data.length, true)
    centralView.setUint32(24, file.data.length, true)
    centralView.setUint16(28, name.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    central.set(name, 46)
    centralParts.push(central)

    offset += local.length + file.data.length
  }

  const centralOffset = offset
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, centralOffset, true)
  endView.setUint16(20, 0, true)

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' })
}
