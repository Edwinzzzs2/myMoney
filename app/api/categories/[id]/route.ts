import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { categorySelect } from '@/lib/money'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效分类 ID' }, { status: 400 })
    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '分类名称不能为空' }, { status: 400 })
    const result = await execute(
      'UPDATE my_money_categories SET name = $1, icon = $2, color = $3, sort_order = $4, is_active = $5 WHERE id = $6',
      [
        name,
        String(data?.icon || 'more').trim(),
        String(data?.color || '#94a3b8').trim(),
        Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99,
        data?.is_active !== false,
        id,
      ]
    )
    if (result.rowCount === 0) return NextResponse.json({ message: '分类不存在' }, { status: 404 })
    const rows = await query(`${categorySelect} WHERE id = $1`, [id])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '更新分类失败' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效分类 ID' }, { status: 400 })
    const result = await execute('UPDATE my_money_categories SET is_active = FALSE WHERE id = $1', [id])
    if (result.rowCount === 0) return NextResponse.json({ message: '分类不存在' }, { status: 404 })
    return NextResponse.json({ message: '分类已停用' })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '停用分类失败' }, { status: 500 })
  }
}
