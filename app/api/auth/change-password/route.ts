import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: '请先登录后再修改密码。' }, { status: 401 })
    }

    const { oldPassword, newPassword } = await request.json()

    if (!oldPassword || !newPassword || newPassword.length < 2) {
      return NextResponse.json(
        { error: '新密码至少需要 2 位。' },
        { status: 400 }
      )
    }

    // Get user from DB to verify old password
    const rows = await query('SELECT password_hash FROM my_money_users WHERE id = $1', [user.userId])
    if (rows.length === 0) {
      return NextResponse.json({ error: '用户不存在。' }, { status: 404 })
    }

    const dbUser = rows[0]
    const valid = await bcrypt.compare(oldPassword, dbUser.password_hash)
    if (!valid) {
      return NextResponse.json({ error: '当前密码不正确。' }, { status: 400 })
    }

    // Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10)
    await execute('UPDATE my_money_users SET password_hash = $1 WHERE id = $2', [hash, user.userId])

    return NextResponse.json({ success: true, message: '密码修改成功。' })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: '修改密码失败，请稍后重试。' }, { status: 500 })
  }
}
