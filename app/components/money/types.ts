export type TabKey = 'record' | 'stats' | 'history' | 'settings'

export type Category = {
  id: string
  name: string
  icon: string
  color: string
  sort_order: number
  is_active: boolean
}

export type Trip = {
  id: string
  name: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  budget: number
  status: string
}

export type PaymentMethod = {
  id: string
  name: string
  sort_order: number
  is_active: boolean
}

export type InvoiceStatus = {
  id: string
  value: string
  label: string
  sort_order: number
  is_active: boolean
}

export type Expense = {
  id: string
  trip_id: string | null
  category_id: string | null
  amount: number
  currency: string
  title: string
  merchant: string | null
  expense_date: string
  expense_time: string | null
  payment_method: string
  invoice_status: string
  reimbursement_status: string
  reimbursable: boolean
  note: string | null
  receipt_url: string | null
  category_name: string | null
  category_icon: string | null
  category_color: string | null
  trip_name: string | null
  destination: string | null
}

export type BootstrapData = {
  categories: Category[]
  trips: Trip[]
  archivedTrips: Trip[]
  paymentMethods: PaymentMethod[]
  invoiceStatuses: InvoiceStatus[]
  expenses: Expense[]
}

export type ExpenseFormState = {
  id?: string
  trip_id: string
  category_id: string
  amount: string
  title: string
  merchant: string
  expense_date: string
  expense_time: string
  payment_method: string
  invoice_status: string
  reimbursement_status: string
  reimbursable: boolean
  note: string
  receipt_url: string
}

export type AiParsedExpense = Omit<Partial<ExpenseFormState>, 'amount'> & {
  amount?: string | number
  source?: string
}

export type SmartMode = 'text' | 'voice'

export type CategoryFormState = {
  name: string
  icon: string
  color: string
}

export type TripFormState = {
  name: string
  destination: string
  start_date: string
  end_date: string
  budget: string
}

export type Totals = {
  total: number
  month: number
  today: number
  reimbursable: number
  pendingReimbursement: number
  reimbursed: number
  countToday: number
}

export type StatsData = {
  categoryTotals: Array<{ category: Category; amount: number }>
  weekly: number[]
  tripTotals: Array<{ trip: Trip; amount: number }>
  maxWeek: number
}
