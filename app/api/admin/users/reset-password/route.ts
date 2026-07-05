import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || user.username !== 'admin') {
      return NextResponse.json({ error: '没有权限执行此操作。' }, { status: 403 })
    }

    const { targetUserId, newPassword } = await request.json()

    if (!targetUserId || !newPassword || newPassword.length < 2) {
      return NextResponse.json(
        { error: '请选择用户，并输入至少 2 位的新密码。' },
        { status: 400 }
      )
    }

    // Verify user exists
    const existing = await query('SELECT username FROM my_money_users WHERE id = $1', [targetUserId])
    if (existing.length === 0) {
      return NextResponse.json({ error: '目标用户不存在。' }, { status: 404 })
    }

    const targetUser = existing[0]
    if (targetUser.username === 'admin' && user.userId !== String(targetUserId)) {
      // Prevent other admins or external triggers resetting admin unless it's themselves,
      // though username === 'admin' is the only admin in this setup.
      return NextResponse.json({ error: '不能通过此入口重置管理员密码。' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await execute('UPDATE my_money_users SET password_hash = $1 WHERE id = $2', [hash, targetUserId])

    return NextResponse.json({ success: true, message: '用户密码已重置。' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: '重置密码失败。' }, { status: 500 })
  }
}
