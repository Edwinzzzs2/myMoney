import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码。' }, { status: 400 })
    }

    const users = await query('SELECT id, username, password_hash FROM my_money_users WHERE username = $1', [username])
    if (users.length === 0) {
      return NextResponse.json({ error: '用户名或密码不正确。' }, { status: 401 })
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return NextResponse.json({ error: '用户名或密码不正确。' }, { status: 401 })
    }

    // Create JWT and set cookie
    const token = await signToken({ userId: user.id, username: user.username })
    await setAuthCookie(token)

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: '登录失败，请稍后重试。' }, { status: 500 })
  }
}
