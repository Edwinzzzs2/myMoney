import { NextResponse } from 'next/server'
import { query, execute } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user || user.username !== 'admin') {
      return NextResponse.json({ error: '没有权限执行此操作。' }, { status: 403 })
    }

    // Query all users and aggregate some stats (number of categories, trips, and expenses)
    const sql = `
      SELECT 
        u.id, 
        u.username, 
        u.created_at,
        COALESCE(e.count, 0)::int AS expenses_count,
        COALESCE(c.count, 0)::int AS categories_count,
        COALESCE(t.count, 0)::int AS trips_count
      FROM my_money_users u
      LEFT JOIN (SELECT user_id, COUNT(*) AS count FROM my_money_expenses GROUP BY user_id) e ON e.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS count FROM my_money_categories GROUP BY user_id) c ON c.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS count FROM my_money_trips GROUP BY user_id) t ON t.user_id = u.id
      ORDER BY u.id ASC
    `
    const rows = await query(sql)
    return NextResponse.json(rows)
  } catch (error: any) {
    console.error('Fetch users error:', error)
    return NextResponse.json({ error: '获取用户列表失败。' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || user.username !== 'admin') {
      return NextResponse.json({ error: '没有权限执行此操作。' }, { status: 403 })
    }

    const { targetUserId } = await request.json()
    if (!targetUserId) {
      return NextResponse.json({ error: '请选择要操作的用户。' }, { status: 400 })
    }

    // Retrieve username to verify it's not admin
    const targetUser = await query('SELECT username FROM my_money_users WHERE id = $1', [targetUserId])
    if (targetUser.length === 0) {
      return NextResponse.json({ error: '用户不存在。' }, { status: 404 })
    }

    if (targetUser[0].username === 'admin') {
      return NextResponse.json({ error: '不能删除管理员账户。' }, { status: 400 })
    }

    await execute('DELETE FROM my_money_users WHERE id = $1', [targetUserId])
    return NextResponse.json({ success: true, message: '用户已删除。' })
  } catch (error: any) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: '删除用户失败。' }, { status: 500 })
  }
}
