import { NextResponse } from 'next/server'
import { buildSummary, getBootstrapData } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ authenticated: false, message: 'Unauthorized' }, { status: 401 })
    }

    const data = await getBootstrapData(user.userId)
    return NextResponse.json({ authenticated: true, user, ...data, summary: buildSummary(data.expenses) })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '初始化数据失败' }, { status: 500 })
  }
}
