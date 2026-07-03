import { NextRequest, NextResponse } from 'next/server'
import { execute, query } from '@/lib/db'
import { tripSelect } from '@/lib/money'

export async function GET() {
  try {
    const rows = await query(`${tripSelect} WHERE status <> 'archived' ORDER BY created_at DESC, id DESC`)
    return NextResponse.json(rows)
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '获取行程失败' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const name = String(data?.name || '').trim()
    if (!name) return NextResponse.json({ message: '行程名称不能为空' }, { status: 400 })
    const result = await execute(
      'INSERT INTO my_money_trips (name, destination, start_date, end_date, budget, status) VALUES ($1, $2, NULLIF($3, \'\')::date, NULLIF($4, \'\')::date, $5, $6) RETURNING id',
      [
        name,
        data?.destination ? String(data.destination).trim() : null,
        data?.start_date || null,
        data?.end_date || null,
        Number.isFinite(Number(data?.budget)) ? Number(data.budget) : 0,
        String(data?.status || 'open').trim(),
      ]
    )
    const rows = await query(`${tripSelect} WHERE id = $1`, [result.rows[0]?.id])
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: e.message || '保存行程失败' }, { status: 400 })
  }
}
