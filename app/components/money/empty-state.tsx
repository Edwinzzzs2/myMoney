import type { ComponentType } from 'react'

type EmptyStateProps = {
  icon: ComponentType<{ className?: string }>
  title: string
  detail: string
}

export function EmptyState({ icon: Icon, title, detail }: EmptyStateProps) {
  return (
    <div className="flex min-h-[128px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center dark:border-white/10 dark:bg-black/15">
      <Icon className="h-8 w-8 text-slate-500" />
      <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}
