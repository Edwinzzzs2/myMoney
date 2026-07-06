import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { query } from '@/lib/db'
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
const defaultDailyLimit = 20

function getDailyLimit() {
  const configuredLimit = Number(process.env.AI_DAILY_LIMIT)
  return Number.isInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : defaultDailyLimit
}

function getShanghaiDate() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function consumeDailyUsage(userId: string, dailyLimit: number) {
  const rows = await query(
    `INSERT INTO my_money_ai_daily_usage (user_id, usage_date, usage_count)
     VALUES ($1, $2::date, 1)
     ON CONFLICT (user_id, usage_date)
     DO UPDATE SET
       usage_count = my_money_ai_daily_usage.usage_count + 1,
       updated_at = now()
     WHERE my_money_ai_daily_usage.usage_count < $3
     RETURNING usage_count`,
    [userId, getShanghaiDate(), dailyLimit]
  )

  return rows[0] ? Number(rows[0].usage_count) : null
}

async function getDailyUsage(userId: string, dailyLimit: number) {
  const rows = await query(
    'SELECT usage_count FROM my_money_ai_daily_usage WHERE user_id = $1 AND usage_date = $2::date',
    [userId, getShanghaiDate()]
  )
  const usageCount = Number(rows[0]?.usage_count || 0)

  return {
    daily_limit: dailyLimit,
    daily_remaining: Math.max(dailyLimit - usageCount, 0),
  }
}

function getChatCompletionsUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  if (trimmed.endsWith('/chat/completions')) return trimmed
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`
  return `${trimmed}/v1/chat/completions`
}

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const objectStart = cleaned.indexOf('{')
    const objectEnd = cleaned.lastIndexOf('}')
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(cleaned.slice(objectStart, objectEnd + 1))
    }
    const arrayStart = cleaned.indexOf('[')
    const arrayEnd = cleaned.lastIndexOf(']')
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      return JSON.parse(cleaned.slice(arrayStart, arrayEnd + 1))
    }
    throw new Error('智能解析返回内容格式不正确')
  }
}

function getParsedExpenses(value: unknown): ParsedExpense[] {
  if (Array.isArray(value)) return value as ParsedExpense[]
  if (value && typeof value === 'object') {
    const result = value as { expenses?: unknown }
    if (Array.isArray(result.expenses)) return result.expenses as ParsedExpense[]
    if (result.expenses && typeof result.expenses === 'object') {
      return [result.expenses as ParsedExpense]
    }
    const expense = value as ParsedExpense
    if (expense.amount !== undefined || expense.title !== undefined) return [expense]
  }
  throw new Error('智能解析返回内容格式不正确')
}

function getUpstreamErrorMessage(detail: string, status: number) {
  const normalized = detail.trim()
  if (!normalized) return `AI 服务请求失败（${status}）`
  try {
    const parsed = JSON.parse(normalized)
    const upstreamMessage = parsed?.error?.message || parsed?.message || parsed?.error || parsed
    return typeof upstreamMessage === 'string' ? upstreamMessage : JSON.stringify(upstreamMessage)
  } catch {
    return normalized
  }
}

function normalizeParsedExpense(raw: ParsedExpense, request: Required<Pick<ParseRequest, 'today' | 'now'>> & ParseRequest) {
  const categories = request.categories || []
  const trips = request.trips || []
  const amount = Number(raw.amount)
  const categoryId = raw.category_id && categories.some((item) => item.id === String(raw.category_id)) ? String(raw.category_id) : categories[0]?.id || ''
  const tripId = request.default_trip_id && trips.some((item) => item.id === String(request.default_trip_id))
    ? String(request.default_trip_id)
    : trips[0]?.id || ''
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

export async function GET() {
  const user = await getAuthenticatedUser()
  if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

  try {
    return NextResponse.json(await getDailyUsage(user.userId, getDailyLimit()))
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '读取智能记账次数失败') }, { status: 500 })
  }
}

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
  if (text.length > 200) {
    return NextResponse.json({ message: '单次输入最多 200 字' }, { status: 400 })
  }
  const today = body.today || new Date().toISOString().slice(0, 10)
  const now = body.now || new Date().toTimeString().slice(0, 5)
  const categories = body.categories || []
  const trips = body.trips || []
  const endpoint = getChatCompletionsUrl(baseUrl)
  const dailyLimit = getDailyLimit()

  const systemPrompt =
    '你是出差报销记账助手。请将整段输入一次性解析为多个账单对象，每个独立消费事件对应一笔账单并保持原顺序。' +
    '账单之间可能使用换行、逗号、顿号、分号、句号或连续自然语言分隔；同一行可以包含多笔账单，不能按输入行数决定账单数量。' +
    '语音识别文本可能完全没有标点，请结合每个金额及“元、块”等单位、消费名称变化和时间日期变化主动拆分。' +
    '例如“今天午饭35元打车去机场56元咖啡18元”必须解析为午饭、打车、咖啡三笔账单。' +
    '只返回 JSON 对象，不要解释。返回格式必须是 {"expenses":[...]}，不能合并或遗漏任何一笔独立消费。' +
    '金额用数字，日期用 YYYY-MM-DD，时间用 HH:mm。' +
    '每笔账单的 note 应填写该笔消费在输入中的对应原始描述片段。' +
    'invoice_status 只能是 pending/received/none，reimbursement_status 只能是 pending/reimbursed。' +
    '如果用户提到已开票/有发票/发票到了，用 received；无票/没有发票用 none；否则 pending。' +
    '如果用户提到已报销，用 reimbursed；否则 reimbursement_status 默认 pending。默认 payment_method 是 个人垫付，默认 reimbursable 是 true。' +
    'category_id 必须从给定分类中选择。trip_id 必须始终使用 default_trip_id；如果 default_trip_id 为空，才使用给定行程中的第一个。'

  const userPrompt = JSON.stringify({
    text,
    today,
    now,
    categories,
    trips,
    default_trip_id: body.default_trip_id || trips[0]?.id || '',
    output_schema: {
      expenses: [{
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
      }],
    },
  })

  try {
    const usageCount = await consumeDailyUsage(user.userId, dailyLimit)
    if (usageCount === null) {
      return NextResponse.json(
        {
          message: `今天的智能记账次数已用完（每天最多 ${dailyLimit} 次），请明天再试。`,
          ai_usage: {
            daily_limit: dailyLimit,
            daily_remaining: 0,
          },
        },
        { status: 429 }
      )
    }

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
    if (!response.ok && [400, 408, 500, 502, 503, 504].includes(response.status)) {
      response = await callAi(false)
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      return NextResponse.json(
        {
          message: getUpstreamErrorMessage(detail, response.status),
          upstream_status: response.status,
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ message: 'AI 没有返回可解析的内容，请重试' }, { status: 502 })
    }

    const rawExpenses = getParsedExpenses(extractJson(content))
    if (!rawExpenses.length || rawExpenses.length > 100) {
      throw new Error('智能解析返回的账单数量不正确')
    }
    const expenses = rawExpenses.map((expense) => normalizeParsedExpense(
      expense,
      { ...body, text, today, now }
    ))
    const dailyRemaining = Math.max(dailyLimit - usageCount, 0)
    return NextResponse.json({
      expenses,
      ai_usage: {
        daily_limit: dailyLimit,
        daily_remaining: dailyRemaining,
      },
    }, {
      headers: {
        'X-AI-Daily-Limit': String(dailyLimit),
        'X-AI-Daily-Remaining': String(dailyRemaining),
      },
    })
  } catch (e: any) {
    const message = e instanceof Error ? e.message : String(e || '智能解析异常')
    return NextResponse.json({ message }, { status: 502 })
  }
}
