import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { paymentMethodSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const rows = await query(`${paymentMethodSelect} WHERE user_id = $1 ORDER BY sort_order ASC, id ASC`, [user.userId])
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取支付方式失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '支付方式不能为空' }, { status: 400 })
    const sortOrder = Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99

    const result = await execute(
      'INSERT INTO my_money_payment_methods (user_id, name, sort_order, is_active) VALUES ($1, $2, $3, TRUE) ' +
        'ON CONFLICT (user_id, name) DO UPDATE SET is_active = TRUE, sort_order = EXCLUDED.sort_order, updated_at = now() RETURNING id',
      [user.userId, name, sortOrder]
    )
    const rows = await query(`${paymentMethodSelect} WHERE id = $1 AND user_id = $2`, [result.rows[0]?.id, user.userId])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存支付方式失败' }, { status: 400 })
  }
}
