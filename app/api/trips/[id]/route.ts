import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { tripSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效行程 ID' }, { status: 400 })
    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '行程名称不能为空' }, { status: 400 })
    const result = await execute(
      'UPDATE my_money_trips SET name = $1, destination = $2, start_date = NULLIF($3, \'\')::date, end_date = NULLIF($4, \'\')::date, budget = $5, status = $6, updated_at = now() WHERE id = $7 AND user_id = $8',
      [
        name,
        data?.destination ? String(data.destination).trim() : null,
        data?.start_date || null,
        data?.end_date || null,
        Number.isFinite(Number(data?.budget)) ? Number(data.budget) : 0,
        String(data?.status || 'open').trim(),
        id,
        user.userId,
      ]
    )
    if (result.rowCount === 0) return NextResponse.json({ message: '行程不存在' }, { status: 404 })
    const rows = await query(`${tripSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '更新行程失败' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效行程 ID' }, { status: 400 })
    const hardDelete = req.nextUrl.searchParams.get('hard') === '1'
    if (hardDelete) {
      const usageRows = await query('SELECT COUNT(*)::int AS count FROM my_money_expenses WHERE trip_id = $1 AND user_id = $2', [id, user.userId])
      const usageCount = usageRows[0]?.count || 0
      if (usageCount > 0) return NextResponse.json({ message: `行程已被 ${usageCount} 笔账单使用，不能删除` }, { status: 409 })
      const deleteResult = await execute('DELETE FROM my_money_trips WHERE id = $1 AND status = \'archived\' AND user_id = $2', [id, user.userId])
      if (deleteResult.rowCount === 0) return NextResponse.json({ message: '归档行程不存在' }, { status: 404 })
      return NextResponse.json({ message: '归档行程已删除' })
    }
    const result = await execute('UPDATE my_money_trips SET status = \'archived\', updated_at = now() WHERE id = $1 AND user_id = $2', [id, user.userId])
    if (result.rowCount === 0) return NextResponse.json({ message: '行程不存在' }, { status: 404 })
    return NextResponse.json({ message: '行程已归档' })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '归档行程失败' }, { status: 500 })
  }
}
