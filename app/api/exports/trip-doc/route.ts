import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'
import { expenseSelect, tripSelect } from '@/lib/money'
import { query } from '@/lib/db'
import { createReimbursementDocx } from '@/lib/reimbursement-docx'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const tripId = req.nextUrl.searchParams.get('tripId') || ''
    if (!/^\d+$/.test(tripId)) {
      return NextResponse.json({ message: '请选择要导出的行程' }, { status: 400 })
    }

    const trips = await query(`${tripSelect} WHERE user_id = $1 AND id = $2`, [user.userId, tripId])
    const trip = trips[0]
    if (!trip) {
      return NextResponse.json({ message: '行程不存在或无权导出' }, { status: 404 })
    }

    const expenses = await query(
      `${expenseSelect} WHERE e.user_id = $1 AND e.trip_id = $2 ORDER BY e.expense_date ASC, e.expense_time ASC NULLS LAST, e.created_at ASC, e.id ASC`,
      [user.userId, tripId]
    )
    if (!expenses.length) {
      return NextResponse.json({ message: '该行程没有可导出的账单' }, { status: 400 })
    }

    const docx = await createReimbursementDocx(trip, expenses)
    const filename = `${safeFileName(trip.name)}.docx`

    return new NextResponse(docx, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="export.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    console.error('Trip DOCX export error:', e)
    const message = friendlyErrorMessage(e, '导出报销文档失败')
    const status = message.includes('没有可导出') ? 400 : 500
    return NextResponse.json({ message }, { status })
  }
}

function safeFileName(value: string) {
  return (
    value
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 88) || '报销文档'
  )
}
