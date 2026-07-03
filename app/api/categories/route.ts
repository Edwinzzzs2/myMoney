import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { categorySelect } from '@/lib/money'

export async function GET() {
  try {
    const rows = await query(`${categorySelect} ORDER BY sort_order ASC, id ASC`)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取分类失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '分类名称不能为空' }, { status: 400 })
    const color = String(data?.color || '#94a3b8').trim()
    const icon = String(data?.icon || 'more').trim()
    const sortOrder = Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99
    const result = await execute(
      'INSERT INTO my_money_categories (name, icon, color, sort_order) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, icon, color, sortOrder]
    )
    const rows = await query(`${categorySelect} WHERE id = $1`, [result.rows[0]?.id])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存分类失败' }, { status: 400 })
  }
}
