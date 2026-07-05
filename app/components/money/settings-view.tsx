/**
 * 设置页面：设置菜单入口列表（非弹出面板内容）
 */
import type { ComponentType } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { Category, InvoiceStatus, PaymentMethod, SettingsPanel, Trip } from '@/app/components/money/types'
import {
  Archive,
  ChevronRight,
  CreditCard,
  FileCheck2,
  MapPin,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsViewProps {
  user: { id: string; username: string } | null
  isDark: boolean
  settingsPanel: SettingsPanel
  activeCategories: Category[]
  trips: Trip[]
  activePaymentMethods: PaymentMethod[]
  activeInvoiceStatuses: InvoiceStatus[]
  archivedItemCount: number
  adminUsers: any[]
  onSetSettingsPanel: (panel: SettingsPanel) => void
  onToggleTheme: (dark: boolean) => void
  onClearHistory: () => void
  onLogout: () => void
  onOpenUserPanel: () => void
  onOpenUsersPanel: () => void
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-sm font-medium text-slate-500 dark:text-slate-400">{title}</h3>
      <Card className="overflow-hidden rounded-lg border-slate-200/80 bg-white/80 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
        <div className="divide-y divide-slate-200/80 dark:divide-white/10">{children}</div>
      </Card>
    </section>
  )
}

function SettingRow({
  icon: Icon,
  label,
  detail,
  danger = false,
  active = false,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  detail?: string
  danger?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-slate-50 dark:hover:bg-white/[0.06]',
        active && 'bg-emerald-50/80 dark:bg-emerald-400/10'
      )}
      onClick={onClick}
    >
      <Icon className={cn('h-5 w-5 shrink-0', danger ? 'text-red-500' : 'text-slate-800 dark:text-slate-100')} />
      <span className="min-w-0 flex-1">
        <span className={cn('block text-sm font-medium', danger ? 'text-red-500' : 'text-slate-900 dark:text-slate-100')}>{label}</span>
        {detail ? <span className="mt-0.5 block truncate text-xs font-normal text-slate-500 dark:text-slate-400">{detail}</span> : null}
      </span>
      <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
    </Button>
  )
}

export function SettingsView({
  user,
  isDark,
  settingsPanel,
  activeCategories,
  trips,
  activePaymentMethods,
  activeInvoiceStatuses,
  archivedItemCount,
  adminUsers,
  onSetSettingsPanel,
  onToggleTheme,
  onClearHistory,
  onLogout,
  onOpenUserPanel,
  onOpenUsersPanel,
}: SettingsViewProps) {
  return (
    <div className="mx-auto max-w-[430px] space-y-4 lg:max-w-5xl">
      <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-white">设置</h2>

      <Card className="rounded-lg border-slate-200/80 bg-white/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-none">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            <User className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-950 dark:text-white">用户信息</p>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">用户名: {user?.username}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-400"
            onClick={onOpenUserPanel}
            aria-label="查看用户信息"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </Card>

      <SettingGroup title="账本设置">
        <SettingRow icon={SlidersHorizontal} label="分类管理" detail={`${activeCategories.length} 个可用分类`} active={settingsPanel === 'categories'} onClick={() => onSetSettingsPanel('categories')} />
        <SettingRow icon={MapPin} label="行程管理" detail={`${trips.length} 个行程`} active={settingsPanel === 'trips'} onClick={() => onSetSettingsPanel('trips')} />
        <SettingRow icon={CreditCard} label="支付方式" detail={`${activePaymentMethods.length} 种方式`} active={settingsPanel === 'payment'} onClick={() => onSetSettingsPanel('payment')} />
        <SettingRow icon={FileCheck2} label="发票状态" detail={activeInvoiceStatuses.map((status) => status.label).join(' / ') || '暂无状态'} active={settingsPanel === 'invoice'} onClick={() => onSetSettingsPanel('invoice')} />
      </SettingGroup>

      <SettingGroup title="数据管理">
        <SettingRow icon={Archive} label="归档数据" detail={`${archivedItemCount} 项归档`} active={settingsPanel === 'archive'} onClick={() => onSetSettingsPanel('archive')} />
        <SettingRow icon={Trash2} label="清空历史数据" danger detail="保留分类与行程" onClick={onClearHistory} />
      </SettingGroup>

      {user?.username === 'admin' ? (
        <SettingGroup title="系统管理">
          <SettingRow icon={Users} label="账户管理" detail={`${adminUsers.length || '查看'} 个注册用户`} active={settingsPanel === 'users'} onClick={onOpenUsersPanel} />
        </SettingGroup>
      ) : null}

      <SettingGroup title="外观">
        <div className="flex h-14 items-center justify-between px-4">
          <span className="flex items-center gap-3 text-sm font-medium text-slate-900 dark:text-slate-100">
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            {isDark ? '黑暗皮肤' : '白天皮肤'}
          </span>
          <Switch checked={isDark} onCheckedChange={onToggleTheme} aria-label="切换皮肤" />
        </div>
      </SettingGroup>

      <Button
        type="button"
        variant="outline"
        onClick={onLogout}
        className="mt-4 h-11 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        退出登录
      </Button>
      <p className="pt-2 text-center text-xs text-slate-400">Travel Ledger · v1.0</p>
    </div>
  )
}
