import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { tripSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const rows = await query(`${tripSelect} WHERE user_id = $1 AND status <> 'archived' ORDER BY created_at DESC, id DESC`, [user.userId])
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '获取行程失败') }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '行程名称不能为空' }, { status: 400 })
    const result = await execute(
      'INSERT INTO my_money_trips (user_id, name, destination, start_date, end_date, budget, status) VALUES ($1, $2, $3, NULLIF($4, \'\')::date, NULLIF($5, \'\')::date, $6, $7) RETURNING id',
      [
        user.userId,
        name,
        data?.destination ? String(data.destination).trim() : null,
        data?.start_date || null,
        data?.end_date || null,
        Number.isFinite(Number(data?.budget)) ? Number(data.budget) : 0,
        String(data?.status || 'open').trim(),
      ]
    )
    const rows = await query(`${tripSelect} WHERE id = $1 AND user_id = $2`, [result.rows[0]?.id, user.userId])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '保存行程失败') }, { status: 400 })
  }
}
