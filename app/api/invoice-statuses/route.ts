import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { invoiceStatusSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'

function makeCustomInvoiceValue() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const rows = await query(`${invoiceStatusSelect} WHERE user_id = $1 ORDER BY sort_order ASC, id ASC`, [user.userId])
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取发票状态失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const label = String(data?.label || '').trim()
    if (!label) return NextResponse.json({ message: '发票状态不能为空' }, { status: 400 })
    const rawValue = String(data?.value || '').trim()
    const value = rawValue || makeCustomInvoiceValue()
    const sortOrder = Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99

    const result = await execute(
      'INSERT INTO my_money_invoice_statuses (user_id, value, label, sort_order, is_active) VALUES ($1, $2, $3, $4, TRUE) ' +
        'ON CONFLICT (user_id, value) DO UPDATE SET label = EXCLUDED.label, is_active = TRUE, sort_order = EXCLUDED.sort_order, updated_at = now() RETURNING id',
      [user.userId, value, label, sortOrder]
    )
    const rows = await query(`${invoiceStatusSelect} WHERE id = $1 AND user_id = $2`, [result.rows[0]?.id, user.userId])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存发票状态失败' }, { status: 400 })
  }
}
