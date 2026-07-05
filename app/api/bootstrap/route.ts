import { NextResponse } from 'next/server'
import { buildSummary, getBootstrapData } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ authenticated: false, message: '请先登录后再操作。' }, { status: 401 })
    }

    const data = await getBootstrapData(user.userId)
    return NextResponse.json({ authenticated: true, user, ...data, summary: buildSummary(data.expenses) })
  } catch (e: any) {
    console.error('Bootstrap error:', e)
    return NextResponse.json({ message: friendlyErrorMessage(e, '初始化数据失败') }, { status: 500 })
  }
}
