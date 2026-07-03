import { Pool, PoolClient } from 'pg'

type QueryValues = any[] | undefined

let pool: Pool | null = null
let initPromise: Promise<void> | null = null

const defaultCategories = [
  { name: '餐饮', icon: 'utensils', color: '#fb7a2a', sort_order: 0 },
  { name: '交通', icon: 'car', color: '#24c7b8', sort_order: 1 },
  { name: '住宿', icon: 'hotel', color: '#5b8cff', sort_order: 2 },
  { name: '机票高铁', icon: 'plane', color: '#8b5cf6', sort_order: 3 },
  { name: '办公采购', icon: 'briefcase', color: '#f59e0b', sort_order: 4 },
  { name: '通讯网络', icon: 'wifi', color: '#22c55e', sort_order: 5 },
  { name: '招待', icon: 'receipt', color: '#f43f5e', sort_order: 6 },
  { name: '其他', icon: 'more', color: '#94a3b8', sort_order: 7 },
]

function getPool() {
  if (pool) return pool
  const host = process.env.DB_HOST
  const port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432
  const user = process.env.DB_USER
  const password = process.env.DB_PASSWORD
  const database = process.env.DB_NAME
  if (!host || !user || !database) {
    throw new Error('DB config missing')
  }
  pool = new Pool({ host, port, user, password, database, max: 10 })
  return pool
}

async function ensureInitialized() {
  if (initPromise) return initPromise

  initPromise = (async () => {
    const p = getPool()

    await p.query(
      'CREATE TABLE IF NOT EXISTS my_money_categories (\n' +
        '  id BIGSERIAL PRIMARY KEY,\n' +
        '  name VARCHAR(80) UNIQUE NOT NULL,\n' +
        '  icon VARCHAR(64) NOT NULL DEFAULT \'more\',\n' +
        '  color VARCHAR(32) NOT NULL DEFAULT \'#94a3b8\',\n' +
        '  sort_order INT NOT NULL DEFAULT 0,\n' +
        '  is_active BOOLEAN NOT NULL DEFAULT TRUE,\n' +
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT now()\n' +
        ')'
    )

    await p.query(
      'CREATE TABLE IF NOT EXISTS my_money_trips (\n' +
        '  id BIGSERIAL PRIMARY KEY,\n' +
        '  name TEXT NOT NULL,\n' +
        '  destination TEXT,\n' +
        '  start_date DATE,\n' +
        '  end_date DATE,\n' +
        '  budget NUMERIC(12, 2) NOT NULL DEFAULT 0,\n' +
        '  status VARCHAR(32) NOT NULL DEFAULT \'open\',\n' +
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n' +
        '  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\n' +
        ')'
    )

    await p.query(
      'CREATE TABLE IF NOT EXISTS my_money_expenses (\n' +
        '  id BIGSERIAL PRIMARY KEY,\n' +
        '  trip_id BIGINT REFERENCES my_money_trips(id) ON DELETE SET NULL,\n' +
        '  category_id BIGINT REFERENCES my_money_categories(id) ON DELETE SET NULL,\n' +
        '  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),\n' +
        '  currency VARCHAR(8) NOT NULL DEFAULT \'CNY\',\n' +
        '  title TEXT NOT NULL,\n' +
        '  merchant TEXT,\n' +
        '  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,\n' +
        '  expense_time TIME,\n' +
        '  payment_method VARCHAR(64) NOT NULL DEFAULT \'个人垫付\',\n' +
        '  invoice_status VARCHAR(32) NOT NULL DEFAULT \'pending\',\n' +
        '  reimbursement_status VARCHAR(32) NOT NULL DEFAULT \'unsubmitted\',\n' +
        '  reimbursable BOOLEAN NOT NULL DEFAULT TRUE,\n' +
        '  note TEXT,\n' +
        '  receipt_url TEXT,\n' +
        '  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),\n' +
        '  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()\n' +
        ')'
    )

    await p.query('CREATE INDEX IF NOT EXISTS idx_my_money_expenses_date ON my_money_expenses(expense_date DESC)')
    await p.query('CREATE INDEX IF NOT EXISTS idx_my_money_expenses_trip ON my_money_expenses(trip_id)')
    await p.query('CREATE INDEX IF NOT EXISTS idx_my_money_expenses_category ON my_money_expenses(category_id)')
    await p.query('CREATE INDEX IF NOT EXISTS idx_my_money_expenses_status ON my_money_expenses(reimbursement_status)')

    const categoryCount = await p.query('SELECT COUNT(*)::int AS count FROM my_money_categories')
    if (categoryCount.rows[0]?.count === 0) {
      for (const category of defaultCategories) {
        await p.query(
          'INSERT INTO my_money_categories (name, icon, color, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT (name) DO NOTHING',
          [category.name, category.icon, category.color, category.sort_order]
        )
      }
    }

    const tripCount = await p.query('SELECT COUNT(*)::int AS count FROM my_money_trips')
    if (tripCount.rows[0]?.count === 0) {
      await p.query(
        'INSERT INTO my_money_trips (name, destination, start_date, end_date, budget, status) VALUES ($1, $2, CURRENT_DATE, CURRENT_DATE, $3, $4)',
        ['默认出差', '待填写', 0, 'open']
      )
    }

    const tables = ['my_money_categories', 'my_money_trips', 'my_money_expenses']
    for (const table of tables) {
      await p.query(
        `SELECT setval(
          pg_get_serial_sequence($1, 'id'),
          COALESCE((SELECT MAX(id) FROM ${table}), 1),
          (SELECT MAX(id) FROM ${table}) IS NOT NULL
        )`,
        [table]
      )
    }
  })().catch((e) => {
    initPromise = null
    throw e
  })

  return initPromise
}

export async function query(sql: string, values?: QueryValues) {
  await ensureInitialized()
  const p = getPool()
  const result = await p.query(sql, values)
  return result.rows as any[]
}

export async function execute(sql: string, values?: QueryValues) {
  await ensureInitialized()
  const p = getPool()
  return p.query(sql, values)
}

export async function transaction<T>(fn: (conn: PoolClient) => Promise<T>) {
  await ensureInitialized()
  const p = getPool()
  const conn = await p.connect()
  try {
    await conn.query('BEGIN')
    const result = await fn(conn)
    await conn.query('COMMIT')
    return result
  } catch (e) {
    await conn.query('ROLLBACK')
    throw e
  } finally {
    conn.release()
  }
}
