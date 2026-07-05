import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { invoiceStatusSelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效发票状态编号' }, { status: 400 })

    const data = await req.json()
    const label = String(data?.label || '').trim()
    if (!label) return NextResponse.json({ message: '发票状态不能为空' }, { status: 400 })

    const result = await execute(
      'UPDATE my_money_invoice_statuses SET label = $1, sort_order = $2, is_active = $3, updated_at = now() WHERE id = $4 AND user_id = $5',
      [
        label,
        Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99,
        data?.is_active !== false,
        id,
        user.userId,
      ]
    )
    if (result.rowCount === 0) return NextResponse.json({ message: '发票状态不存在' }, { status: 404 })
    const rows = await query(`${invoiceStatusSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '更新发票状态失败') }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效发票状态编号' }, { status: 400 })

    const rows = await query(`${invoiceStatusSelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    const status = rows[0]
    if (!status) return NextResponse.json({ message: '发票状态不存在' }, { status: 404 })

    const hardDelete = req.nextUrl.searchParams.get('hard') === '1'
    if (hardDelete) {
      const usageRows = await query('SELECT COUNT(*)::int AS count FROM my_money_expenses WHERE invoice_status = $1 AND user_id = $2', [status.value, user.userId])
      const usageCount = usageRows[0]?.count || 0
      if (usageCount > 0) return NextResponse.json({ message: `发票状态已被 ${usageCount} 笔账单使用，不能删除` }, { status: 409 })
      await execute('DELETE FROM my_money_invoice_statuses WHERE id = $1 AND user_id = $2', [id, user.userId])
      return NextResponse.json({ message: '发票状态已删除' })
    }

    await execute('UPDATE my_money_invoice_statuses SET is_active = FALSE, updated_at = now() WHERE id = $1 AND user_id = $2', [id, user.userId])
    return NextResponse.json({ message: '发票状态已停用' })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '停用发票状态失败') }, { status: 500 })
  }
}
