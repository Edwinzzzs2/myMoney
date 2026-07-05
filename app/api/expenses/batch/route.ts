import { NextRequest, NextResponse } from 'next/server'
import { execute } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

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
