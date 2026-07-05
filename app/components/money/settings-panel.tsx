/**
 * 设置侧边抽屉面板：分类管理、行程管理、支付方式、发票状态、归档、用户信息、账户管理
 */
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/app/components/money/empty-state'
import { getCategoryIcon, iconMap } from '@/app/components/money/money-utils'
import type {
  Category,
  CategoryFormState,
  Expense,
  InvoiceStatus,
  PaymentMethod,
  SettingsPanel,
  Trip,
  TripFormState,
} from '@/app/components/money/types'
import {
  Archive,
  CreditCard,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CategoryIconValue = keyof typeof iconMap

const categoryIconOptions: Array<{ value: CategoryIconValue; label: string }> = [
  { value: 'utensils', label: '餐饮' },
  { value: 'car', label: '交通' },
  { value: 'hotel', label: '住宿' },
  { value: 'plane', label: '机票高铁' },
  { value: 'briefcase', label: '办公采购' },
  { value: 'wifi', label: '通讯网络' },
  { value: 'receipt', label: '票据' },
  { value: 'more', label: '其他' },
]

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value}</p>
    </div>
  )
}

interface SettingsPanelProps {
  settingsPanel: SettingsPanel
  user: { id: string; username: string } | null
  saving: boolean
  expenses: Expense[]
  // 分类
  activeCategories: Category[]
  archivedCategories: Category[]
  categoryForm: CategoryFormState
  onCategoryFormChange: (form: CategoryFormState) => void
  onSaveCategory: (event: FormEvent) => void
  onDisableCategory: (category: Category) => void
  onDeleteArchivedCategory: (category: Category) => void
  // 行程
  trips: Trip[]
  archivedTrips: Trip[]
  tripForm: TripFormState
  editingTripId: string | null
  onTripFormChange: (form: TripFormState) => void
  onSaveTrip: (event: FormEvent) => void
  onBeginEditTrip: (trip: Trip) => void
  onCancelEditTrip: () => void
  onArchiveTrip: (trip: Trip) => void
  onDeleteArchivedTrip: (trip: Trip) => void
  // 支付方式
  accountPaymentMethods: PaymentMethod[]
  activePaymentMethods: PaymentMethod[]
  paymentMethodForm: string
  editingPaymentMethodId: string | null
  onPaymentMethodFormChange: (value: string) => void
  onSavePaymentMethod: (event: FormEvent) => void
  onBeginEditPaymentMethod: (method: PaymentMethod) => void
  onCancelEditPaymentMethod: () => void
  onDeletePaymentMethod: (method: PaymentMethod) => void
  // 发票状态
  accountInvoiceStatuses: InvoiceStatus[]
  activeInvoiceStatuses: InvoiceStatus[]
  invoiceStatusForm: string
  editingInvoiceStatusId: string | null
  onInvoiceStatusFormChange: (value: string) => void
  onSaveInvoiceStatus: (event: FormEvent) => void
  onBeginEditInvoiceStatus: (status: InvoiceStatus) => void
  onCancelEditInvoiceStatus: () => void
  onDeleteInvoiceStatus: (status: InvoiceStatus) => void
  // 个人信息
  oldPassword: string
  newPassword: string
  confirmPassword: string
  pwdLoading: boolean
  pwdError: string
  pwdSuccess: string
  showOldPassword: boolean
  showNewPassword: boolean
  showConfirmPassword: boolean
  onOldPasswordChange: (v: string) => void
  onNewPasswordChange: (v: string) => void
  onConfirmPasswordChange: (v: string) => void
  onToggleShowOldPassword: () => void
  onToggleShowNewPassword: () => void
  onToggleShowConfirmPassword: () => void
  onPasswordChange: (event: FormEvent) => void
  // 用户管理
  adminUsers: any[]
  adminUsersLoading: boolean
  adminResetUserId: string | null
  adminNewPassword: string
  adminResetError: string
  adminResetSuccess: string
  adminResetLoading: boolean
  showAdminResetPassword: boolean
  onSetAdminResetUserId: (id: string | null) => void
  onAdminNewPasswordChange: (v: string) => void
  onToggleShowAdminResetPassword: () => void
  onAdminResetPassword: () => void
  onAdminDeleteUser: (id: string) => void
  // 关闭
  onClose: () => void
}

export function SettingsPanelDrawer({
  settingsPanel,
  user,
  saving,
  expenses,
  activeCategories,
  archivedCategories,
  categoryForm,
  onCategoryFormChange,
  onSaveCategory,
  onDisableCategory,
  onDeleteArchivedCategory,
  trips,
  archivedTrips,
  tripForm,
  editingTripId,
  onTripFormChange,
  onSaveTrip,
  onBeginEditTrip,
  onCancelEditTrip,
  onArchiveTrip,
  onDeleteArchivedTrip,
  accountPaymentMethods,
  activePaymentMethods,
  paymentMethodForm,
  editingPaymentMethodId,
  onPaymentMethodFormChange,
  onSavePaymentMethod,
  onBeginEditPaymentMethod,
  onCancelEditPaymentMethod,
  onDeletePaymentMethod,
  accountInvoiceStatuses,
  activeInvoiceStatuses,
  invoiceStatusForm,
  editingInvoiceStatusId,
  onInvoiceStatusFormChange,
  onSaveInvoiceStatus,
  onBeginEditInvoiceStatus,
  onCancelEditInvoiceStatus,
  onDeleteInvoiceStatus,
  oldPassword,
  newPassword,
  confirmPassword,
  pwdLoading,
  pwdError,
  pwdSuccess,
  showOldPassword,
  showNewPassword,
  showConfirmPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleShowOldPassword,
  onToggleShowNewPassword,
  onToggleShowConfirmPassword,
  onPasswordChange,
  adminUsers,
  adminUsersLoading,
  adminResetUserId,
  adminNewPassword,
  adminResetError,
  adminResetSuccess,
  adminResetLoading,
  showAdminResetPassword,
  onSetAdminResetUserId,
  onAdminNewPasswordChange,
  onToggleShowAdminResetPassword,
  onAdminResetPassword,
  onAdminDeleteUser,
  onClose,
}: SettingsPanelProps) {
  if (!settingsPanel) return null

  function getCategoryUsageCount(categoryId: string) {
    return expenses.filter((e) => e.category_id === categoryId).length
  }
  function getTripUsageCount(tripId: string) {
    return expenses.filter((e) => e.trip_id === tripId).length
  }
  function getPaymentMethodUsageCount(methodName: string) {
    return expenses.filter((e) => e.payment_method === methodName).length
  }
  function getInvoiceStatusUsageCount(statusValue: string) {
    return expenses.filter((e) => e.invoice_status === statusValue).length
  }

  const archivedItemCount = archivedCategories.length + archivedTrips.length

  const titleMap: Record<Exclude<SettingsPanel, null>, string> = {
    profile: '用户信息',
    categories: '分类管理',
    trips: '行程管理',
    archive: '归档数据',
    payment: '支付方式',
    invoice: '发票状态',
    users: '账户管理',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-sm animate-in fade-in duration-200 dark:bg-black/65"
      role="dialog"
      aria-modal="true"
      aria-label={titleMap[settingsPanel]}
    >
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭设置面板" onClick={onClose} />
      <div className="relative z-10 flex h-dvh w-full max-w-[430px] flex-col border-l border-slate-200/80 bg-[#f7f8f5] shadow-[0_24px_80px_rgba(15,23,42,0.24)] animate-in slide-in-from-right duration-200 dark:border-white/10 dark:bg-[#090d18] sm:m-4 sm:h-[calc(100dvh-2rem)] sm:rounded-xl sm:border">
        <div className="border-b border-slate-200/80 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] dark:border-white/10 sm:pt-4">
          <h3 className="text-xl font-semibold tracking-normal text-slate-950 dark:text-white">{titleMap[settingsPanel]}</h3>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">

          {/* 个人信息 */}
          {settingsPanel === 'profile' ? (
            <div className="space-y-5">
              <div className="rounded-lg border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-black/15">
                <p className="text-xs text-slate-500 dark:text-slate-400">当前登录用户</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{user?.username}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
                  <MiniStat label="账单" value={`${expenses.length} 笔`} />
                  <MiniStat label="分类" value={`${activeCategories.length} 个`} />
                  <MiniStat label="行程" value={`${trips.length} 个`} />
                </div>
              </div>

              <form onSubmit={onPasswordChange} className="space-y-3.5 rounded-lg border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-black/15">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">修改密码</h4>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">当前密码</label>
                  <div className="relative">
                    <Input
                      type={showOldPassword ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={(e) => onOldPasswordChange(e.target.value)}
                      placeholder="请输入当前密码"
                      required
                      className="h-9 pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onToggleShowOldPassword}>
                      {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">新密码</label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => onNewPasswordChange(e.target.value)}
                      placeholder="请输入新密码 (至少 2 位)"
                      required
                      className="h-9 pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onToggleShowNewPassword}>
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">确认新密码</label>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => onConfirmPasswordChange(e.target.value)}
                      placeholder="请再次输入新密码"
                      required
                      className="h-9 pr-10"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onToggleShowConfirmPassword}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {pwdError && <p className="text-xs font-semibold text-red-500">{pwdError}</p>}
                {pwdSuccess && <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pwdSuccess}</p>}
                <Button type="submit" disabled={pwdLoading || !oldPassword || !newPassword || !confirmPassword} className="h-9 w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600">
                  {pwdLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  确认修改
                </Button>
              </form>
            </div>
          ) : null}

          {/* 账户管理 */}
          {settingsPanel === 'users' ? (
            <div className="space-y-4">
              {adminUsersLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {adminUsers.map((u) => (
                    <div key={u.id} className="rounded-lg border border-slate-200/80 bg-white/70 p-3.5 dark:border-white/10 dark:bg-black/15">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">
                            {u.username}
                            {u.username === 'admin' ? <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[0.65rem] font-medium text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">管理员</span> : null}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">注册时间: {new Date(u.created_at).toLocaleDateString()}</p>
                        </div>
                        {u.username !== 'admin' ? (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                              onClick={() => {
                                onSetAdminResetUserId(u.id)
                                onAdminNewPasswordChange('')
                              }}
                            >
                              重置
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" onClick={() => onAdminDeleteUser(u.id)}>
                              删除
                            </Button>
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-3.5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2.5 dark:border-white/5 text-center text-xs">
                        <div>
                          <p className="text-slate-400">账单数</p>
                          <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{u.expenses_count}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">分类数</p>
                          <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{u.categories_count}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">行程数</p>
                          <p className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">{u.trips_count}</p>
                        </div>
                      </div>

                      {adminResetUserId === u.id ? (
                        <div className="mt-3.5 border-t border-slate-100 pt-3 dark:border-white/5 space-y-2">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">为 {u.username} 重置密码</p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showAdminResetPassword ? 'text' : 'password'}
                                value={adminNewPassword}
                                onChange={(e) => onAdminNewPasswordChange(e.target.value)}
                                placeholder="输入新密码 (至少2位)"
                                className="h-8 text-xs bg-white dark:bg-black/30 pr-8"
                                minLength={2}
                              />
                              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={onToggleShowAdminResetPassword}>
                                {showAdminResetPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <Button type="button" size="sm" className="h-8 shrink-0 text-xs bg-emerald-600 text-white hover:bg-emerald-700" onClick={onAdminResetPassword} disabled={adminResetLoading || adminNewPassword.length < 2}>
                              {adminResetLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                              确认
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onSetAdminResetUserId(null)}>
                              取消
                            </Button>
                          </div>
                          {adminResetError && <p className="text-xs text-red-500 font-semibold">{adminResetError}</p>}
                          {adminResetSuccess && <p className="text-xs text-emerald-600 font-semibold dark:text-emerald-400">{adminResetSuccess}</p>}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* 分类管理 */}
          {settingsPanel === 'categories' ? (
            <div className="space-y-3">
              <MiniStat label="可用分类" value={`${activeCategories.length} 个`} />
              <form onSubmit={onSaveCategory} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
                <Input value={categoryForm.name} onChange={(event) => onCategoryFormChange({ ...categoryForm, name: event.target.value })} placeholder="分类名称" className="h-10" />
                <div className="grid grid-cols-2 gap-2">
                  {categoryIconOptions.map((option) => {
                    const Icon = getCategoryIcon(option.value)
                    const selected = categoryForm.icon === option.value
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        className={cn(
                          'h-11 justify-start rounded-md border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-black/20 dark:text-slate-100 dark:hover:bg-white/10',
                          selected && 'border-transparent text-white shadow-sm hover:text-white dark:border-transparent dark:text-white'
                        )}
                        style={selected ? { backgroundColor: categoryForm.color } : undefined}
                        aria-pressed={selected}
                        onClick={() => onCategoryFormChange({ ...categoryForm, icon: option.value })}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </Button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-black/20">
                  <span className="min-w-0 flex-1 text-sm font-medium text-slate-600 dark:text-slate-300">分类颜色</span>
                  <Input type="color" value={categoryForm.color} onChange={(event) => onCategoryFormChange({ ...categoryForm, color: event.target.value })} className="h-9 w-14 p-1" aria-label="分类颜色" />
                </div>
                <Button type="submit" className="h-10 w-full bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !categoryForm.name.trim()}>
                  <Plus className="h-4 w-4" />
                  新增分类
                </Button>
              </form>
              <div className="grid gap-2">
                {activeCategories.map((category) => {
                  const Icon = getCategoryIcon(category.icon)
                  return (
                    <div key={category.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: category.color }}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onDisableCategory(category)} aria-label={`停用${category.name}`}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* 行程管理 */}
          {settingsPanel === 'trips' ? (
            <div className="space-y-3">
              <MiniStat label="行程" value={`${trips.length} 个`} />
              <form onSubmit={onSaveTrip} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
                <Input value={tripForm.name} onChange={(event) => onTripFormChange({ ...tripForm, name: event.target.value })} placeholder="行程名称" className="h-10" />
                <Input value={tripForm.destination} onChange={(event) => onTripFormChange({ ...tripForm, destination: event.target.value })} placeholder="目的地（可选）" className="h-10" />
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" value={tripForm.start_date} onChange={(event) => onTripFormChange({ ...tripForm, start_date: event.target.value })} className="h-10" />
                  <Input type="date" value={tripForm.end_date} onChange={(event) => onTripFormChange({ ...tripForm, end_date: event.target.value })} className="h-10" />
                </div>
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={tripForm.budget} onChange={(event) => onTripFormChange({ ...tripForm, budget: event.target.value })} placeholder="预算（可选）" className="h-10" />
                <div className="flex gap-2">
                  <Button type="submit" className="h-10 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !tripForm.name.trim()}>
                    <Plus className="h-4 w-4" />
                    {editingTripId ? '保存行程' : '新增行程'}
                  </Button>
                  {editingTripId ? (
                    <Button type="button" variant="outline" className="h-10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]" onClick={onCancelEditTrip}>
                      取消
                    </Button>
                  ) : null}
                </div>
              </form>
              <div className="grid gap-2">
                {trips.map((trip) => {
                  const usageCount = getTripUsageCount(trip.id)
                  return (
                    <div key={trip.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{trip.name}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{trip.destination || '未设置目的地'} · {usageCount} 笔账单</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onBeginEditTrip(trip)} aria-label={`编辑${trip.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onArchiveTrip(trip)} aria-label={`归档${trip.name}`}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* 支付方式 */}
          {settingsPanel === 'payment' ? (
            <div className="space-y-3">
              <MiniStat label="可用支付方式" value={`${activePaymentMethods.length} 种`} />
              <form onSubmit={onSavePaymentMethod} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
                <Input value={paymentMethodForm} onChange={(event) => onPaymentMethodFormChange(event.target.value)} placeholder="支付方式名称" className="h-10" />
                <div className="flex gap-2">
                  <Button type="submit" className="h-10 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !paymentMethodForm.trim()}>
                    <Plus className="h-4 w-4" />
                    {editingPaymentMethodId ? '保存方式' : '新增方式'}
                  </Button>
                  {editingPaymentMethodId ? (
                    <Button type="button" variant="outline" className="h-10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]" onClick={onCancelEditPaymentMethod}>
                      取消
                    </Button>
                  ) : null}
                </div>
              </form>
              <div className="grid gap-2">
                {activePaymentMethods.map((method) => {
                  const usageCount = getPaymentMethodUsageCount(method.name)
                  return (
                    <div key={method.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-400/15 dark:text-blue-200">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{method.name}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{usageCount} 笔账单</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onBeginEditPaymentMethod(method)} aria-label={`编辑${method.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onDeletePaymentMethod(method)} aria-label={`${usageCount > 0 ? '停用' : '删除'}${method.name}`}>
                        {usageCount > 0 ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* 发票状态 */}
          {settingsPanel === 'invoice' ? (
            <div className="space-y-3">
              <MiniStat label="可用发票状态" value={`${activeInvoiceStatuses.length} 个`} />
              <form onSubmit={onSaveInvoiceStatus} className="space-y-2 rounded-lg border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-black/15">
                <Input value={invoiceStatusForm} onChange={(event) => onInvoiceStatusFormChange(event.target.value)} placeholder="发票状态名称" className="h-10" />
                <div className="flex gap-2">
                  <Button type="submit" className="h-10 flex-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={saving || !invoiceStatusForm.trim()}>
                    <Plus className="h-4 w-4" />
                    {editingInvoiceStatusId ? '保存状态' : '新增状态'}
                  </Button>
                  {editingInvoiceStatusId ? (
                    <Button type="button" variant="outline" className="h-10 bg-white/70 dark:border-white/10 dark:bg-white/[0.045]" onClick={onCancelEditInvoiceStatus}>
                      取消
                    </Button>
                  ) : null}
                </div>
              </form>
              <div className="grid gap-2">
                {activeInvoiceStatuses.map((status) => {
                  const usageCount = getInvoiceStatusUsageCount(status.value)
                  return (
                    <div key={status.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
                        <FileCheck2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{status.label}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{usageCount} 笔账单</span>
                      </span>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onBeginEditInvoiceStatus(status)} aria-label={`编辑${status.label}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500" onClick={() => onDeleteInvoiceStatus(status)} aria-label={`${usageCount > 0 ? '停用' : '删除'}${status.label}`}>
                        {usageCount > 0 ? <Archive className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* 归档数据 */}
          {settingsPanel === 'archive' ? (
            <div className="space-y-4">
              <MiniStat label="归档数据" value={`${archivedItemCount} 项`} />

              <section className="space-y-2">
                <h4 className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">归档分类</h4>
                {archivedCategories.length ? (
                  archivedCategories.map((category) => {
                    const Icon = getCategoryIcon(category.icon)
                    const usageCount = getCategoryUsageCount(category.id)
                    return (
                      <div key={category.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white" style={{ backgroundColor: category.color }}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{category.name}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{usageCount > 0 ? `已被 ${usageCount} 笔账单使用` : '未被使用，可删除'}</span>
                        </span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 disabled:opacity-35" onClick={() => onDeleteArchivedCategory(category)} disabled={usageCount > 0} aria-label={`删除归档分类${category.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState icon={Archive} title="没有归档分类" detail="停用分类后会显示在这里。" />
                )}
              </section>

              <section className="space-y-2">
                <h4 className="px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">归档行程</h4>
                {archivedTrips.length ? (
                  archivedTrips.map((trip) => {
                    const usageCount = getTripUsageCount(trip.id)
                    return (
                      <div key={trip.id} className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2.5 dark:border-white/10 dark:bg-black/15">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200">
                          <MapPin className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{trip.name}</span>
                          <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{usageCount > 0 ? `已被 ${usageCount} 笔账单使用` : '未被使用，可删除'}</span>
                        </span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 disabled:opacity-35" onClick={() => onDeleteArchivedTrip(trip)} disabled={usageCount > 0} aria-label={`删除归档行程${trip.name}`}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState icon={Archive} title="没有归档行程" detail="归档行程后会显示在这里。" />
                )}
              </section>
            </div>
          ) : null}

        </div>
        <div className="border-t border-slate-200/80 bg-white/92 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 dark:border-white/10 dark:bg-[#090d18]/95">
          <Button type="button" variant="outline" className="h-11 w-full rounded-lg border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:hover:bg-white/[0.1]" onClick={onClose}>
            返回
          </Button>
        </div>
      </div>
    </div>
  )
}
