import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { expenseSelect, normalizeExpensePayload } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: '无效账单编号' }, { status: 400 })
    }
    const payload = normalizeExpensePayload(await req.json())
    const result = await execute(
      'UPDATE my_money_expenses SET trip_id = $1, category_id = $2, amount = $3, title = $4, merchant = $5, expense_date = $6, expense_time = NULLIF($7, \'\')::time, payment_method = $8, invoice_status = $9, reimbursement_status = $10, note = $11, receipt_url = $12, screenshot_url = $13, updated_at = now() WHERE id = $14 AND user_id = $15',
      [
        payload.tripId,
        payload.categoryId,
        payload.amount,
        payload.title,
        payload.merchant,
        payload.expenseDate,
        payload.expenseTime,
        payload.paymentMethod,
        payload.invoiceStatus,
        payload.reimbursementStatus,
        payload.note,
        payload.receiptUrl,
        payload.screenshotUrl,
        id,
        user.userId,
      ]
    )
    if (result.rowCount === 0) {
      return NextResponse.json({ message: '账单不存在' }, { status: 404 })
    }
    const rows = await query(`${expenseSelect} WHERE e.id = $1 AND e.user_id = $2`, [id, user.userId])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '更新账单失败') }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) {
      return NextResponse.json({ message: '无效账单编号' }, { status: 400 })
    }
    const result = await execute('DELETE FROM my_money_expenses WHERE id = $1 AND user_id = $2', [id, user.userId])
    if (result.rowCount === 0) {
      return NextResponse.json({ message: '账单不存在' }, { status: 404 })
    }
    return NextResponse.json({ message: '账单已删除' })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '删除账单失败') }, { status: 500 })
  }
}
