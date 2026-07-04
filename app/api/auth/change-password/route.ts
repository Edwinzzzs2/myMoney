import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAuthenticatedUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { oldPassword, newPassword } = await request.json()

    if (!oldPassword || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    // Get user from DB to verify old password
    const rows = await query('SELECT password_hash FROM my_money_users WHERE id = $1', [user.userId])
    if (rows.length === 0) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    }

    const dbUser = rows[0]
    const valid = await bcrypt.compare(oldPassword, dbUser.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Incorrect old password.' }, { status: 400 })
    }

    // Hash new password and update
    const hash = await bcrypt.hash(newPassword, 10)
    await execute('UPDATE my_money_users SET password_hash = $1 WHERE id = $2', [hash, user.userId])

    return NextResponse.json({ success: true, message: 'Password updated successfully.' })
  } catch (error: any) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Failed to update password.' }, { status: 500 })
  }
}
