import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { categorySelect } from '@/lib/money'
import { getAuthenticatedUser } from '@/lib/auth'
import { friendlyErrorMessage } from '@/lib/errors'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })
    
    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效分类编号' }, { status: 400 })
    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '分类名称不能为空' }, { status: 400 })
    const result = await execute(
      'UPDATE my_money_categories SET name = $1, icon = $2, color = $3, sort_order = $4, is_active = $5 WHERE id = $6 AND user_id = $7',
      [
        name,
        String(data?.icon || 'more').trim(),
        String(data?.color || '#94a3b8').trim(),
        Number.isFinite(Number(data?.sort_order)) ? Number(data.sort_order) : 99,
        data?.is_active !== false,
        id,
        user.userId,
      ]
    )
    if (result.rowCount === 0) return NextResponse.json({ message: '分类不存在' }, { status: 404 })
    const rows = await query(`${categorySelect} WHERE id = $1 AND user_id = $2`, [id, user.userId])
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '更新分类失败') }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return NextResponse.json({ message: '请先登录后再操作。' }, { status: 401 })

    const params = await context.params
    const id = Number(params.id)
    if (!Number.isInteger(id)) return NextResponse.json({ message: '无效分类编号' }, { status: 400 })
    const hardDelete = req.nextUrl.searchParams.get('hard') === '1'
    if (hardDelete) {
      const usageRows = await query('SELECT COUNT(*)::int AS count FROM my_money_expenses WHERE category_id = $1 AND user_id = $2', [id, user.userId])
      const usageCount = usageRows[0]?.count || 0
      if (usageCount > 0) return NextResponse.json({ message: `分类已被 ${usageCount} 笔账单使用，不能删除` }, { status: 409 })
      const deleteResult = await execute('DELETE FROM my_money_categories WHERE id = $1 AND is_active = FALSE AND user_id = $2', [id, user.userId])
      if (deleteResult.rowCount === 0) return NextResponse.json({ message: '归档分类不存在' }, { status: 404 })
      return NextResponse.json({ message: '归档分类已删除' })
    }
    const result = await execute('UPDATE my_money_categories SET is_active = FALSE WHERE id = $1 AND user_id = $2', [id, user.userId])
    if (result.rowCount === 0) return NextResponse.json({ message: '分类不存在' }, { status: 404 })
    return NextResponse.json({ message: '分类已停用' })
  } catch (e: any) {
    return NextResponse.json({ message: friendlyErrorMessage(e, '停用分类失败') }, { status: 500 })
  }
}
