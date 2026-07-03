import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { expenseSelect, normalizeExpensePayload } from '@/lib/money'

export async function GET() {
  try {
    const rows = await query(`${expenseSelect} ORDER BY e.expense_date DESC, e.created_at DESC, e.id DESC`)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取账单失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = normalizeExpensePayload(await req.json())
    const result = await execute(
      'INSERT INTO my_money_expenses (trip_id, category_id, amount, title, merchant, expense_date, expense_time, payment_method, invoice_status, reimbursement_status, reimbursable, note, receipt_url) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, \'\')::time, $8, $9, $10, $11, $12, $13) RETURNING id',
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
        payload.reimbursable,
        payload.note,
        payload.receiptUrl,
      ]
    )
    const rows = await query(`${expenseSelect} WHERE e.id = $1`, [result.rows[0]?.id])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存账单失败' }, { status: 400 })
  }
}
