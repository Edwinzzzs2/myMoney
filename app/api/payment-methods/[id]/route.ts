import { NextRequest, NextResponse } from 'next/server'
import { execute, query, transaction } from '@/lib/db'
import { paymentMethodSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效支付方式编号' }, { status: 400 })

    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '支付方式不能为空' }, { status: 400 })

    const currentRows = await query(`${paymentMethodSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    const currentMethod = currentRows[0]
    if (!currentMethod) return NextResponse.json({ message: '支付方式不存在' }, { status: 404 })

    await transaction(async (conn) => {
      await conn.query(
        'UPDATE my_money_payment_methods SET name = $1, sort_order = $2, is_active = $3, updated_at = now() WHERE id = $4 AND user_id = $5',
        [
          name,
          Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99,
          data?.is_active !== false,
          id,
          user.userId,
        ]
      )
      if (currentMethod.name !== name) {
        await conn.query('UPDATE my_money_expenses SET payment_method = $1, updated_at = now() WHERE payment_method = $2 AND user_id = $3', [name, currentMethod.name, user.userId])
      }
    })
    const rows = await query(`${paymentMethodSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '更新支付方式失败') }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效支付方式编号' }, { status: 400 })

    const rows = await query(`${paymentMethodSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    const method = rows[0]
    if (!method) return NextResponse.json({ message: '支付方式不存在' }, { status: 404 })

    const hardDelete = req.nextUrl.searchParams.get('hard') === '1'
    if (hardDelete) {
      const usageRows = await query('SELECT COUNT(*)::int AS count FROM my_money_expenses WHERE payment_method = $1 AND user_id = $2', [method.name, user.userId])
      const usageCount = usageRows[0]?.count || 0
      if (usageCount > 0) return NextResponse.json({ message: `支付方式已被 ${usageCount} 笔账单使用，不能删除` }, { status: 409 })
      await execute('DELETE FROM my_money_payment_methods WHERE id = $1 AND user_id = $2', [id, user.userId])
      return NextResponse.json({ message: '支付方式已删除' })
    }

    await execute('UPDATE my_money_payment_methods SET is_active = FALSE, updated_at = now() WHERE id = $1 AND user_id = $2', [id, user.userId])
    return NextResponse.json({ message: '支付方式已停用' })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '停用支付方式失败') }, { status: 500 })
  }
}
