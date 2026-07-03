import { NextResponse } from 'next/server'
import { buildSummary, getBootstrapData } from '@/lib/money'

export async function GET() {
  try {
    const data = await getBootstrapData()
    return NextResponse.json({ ...data, summary: buildSummary(data.expenses) })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '初始化数据失败' }, { status: 500 })
  }
}
