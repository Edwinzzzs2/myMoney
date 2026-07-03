"use client"

import type { ComponentType, FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  BadgeCheck,
  BarChart3,
  Briefcase,
  Car,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FileText,
  Hotel,
  Loader2,
  MapPin,
  Mic,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  Receipt,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Utensils,
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
type VoicePermissionState = 'unknown' | 'checking' | 'granted' | 'prompt' | 'denied' | 'unsupported' | 'insecure' | 'busy'

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
  received: '已收票',
  none: '无发票',
}

const reimbursementLabels: Record<string, string> = {
  unsubmitted: '未提交',
  submitted: '已提交',
  reimbursed: '已报销',
  rejected: '退回',
}

const paymentMethods = ['个人垫付', '公司卡', '微信', '支付宝', '银行卡', '现金']
const invoiceOptions = ['pending', 'received', 'none']
const reimbursementOptions = ['unsubmitted', 'submitted', 'reimbursed', 'rejected']

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
    reimbursement_status: 'unsubmitted',
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
  const [voiceStatus, setVoiceStatus] = useState('点击语音输入后会自动开始录音')
  const [voicePermission, setVoicePermission] = useState<VoicePermissionState>('unknown')
  const [voicePermissionDetail, setVoicePermissionDetail] = useState('尚未检查麦克风权限')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioMimeTypeRef = useRef('audio/webm')
  const speechRecognitionRef = useRef<any>(null)
  const voiceTimerRef = useRef<number | null>(null)

  const activeCategories = useMemo(() => categories.filter((item) => item.is_active), [categories])

  const totals = useMemo(() => {
    const currentDate = todayISO()
    const monthKey = currentDate.slice(0, 7)
    const summary = {
      total: 0,
      month: 0,
      today: 0,
      reimbursable: 0,
      unsubmitted: 0,
      submitted: 0,
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
      if (expense.reimbursement_status === 'unsubmitted') summary.unsubmitted += amount
      if (expense.reimbursement_status === 'submitted') summary.submitted += amount
      if (expense.reimbursement_status === 'reimbursed') summary.reimbursed += amount
    }
    return summary
  }, [expenses])

  const todayExpenses = useMemo(() => expenses.filter((item) => item.expense_date === todayISO()), [expenses])

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
      stopMediaTracks()
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

  function stopMediaTracks() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  function discardVoiceSession() {
    stopBrowserRecognition()
    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {}
    }
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    stopMediaTracks()
    stopVoiceTimer()
    setListening(false)
  }

  function getMicrophoneSupportIssue() {
    if (!window.isSecureContext) {
      return {
        state: 'insecure' as const,
        detail: '当前页面不是 HTTPS。iPhone Safari 只允许 HTTPS 或 localhost 使用麦克风。',
      }
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      return {
        state: 'unsupported' as const,
        detail: '当前浏览器没有开放麦克风接口，请升级 Safari 或换 HTTPS 页面访问。',
      }
    }
    return null
  }

  function mapMicrophoneError(error: any) {
    const name = String(error?.name || '')
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        state: 'denied' as const,
        detail: '站点麦克风权限被拒绝，或 Safari 没有把权限授予当前网页。',
      }
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        state: 'unsupported' as const,
        detail: '没有检测到可用麦克风。',
      }
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        state: 'busy' as const,
        detail: '麦克风可能被其他 App 或页面占用，关闭后再试。',
      }
    }
    return {
      state: 'denied' as const,
      detail: error?.message || '无法打开麦克风，请检查 Safari 权限。',
    }
  }

  async function readMicrophonePermissionState() {
    const supportIssue = getMicrophoneSupportIssue()
    if (supportIssue) {
      setVoicePermission(supportIssue.state)
      setVoicePermissionDetail(supportIssue.detail)
      return supportIssue.state
    }

    try {
      const permissions = (navigator as any).permissions
      if (permissions?.query) {
        const status = await permissions.query({ name: 'microphone' as PermissionName })
        const state = status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'prompt'
        setVoicePermission(state)
        setVoicePermissionDetail(
          state === 'granted'
            ? '浏览器显示麦克风权限已允许。'
            : state === 'prompt'
              ? '浏览器还没有最终授权，点击检查权限会触发系统弹窗。'
              : '浏览器显示麦克风权限被拒绝。'
        )
        return state
      }
    } catch {}

    setVoicePermission('unknown')
    setVoicePermissionDetail('Safari 可能不支持权限预读，点击检查权限会实际请求麦克风。')
    return 'unknown'
  }

  async function requestMicrophonePermission() {
    setSmartMode('voice')
    setSmartOpen(true)
    setVoicePermission('checking')
    setVoicePermissionDetail('正在请求麦克风权限...')
    setVoiceStatus('正在检查麦克风权限...')

    const supportIssue = getMicrophoneSupportIssue()
    if (supportIssue) {
      setVoicePermission(supportIssue.state)
      setVoicePermissionDetail(supportIssue.detail)
      setVoiceStatus(supportIssue.detail)
      return false
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      stream.getTracks().forEach((track) => track.stop())
      setVoicePermission('granted')
      setVoicePermissionDetail('麦克风权限正常，可以开始录音。')
      setVoiceStatus('麦克风权限正常，可以开始录音')
      return true
    } catch (e: any) {
      const mapped = mapMicrophoneError(e)
      setVoicePermission(mapped.state)
      setVoicePermissionDetail(mapped.detail)
      setVoiceStatus(mapped.detail)
      return false
    }
  }

  function closeSmartDialog() {
    discardVoiceSession()
    setSmartOpen(false)
  }

  function openTextSmartDialog() {
    discardVoiceSession()
    setSmartMode('text')
    setVoiceStatus('点击语音输入后会自动开始录音')
    setSmartOpen(true)
  }

  function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || ''
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
      reimbursement_status: parsed.reimbursement_status || 'unsubmitted',
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

  function applySmartDraft() {
    if (!smartDraft) return
    setForm(smartDraft)
    setSmartOpen(false)
    setActiveTab('record')
  }

  async function transcribeAudio(blob: Blob) {
    const formData = new FormData()
    const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'mp4' : 'webm'
    formData.append('audio', blob, `voice-${Date.now()}.${ext}`)
    const response = await fetch('/api/ai/transcribe', {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      let message = `语音转写失败：${response.status}`
      try {
        const body = await response.json()
        message = body?.message || message
      } catch {}
      throw new Error(message)
    }
    const data = await response.json()
    return String(data?.text || '').trim()
  }

  function stopCurrentRecording() {
    const recorder = mediaRecorderRef.current
    if (!recorder) return Promise.resolve<Blob | null>(null)

    return new Promise<Blob | null>((resolve) => {
      const finish = () => {
        stopVoiceTimer()
        stopMediaTracks()
        setListening(false)
        mediaRecorderRef.current = null
        if (!audioChunksRef.current.length) {
          resolve(null)
          return
        }
        resolve(new Blob(audioChunksRef.current, { type: audioMimeTypeRef.current || 'audio/webm' }))
      }

      recorder.addEventListener('stop', finish, { once: true })
      if (recorder.state === 'inactive') {
        finish()
      } else {
        recorder.stop()
      }
    })
  }

  async function completeVoiceAndAnalyze() {
    setAnalyzing(true)
    setVoiceStatus('正在整理录音...')
    stopBrowserRecognition()

    try {
      const audioBlob = await stopCurrentRecording()
      let transcript = smartText.trim()
      if (!transcript && audioBlob && audioBlob.size > 0) {
        setVoiceStatus('正在上传录音给 AI 转文字...')
        transcript = await transcribeAudio(audioBlob)
        setSmartText(transcript)
      }
      if (!transcript) {
        setVoiceStatus('没有识别到内容，可以再录一次或手动输入')
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
      setVoiceStatus(mediaRecorderRef.current?.state === 'recording' ? '正在录音，浏览器实时识别已同步启动' : '浏览器实时识别已启动')
    }
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || '')
        .join('')
        .trim()
      setSmartText(transcript)
      if (transcript) setVoiceStatus('已识别到文字，讲完后点完成解析')
    }
    recognition.onerror = () => {
      setVoiceStatus(
        mediaRecorderRef.current?.state === 'recording'
          ? '浏览器实时识别不可用，录音仍在保留，完成后上传 AI 转写'
          : '浏览器语音识别不可用，可以使用录音上传或文字输入'
      )
    }
    recognition.onend = () => {
      if (speechRecognitionRef.current === recognition) speechRecognitionRef.current = null
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
    setSmartText('')
    setError('')
    setVoiceStatus('正在请求麦克风权限...')
    audioChunksRef.current = []

    await readMicrophonePermissionState()
    const supportIssue = getMicrophoneSupportIssue()
    if (supportIssue) {
      setVoicePermission(supportIssue.state)
      setVoicePermissionDetail(supportIssue.detail)
      setVoiceStatus(supportIssue.detail)
      return
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      const speechStarted = startBrowserRecognition()
      if (speechStarted) {
        setListening(true)
        startVoiceTimer()
        setVoicePermission('granted')
        setVoicePermissionDetail('浏览器语音识别已启动；当前浏览器不支持录音备份。')
        setVoiceStatus('正在录音，讲完后点完成解析')
      } else {
        setVoicePermission('unsupported')
        setVoicePermissionDetail('浏览器不支持录音或语音识别接口。')
        setVoiceStatus('当前 Safari 未开放麦克风录音，请允许麦克风权限或切到文字输入')
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      setVoicePermission('granted')
      setVoicePermissionDetail('麦克风权限已允许。')
      const mimeType = getSupportedAudioMimeType()
      audioMimeTypeRef.current = mimeType || 'audio/webm'
      mediaStreamRef.current = stream
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      let speechStarted = false
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onstart = () => {
        setListening(true)
        startVoiceTimer()
        setVoiceStatus(speechStarted ? '正在录音，Safari 识别和 AI 转写双保险' : '正在录音，完成后将上传 AI 转文字')
      }
      recorder.onerror = () => {
        setVoiceStatus('录音发生错误，可以再试一次或切到文字输入')
      }
      recorder.start()
      speechStarted = startBrowserRecognition()
    } catch (e: any) {
      const mapped = mapMicrophoneError(e)
      setVoicePermission(mapped.state)
      setVoicePermissionDetail(mapped.detail)
      setListening(false)
      stopVoiceTimer()
      stopMediaTracks()
      setVoiceStatus(mapped.detail)
    }
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
    <main className="fixed inset-0 overflow-hidden bg-[#070a12] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(91,140,255,0.18),transparent_28%),linear-gradient(145deg,#070a12_0%,#0b1020_55%,#070a12_100%)]" />
      <div className="relative mx-auto grid h-full min-h-0 max-w-[1440px] grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_390px]">
        <DesktopNav activeTab={activeTab} setActiveTab={setActiveTab} totals={totals} />

        <section className="min-h-0 min-w-0 overflow-y-auto px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[max(env(safe-area-inset-top),1.25rem)] custom-scrollbar sm:px-6 lg:h-full lg:px-8 lg:pb-8 lg:pt-7">
          <TopBar loading={loading} onReload={loadData} onExport={exportCsv} />
          {error ? (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <span>{error}</span>
              <button className="rounded-md p-1 hover:bg-white/10" onClick={() => setError('')} aria-label="关闭错误">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {activeTab === 'record' ? RecordView() : null}
          {activeTab === 'stats' ? StatsView() : null}
          {activeTab === 'history' ? HistoryView() : null}
          {activeTab === 'settings' ? SettingsView() : null}
        </section>

        <aside className="hidden h-full overflow-y-auto border-l border-white/10 bg-white/[0.035] px-5 py-7 custom-scrollbar lg:block">
          {ManualForm({ compact: true })}
        </aside>
      </div>

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {SmartDialog()}
    </main>
  )

  function RecordView() {
    return (
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {SummaryCard()}
          <div className="grid grid-cols-2 gap-3">
            <button
              className="group flex min-h-[86px] items-center justify-center gap-3 rounded-lg border border-emerald-300/15 bg-white/[0.055] px-4 text-left shadow-card transition hover:border-emerald-300/45 hover:bg-white/[0.08]"
              onClick={openTextSmartDialog}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
                <Sparkles className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">智能识别</span>
                <span className="mt-1 block text-xs text-slate-400">一句话生成账单</span>
              </span>
            </button>
            <button
              className="group flex min-h-[86px] items-center justify-center gap-3 rounded-lg border border-blue-300/15 bg-white/[0.055] px-4 text-left shadow-card transition hover:border-blue-300/45 hover:bg-white/[0.08]"
              onClick={startSpeech}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-400 text-slate-950">
                <Mic className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">语音输入</span>
                <span className="mt-1 block text-xs text-slate-400">{listening ? '正在听你说' : '适合路上快速记'}</span>
              </span>
            </button>
          </div>
          {TodayList()}
        </div>
        <div className="block lg:hidden xl:block">
          {ManualForm({})}
        </div>
      </div>
    )
  }

  function SummaryCard() {
    return (
      <section className="rounded-lg border border-white/10 bg-[linear-gradient(135deg,rgba(20,184,166,0.24),rgba(35,50,88,0.58)_50%,rgba(244,63,94,0.18))] p-5 shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-100/80">本月可报销支出</p>
            <div className="mt-3 text-4xl font-black tracking-normal sm:text-5xl">{formatMoney(totals.month)}</div>
          </div>
          <div className="rounded-lg border border-white/15 bg-black/20 px-3 py-2 text-right">
            <p className="text-xs text-slate-300">今日</p>
            <p className="mt-1 text-lg font-bold">{formatMoney(totals.today)}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <MiniMetric label="未提交" value={formatMoney(totals.unsubmitted)} tone="amber" />
          <MiniMetric label="已提交" value={formatMoney(totals.submitted)} tone="blue" />
          <MiniMetric label="已报销" value={formatMoney(totals.reimbursed)} tone="emerald" />
        </div>
      </section>
    )
  }

  function MiniMetric({ label, value, tone }: { label: string; value: string; tone: 'amber' | 'blue' | 'emerald' }) {
    const toneClass = {
      amber: 'text-amber-200 bg-amber-300/10',
      blue: 'text-blue-200 bg-blue-300/10',
      emerald: 'text-emerald-200 bg-emerald-300/10',
    }[tone]
    return (
      <div className={cn('rounded-lg px-3 py-2', toneClass)}>
        <p className="text-[11px] opacity-80">{label}</p>
        <p className="mt-1 truncate text-sm font-bold">{value}</p>
      </div>
    )
  }

  function TodayList() {
    return (
      <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">今日记录</h2>
            <p className="mt-1 text-xs text-slate-400">{totals.countToday} 笔 · {formatMoney(totals.today)}</p>
          </div>
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/10"
            onClick={() => setActiveTab('history')}
          >
            查看全部
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {todayExpenses.length ? (
            todayExpenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} compact />)
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
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">统计</h2>
              <p className="mt-1 text-sm text-slate-400">本月支出 · 按周和分类汇总</p>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2 text-right">
              <p className="text-xs text-slate-400">合计</p>
              <p className="font-bold">{formatMoney(totals.month)}</p>
            </div>
          </div>
          <div className="mt-6 grid h-52 grid-cols-5 items-end gap-4 rounded-lg bg-black/20 px-4 py-5">
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
          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
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
                      <div className="h-2 rounded-full bg-white/10">
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

          <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">行程报销</h3>
              <span className="text-xs text-slate-400">预算对比</span>
            </div>
            <div className="mt-4 space-y-3">
              {stats.tripTotals.length ? (
                stats.tripTotals.map(({ trip, amount }) => {
                  const percent = trip.budget > 0 ? Math.min(100, (amount / trip.budget) * 100) : 0
                  return (
                    <div key={trip.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{trip.name}</p>
                          <p className="mt-1 text-xs text-slate-400">{trip.destination || '未填写目的地'}</p>
                        </div>
                        <p className="font-bold">{formatMoney(amount)}</p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-white/10">
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
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black">历史</h2>
              <p className="mt-1 text-sm text-slate-400">{filteredExpenses.length} 笔 · {formatMoney(filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</p>
            </div>
            <div className="relative min-w-0 sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索标题、分类、金额"
                className="h-10 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none transition focus:border-emerald-300/60"
              />
            </div>
          </div>
        </section>
        <div className="space-y-4">
          {groupedExpenses.length ? (
            groupedExpenses.map(([date, list]) => (
              <section key={date} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="font-bold">{date}</h3>
                  <span className="text-sm font-semibold text-rose-200">-{formatMoney(list.reduce((sum, item) => sum + Number(item.amount || 0), 0)).replace('¥ ', '¥')}</span>
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
        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
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
              className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-emerald-300/60"
            />
            <select
              value={categoryForm.icon}
              onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
              className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none"
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
          <div className="mt-4 divide-y divide-white/10">
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
                    <button className="rounded-md px-3 py-2 text-xs text-slate-400 hover:bg-white/10" onClick={() => disableCategory(category)}>
                      停用
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
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
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-emerald-300/60"
              />
              <input
                value={tripForm.destination}
                onChange={(event) => setTripForm((current) => ({ ...current, destination: event.target.value }))}
                placeholder="目的地"
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none focus:border-emerald-300/60"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="date"
                value={tripForm.start_date}
                onChange={(event) => setTripForm((current) => ({ ...current, start_date: event.target.value }))}
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none"
              />
              <input
                type="date"
                value={tripForm.end_date}
                onChange={(event) => setTripForm((current) => ({ ...current, end_date: event.target.value }))}
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none"
              />
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={tripForm.budget}
                onChange={(event) => setTripForm((current) => ({ ...current, budget: event.target.value }))}
                placeholder="预算"
                className="h-10 rounded-md border border-white/10 bg-black/20 px-3 text-sm outline-none"
              />
            </div>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-400 px-3 text-sm font-bold text-slate-950 hover:bg-blue-300">
              <Plus className="h-4 w-4" />
              新增行程
            </button>
          </form>
          <div className="mt-4 space-y-2">
            {trips.map((trip) => (
              <div key={trip.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{trip.name}</p>
                    <p className="mt-1 text-xs text-slate-400">{trip.destination || '未填写目的地'} · {trip.start_date || '未定'} 至 {trip.end_date || '未定'}</p>
                  </div>
                  <button className="rounded-md p-2 text-slate-400 hover:bg-white/10" onClick={() => archiveTrip(trip)} aria-label="归档行程">
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
    return (
      <section className={cn('rounded-lg border border-white/10 bg-white/[0.045] p-4', compact && 'bg-transparent p-0')}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black">{form.id ? '编辑账单' : '手动记账'}</h2>
            <p className="mt-1 text-xs text-slate-400">出差支出、发票与报销状态一起记</p>
          </div>
          {form.id ? (
            <button
              className="rounded-md p-2 text-slate-400 hover:bg-white/10"
              onClick={() => setForm(makeBlankForm(activeCategories[0]?.id || '', trips[0]?.id || ''))}
              aria-label="退出编辑"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <form onSubmit={saveExpense} className="space-y-3">
          <div className="grid grid-cols-[1fr_1.3fr] gap-3">
            <Field label="金额">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) => patchForm({ amount: event.target.value })}
                placeholder="0.00"
                className="field-input text-lg font-black"
              />
            </Field>
            <Field label="标题">
              <input
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder="牛肉面 / 打车 / 酒店"
                className="field-input"
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="分类">
              <select value={form.category_id} onChange={(event) => patchForm({ category_id: event.target.value })} className="field-input">
                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </Field>
            <Field label="行程">
              <select value={form.trip_id} onChange={(event) => patchForm({ trip_id: event.target.value })} className="field-input">
                <option value="">不归属行程</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>{trip.name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="日期">
              <input type="date" value={form.expense_date} onChange={(event) => patchForm({ expense_date: event.target.value })} className="field-input" />
            </Field>
            <Field label="时间">
              <input type="time" value={form.expense_time} onChange={(event) => patchForm({ expense_time: event.target.value })} className="field-input" />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="支付">
              <select value={form.payment_method} onChange={(event) => patchForm({ payment_method: event.target.value })} className="field-input">
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </Field>
            <Field label="商户">
              <input value={form.merchant} onChange={(event) => patchForm({ merchant: event.target.value })} placeholder="可选" className="field-input" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="发票">
              <select value={form.invoice_status} onChange={(event) => patchForm({ invoice_status: event.target.value })} className="field-input">
                {invoiceOptions.map((status) => (
                  <option key={status} value={status}>{invoiceLabels[status]}</option>
                ))}
              </select>
            </Field>
            <Field label="报销">
              <select value={form.reimbursement_status} onChange={(event) => patchForm({ reimbursement_status: event.target.value })} className="field-input">
                {reimbursementOptions.map((status) => (
                  <option key={status} value={status}>{reimbursementLabels[status]}</option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-sm">
            <span className="flex items-center gap-2 text-slate-200">
              <BadgeCheck className="h-4 w-4 text-emerald-300" />
              计入报销
            </span>
            <input
              type="checkbox"
              checked={form.reimbursable}
              onChange={(event) => patchForm({ reimbursable: event.target.checked })}
              className="h-4 w-4 accent-emerald-400"
            />
          </label>
          <Field label="备注">
            <textarea
              value={form.note}
              onChange={(event) => patchForm({ note: event.target.value })}
              placeholder="发票抬头、同行人、项目说明等"
              rows={3}
              className="field-input min-h-[78px] resize-none py-2"
            />
          </Field>
          <Field label="票据链接">
            <input value={form.receipt_url} onChange={(event) => patchForm({ receipt_url: event.target.value })} placeholder="可放图片或网盘地址" className="field-input" />
          </Field>
          <button
            disabled={saving}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 text-sm font-black text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {form.id ? '保存修改' : '保存账单'}
          </button>
        </form>
      </section>
    )
  }

  function ExpenseRow({ expense, compact = false }: { expense: Expense; compact?: boolean }) {
    const Icon = getCategoryIcon(expense.category_icon)
    return (
      <article className="rounded-lg border border-white/10 bg-black/20 p-3 transition hover:border-white/20 hover:bg-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${expense.category_color || '#94a3b8'}33`, color: expense.category_color || '#94a3b8' }}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold">{expense.title}</p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {expense.expense_time || '--:--'} · {expense.category_name || '未分类'}{expense.trip_name ? ` · ${expense.trip_name}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="font-black text-rose-200">-{formatMoney(expense.amount).replace('¥ ', '¥')}</p>
                <p className="mt-1 text-xs text-slate-500">{reimbursementLabels[expense.reimbursement_status] || expense.reimbursement_status}</p>
              </div>
            </div>
            {!compact ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">{invoiceLabels[expense.invoice_status] || expense.invoice_status}</span>
                <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-slate-300">{expense.payment_method}</span>
                <button className="ml-auto rounded-md p-2 text-slate-400 hover:bg-white/10" onClick={() => editExpense(expense)} aria-label="编辑">
                  <Pencil className="h-4 w-4" />
                </button>
                {expense.reimbursement_status === 'unsubmitted' ? (
                  <button className="rounded-md px-2 py-1 text-xs text-blue-200 hover:bg-blue-400/10" onClick={() => quickStatus(expense, 'submitted')}>标记提交</button>
                ) : null}
                {expense.reimbursement_status === 'submitted' ? (
                  <button className="rounded-md px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-400/10" onClick={() => quickStatus(expense, 'reimbursed')}>标记报销</button>
                ) : null}
                <button className="rounded-md p-2 text-slate-400 hover:bg-red-400/10 hover:text-red-200" onClick={() => deleteExpense(expense)} aria-label="删除">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </article>
    )
  }

  function VoicePermissionPanel() {
    const tone =
      voicePermission === 'granted'
        ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
        : voicePermission === 'checking' || voicePermission === 'prompt' || voicePermission === 'unknown'
          ? 'border-amber-300/20 bg-amber-400/10 text-amber-100'
          : 'border-red-300/20 bg-red-400/10 text-red-100'
    const Icon = voicePermission === 'granted' ? CheckCircle2 : voicePermission === 'checking' ? Loader2 : Settings

    return (
      <div className={cn('mb-3 rounded-lg border p-3 text-sm', tone)}>
        <div className="flex items-start gap-3">
          <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', voicePermission === 'checking' && 'animate-spin')} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              {voicePermission === 'granted'
                ? '麦克风权限正常'
                : voicePermission === 'insecure'
                  ? '当前地址不能使用麦克风'
                  : voicePermission === 'denied'
                    ? '麦克风权限未放行'
                    : voicePermission === 'unsupported'
                      ? '浏览器不支持麦克风'
                      : voicePermission === 'busy'
                        ? '麦克风被占用'
                        : '等待检查麦克风权限'}
            </p>
            <p className="mt-1 leading-relaxed text-current/80">{voicePermissionDetail}</p>
            {voicePermission !== 'granted' ? (
              <div className="mt-3 space-y-1 text-xs leading-relaxed text-current/75">
                <p>iPhone Safari 手动授权：</p>
                <p>1. 点地址栏左侧「大小」或「AA」→ 网站设置 → 麦克风 → 允许。</p>
                <p>2. 或到系统设置 → Safari → 麦克风，改成允许或询问。</p>
                <p>3. 如果当前不是 HTTPS 域名，请换 HTTPS 地址访问后再试。</p>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            className="h-9 rounded-md border border-current/20 px-3 text-xs font-semibold hover:bg-white/10 disabled:opacity-50"
            onClick={requestMicrophonePermission}
            disabled={listening || analyzing || voicePermission === 'checking'}
          >
            检查权限
          </button>
          <button className="h-9 rounded-md border border-current/20 px-3 text-xs font-semibold hover:bg-white/10" onClick={openTextSmartDialog}>
            文字输入
          </button>
        </div>
      </div>
    )
  }

  function SmartDialog() {
    if (!smartOpen) return null
    return (
      <div className="fixed inset-0 z-50 flex h-dvh items-end justify-center bg-black/70 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur-sm sm:items-center sm:p-6">
        <section className="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-lg border border-white/10 bg-[#101624] p-4 shadow-float custom-scrollbar sm:rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black">{smartMode === 'voice' ? '语音记账' : '智能记账'}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {smartMode === 'voice' ? voiceStatus : '输入一句话，AI 自动拆成账单字段'}
              </p>
            </div>
            <button className="rounded-md p-2 text-slate-400 hover:bg-white/10" onClick={closeSmartDialog} aria-label="关闭">
              <X className="h-4 w-4" />
            </button>
          </div>
          {smartMode === 'voice' ? (
            <div className="mt-6">
              {VoicePermissionPanel()}
              <div className="flex min-h-[270px] flex-col items-center justify-center rounded-lg border border-white/10 bg-black/20 px-4 py-6">
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
                      listening ? 'bg-emerald-400 text-slate-950' : 'bg-slate-700 text-slate-200'
                    )}
                    onClick={listening ? completeVoiceAndAnalyze : startSpeech}
                    disabled={analyzing}
                    aria-label={listening ? '完成录音' : '开始录音'}
                  >
                    {analyzing ? <Loader2 className="h-9 w-9 animate-spin" /> : <Mic className="h-10 w-10" />}
                  </button>
                </div>
                <div className="mt-6 text-center">
                  <p className="text-2xl font-black">{listening ? '正在录音' : analyzing ? '正在解析' : '语音待命'} {formatVoiceTime(recordingSeconds)}</p>
                  <p className="mt-2 text-sm text-slate-400">说出金额、标题、分类、发票或报销状态</p>
                </div>
                <div className="mt-5 w-full rounded-lg border border-white/10 bg-white/[0.05] px-3 py-3 text-left">
                  <p className="text-xs font-semibold text-slate-500">识别结果</p>
                  <p className={cn('mt-2 min-h-[44px] whitespace-pre-wrap text-base leading-relaxed', smartText ? 'text-slate-100' : 'text-slate-500')}>
                    {smartText || '识别到的文字会显示在这里；需要手动输入时点下方“切到文字输入”。'}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/10 text-sm font-semibold hover:bg-white/10 disabled:opacity-50"
                  onClick={startSpeech}
                  disabled={listening || analyzing}
                >
                  <RefreshCcw className="h-4 w-4" />
                  重新录音
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-400 text-sm font-bold text-slate-950 hover:bg-blue-300 disabled:opacity-60"
                  onClick={completeVoiceAndAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  完成并解析
                </button>
              </div>
              <button className="mt-3 h-10 w-full rounded-md text-sm text-slate-400 hover:bg-white/10" onClick={openTextSmartDialog}>
                切到文字输入
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4">
                <textarea
                  value={smartText}
                  onChange={(event) => setSmartText(event.target.value)}
                  onFocus={discardVoiceSession}
                  placeholder="例如：今天晚上客户招待吃饭 168 元 已开票"
                  rows={4}
                  className="min-h-[112px] w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-base leading-relaxed outline-none focus:border-emerald-300/60 sm:text-sm"
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/10 text-sm font-semibold hover:bg-white/10" onClick={startSpeech}>
                  <Mic className={cn('h-4 w-4', listening && 'text-emerald-300')} />
                  语音
                </button>
                <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-400 text-sm font-bold text-slate-950 hover:bg-blue-300" onClick={() => analyzeSmartText()} disabled={analyzing}>
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  解析
                </button>
              </div>
            </>
          )}
          {smartDraft ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">确认识别结果</p>
                <span className="text-xs text-slate-400">可回到表单再改</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <PreviewCell label="金额" value={formatMoney(smartDraft.amount)} />
                <PreviewCell label="标题" value={smartDraft.title} />
                <PreviewCell label="日期" value={smartDraft.expense_date} />
                <PreviewCell label="分类" value={activeCategories.find((item) => item.id === smartDraft.category_id)?.name || '未分类'} />
              </div>
              <button className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 text-sm font-black text-slate-950 hover:bg-emerald-300" onClick={applySmartDraft}>
                <CheckCircle2 className="h-4 w-4" />
                填入账单
              </button>
            </div>
          ) : null}
        </section>
      </div>
    )
  }

  function PreviewCell({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-md bg-white/[0.06] px-3 py-2">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="mt-1 truncate font-semibold">{value}</p>
      </div>
    )
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  )
}

function DesktopNav({ activeTab, setActiveTab, totals }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void; totals: { month: number; submitted: number; reimbursed: number } }) {
  return (
    <aside className="hidden h-dvh border-r border-white/10 bg-white/[0.035] px-5 py-7 lg:block">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-400 text-slate-950">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-lg font-black">myMoney</h1>
          <p className="text-xs text-slate-400">出差报销记账</p>
        </div>
      </div>
      <div className="mt-8 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white',
                activeTab === tab.key && 'bg-white/[0.12] text-white shadow-card'
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
      <div className="mt-8 rounded-lg border border-white/10 bg-black/20 p-4">
        <p className="text-xs text-slate-400">本月支出</p>
        <p className="mt-2 text-2xl font-black">{formatMoney(totals.month)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-blue-400/10 p-2 text-blue-100">
            <p className="opacity-70">已提交</p>
            <p className="mt-1 font-bold">{formatMoney(totals.submitted)}</p>
          </div>
          <div className="rounded-md bg-emerald-400/10 p-2 text-emerald-100">
            <p className="opacity-70">已报销</p>
            <p className="mt-1 font-bold">{formatMoney(totals.reimbursed)}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

function TopBar({ loading, onReload, onExport }: { loading: boolean; onReload: () => void; onExport: () => void }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">TRAVEL LEDGER</p>
        <h1 className="mt-1 truncate text-3xl font-black tracking-normal sm:text-4xl">记账</h1>
      </div>
      <div className="flex items-center gap-2">
        <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-slate-300 hover:bg-white/10" onClick={onReload} aria-label="刷新">
          <RefreshCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </button>
        <button className="hidden h-10 items-center gap-2 rounded-md border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-slate-300 hover:bg-white/10 sm:inline-flex" onClick={onExport}>
          <FileText className="h-4 w-4" />
          导出
        </button>
      </div>
    </header>
  )
}

function BottomNav({ activeTab, setActiveTab }: { activeTab: TabKey; setActiveTab: (tab: TabKey) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#090d18]/95 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-lg bg-white/[0.06] p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              className={cn(
                'flex h-12 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-semibold text-slate-400 transition',
                activeTab === tab.key && 'bg-white/[0.14] text-white'
              )}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" />
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
    <div className="flex min-h-[128px] flex-col items-center justify-center rounded-lg border border-dashed border-white/10 bg-black/15 px-4 py-6 text-center">
      <Icon className="h-8 w-8 text-slate-500" />
      <p className="mt-3 font-semibold text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-slate-500">{detail}</p>
    </div>
  )
}
