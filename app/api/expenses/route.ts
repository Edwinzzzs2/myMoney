import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { expenseSelect, normalizeExpensePayload } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const rows = await query(`${expenseSelect} WHERE e.user_id = $1 ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC`, [user.userId])
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取账单失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const payload = normalizeExpensePayload(await req.json())
    const result = await execute(
      'INSERT INTO my_money_expenses (user_id, trip_id, category_id, amount, title, merchant, expense_date, expense_time, payment_method, invoice_status, reimbursement_status, reimbursable, note, receipt_url) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, \'\')::time, $9, $10, $11, $12, $13, $14) RETURNING id',
      [
        user.userId,
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
        payload.reimbursable,
        payload.note,
        payload.receiptUrl,
      ]
    )
    const rows = await query(`${expenseSelect} WHERE e.id = $1 AND e.user_id = $2`, [result.rows[0]?.id, user.userId])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存账单失败' }, { status: 400 })
  }
}

export async function DELETE() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    await execute('DELETE FROM my_money_expenses WHERE user_id = $1', [user.userId])
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '清空账单失败' }, { status: 500 })
  }
}
