import { NextRequest, NextResponse } from 'next/server'
import { execute, transaction } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'
import { normalizeExpensePayload } from '@/lib/money'

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const data = await req.json()
    const expenses = Array.isArray(data?.expenses) ? data.expenses : []
    if (!expenses.length) {
      return NextResponse.json({ message: '请提供要添加的账单' }, { status: 400 })
    }
    if (expenses.length > 100) {
      return NextResponse.json({ message: '单次最多添加 100 笔账单' }, { status: 400 })
    }

    const payloads = expenses.map(normalizeExpensePayload)
    const ids = await transaction(async (conn) => {
      const createdIds: string[] = []
      for (const payload of payloads) {
        const result = await conn.query(
          'INSERT INTO my_money_expenses (user_id, trip_id, category_id, amount, title, merchant, expense_date, expense_time, payment_method, invoice_status, reimbursement_status, note, receipt_url, screenshot_url) ' +
            'VALUES ($1, $2, $3, $4, $5, $6, $7, NULLIF($8, \'\')::time, $9, $10, $11, $12, $13, $14) RETURNING id::text',
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
            payload.note,
            payload.receiptUrl,
            payload.screenshotUrl,
          ]
        )
        createdIds.push(result.rows[0].id)
      }
      return createdIds
    })

    return NextResponse.json({ createdCount: ids.length, ids }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '批量添加账单失败') }, { status: 400 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const data = await req.json()
    const ids = Array.from(new Set((Array.isArray(data?.ids) ? data.ids : []).map((id: any) => Number(id)))).filter(Number.isInteger)
    const reimbursementStatus = String(data?.reimbursement_status || '').trim()

    if (!ids.length) return NextResponse.json({ message: '请选择账单' }, { status: 400 })
    if (!['pending', 'reimbursed'].includes(reimbursementStatus)) {
      return NextResponse.json({ message: '无效报销状态' }, { status: 400 })
    }

    const result = await execute(
      'UPDATE my_money_expenses SET reimbursement_status = $1, updated_at = now() WHERE user_id = $2 AND id = ANY($3::bigint[])',
      [reimbursementStatus, user.userId, ids]
    )

    return NextResponse.json({ updatedCount: result.rowCount })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '批量更新失败') }, { status: 500 })
  }
}
