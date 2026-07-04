import { NextResponse } from 'next/server'
import { query, initializeUserDefaultData } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { signToken, setAuthCookie } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password || username.length < 3 || password.length < 6) {
      return NextResponse.json(
        { error: 'Username must be at least 3 chars and password at least 6 chars.' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existing = await query('SELECT id FROM my_money_users WHERE username = $1', [username])
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Username already taken.' }, { status: 400 })
    }

    // Hash password and insert
    const hash = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO my_money_users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hash]
    )

    const userId = result[0].id

    // Initialize user default categories and trip
    await initializeUserDefaultData(userId)

    // Create JWT and set cookie
    const token = await signToken({ userId, username })
    await setAuthCookie(token)

    return NextResponse.json({ success: true, user: { id: userId, username } })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Failed to register.' }, { status: 500 })
  }
}
