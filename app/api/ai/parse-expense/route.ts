import { NextRequest, NextResponse } from 'next/server'
import { friendlyErrorMessage } from '@/lib/errors'

type CategoryInput = {
  id: string
  name: string
}

type TripInput = {
  id: string
  name: string
  destination?: string | null
}

type ParseRequest = {
  text?: string
  today?: string
  now?: string
  categories?: CategoryInput[]
  trips?: TripInput[]
  default_trip_id?: string
}

type ParsedExpense = {
  amount?: number
  title?: string
  merchant?: string
  category_id?: string
  trip_id?: string
  expense_date?: string
  expense_time?: string
  payment_method?: string
  invoice_status?: 'pending' | 'received' | 'none'
  reimbursement_status?: 'pending' | 'reimbursed'
  reimbursable?: boolean
  note?: string
  receipt_url?: string
}

const allowedInvoiceStatus = new Set(['pending', 'received', 'none'])
const allowedReimbursementStatus = new Set(['pending', 'reimbursed'])

function getChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.endsWith('/chat/completions')) return trimmed
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`
  return `${trimmed}/v1/chat/completions`
}

function extractJson(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1))
    }
    throw new Error('智能解析返回内容格式不正确')
  }
}

function normalizeParsedExpense(raw: ParsedExpense, request: Required<Pick<ParseRequest, 'today' | 'now'>> & ParseRequest) {
  const categories = request.categories || []
  const trips = request.trips || []
  const amount = Number(raw.amount)
  const categoryId = raw.category_id && categories.some((item) => item.id === String(raw.category_id)) ? String(raw.category_id) : categories[0]?.id || ''
  const tripId = raw.trip_id && trips.some((item) => item.id === String(raw.trip_id)) ? String(raw.trip_id) : request.default_trip_id || trips[0]?.id || ''
  const invoiceStatus = allowedInvoiceStatus.has(String(raw.invoice_status)) ? String(raw.invoice_status) : 'pending'
  const reimbursementStatus = allowedReimbursementStatus.has(String(raw.reimbursement_status)) ? String(raw.reimbursement_status) : 'pending'

  return {
    amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    title: String(raw.title || '').trim() || '出差支出',
    merchant: String(raw.merchant || '').trim(),
    category_id: categoryId,
    trip_id: tripId,
    expense_date: /^\d{4}-\d{2}-\d{2}$/.test(String(raw.expense_date || '')) ? String(raw.expense_date) : request.today,
    expense_time: /^\d{2}:\d{2}$/.test(String(raw.expense_time || '')) ? String(raw.expense_time) : request.now,
    payment_method: String(raw.payment_method || '个人垫付').trim(),
    invoice_status: invoiceStatus,
    reimbursement_status: reimbursementStatus,
    reimbursable: raw.reimbursable !== false,
    note: String(raw.note || request.text || '').trim(),
    receipt_url: String(raw.receipt_url || '').trim(),
    source: 'ai',
  }
}

import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

  const apiKey = process.env.AI_API_KEY?.trim()
  const baseUrl = process.env.AI_BASE_URL?.trim()
  const model = process.env.AI_MODEL?.trim() || 'gpt-4o-mini'

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ message: '智能解析服务未配置，请检查服务密钥和地址。' }, { status: 500 })
  }

  const body = (await req.json()) as ParseRequest
  const text = String(body.text || '').trim()
  if (!text) {
    return NextResponse.json({ message: '请提供要解析的语音文字' }, { status: 400 })
  }

  const today = body.today || new Date().toISOString().slice(0, 10)
  const now = body.now || new Date().toTimeString().slice(0, 5)
  const categories = body.categories || []
  const trips = body.trips || []
  const endpoint = getChatCompletionsUrl(baseUrl)

  const systemPrompt =
    '你是出差报销记账助手。把用户口述的中文账单解析为 JSON。只返回 JSON，不要解释。' +
    '金额用数字，日期用 YYYY-MM-DD，时间用 HH:mm。' +
    'invoice_status 只能是 pending/received/none，reimbursement_status 只能是 pending/reimbursed。' +
    '如果用户提到已开票/有发票/发票到了，用 received；无票/没有发票用 none；否则 pending。' +
    '如果用户提到已报销，用 reimbursed；否则 reimbursement_status 默认 pending。默认 payment_method 是 个人垫付，默认 reimbursable 是 true。' +
    'category_id 必须从给定分类中选择，trip_id 必须从给定行程中选择；不确定则用默认或第一个。'

  const userPrompt = JSON.stringify({
    text,
    today,
    now,
    categories,
    trips,
    default_trip_id: body.default_trip_id || trips[0]?.id || '',
    output_schema: {
      amount: 'number',
      title: 'string',
      merchant: 'string',
      category_id: 'string',
      trip_id: 'string',
      expense_date: 'YYYY-MM-DD',
      expense_time: 'HH:mm',
      payment_method: 'string',
      invoice_status: 'pending | received | none',
      reimbursement_status: 'pending | reimbursed',
      reimbursable: 'boolean',
      note: 'string',
      receipt_url: 'string',
    },
  })

  try {
    const requestBody = {
      model,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }

    const callAi = (withJsonMode: boolean) => fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        ...requestBody,
        ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    })

    let response = await callAi(true)
    if (!response.ok && response.status === 400) {
      response = await callAi(false)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return NextResponse.json({ message: `智能解析失败：${response.status}`, detail: detail.slice(0, 500) }, { status: 502 })
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ message: '智能解析没有返回内容' }, { status: 502 })
    }

    const parsed = normalizeParsedExpense(extractJson(content), { ...body, text, today, now })
    return NextResponse.json(parsed)
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '智能解析异常') }, { status: 502 })
  }
}
