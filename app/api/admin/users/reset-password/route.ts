import { NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser()
    if (!user || user.username !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { targetUserId, newPassword } = await request.json()

    if (!targetUserId || !newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Invalid parameters. Password must be at least 6 characters.' },
        { status: 400 }
      )
    }

    // Verify user exists
    const existing = await query('SELECT username FROM my_money_users WHERE id = $1', [targetUserId])
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Target user not found.' }, { status: 404 })
    }

    const targetUser = existing[0]
    if (targetUser.username === 'admin' && user.userId !== String(targetUserId)) {
      // Prevent other admins or external triggers resetting admin unless it's themselves,
      // though username === 'admin' is the only admin in this setup.
      return NextResponse.json({ error: 'Cannot reset admin password through this route.' }, { status: 400 })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await execute('UPDATE my_money_users SET password_hash = $1 WHERE id = $2', [hash, targetUserId])

    return NextResponse.json({ success: true, message: 'User password reset successfully.' })
  } catch (error: any) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 })
  }
}
