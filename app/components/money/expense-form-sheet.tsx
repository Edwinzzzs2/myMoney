"use client"

import type { ReactNode } from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type ExpenseFormSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function ExpenseFormSheet({
  open,
  onOpenChange,
  children,
}: ExpenseFormSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] flex-col gap-0 rounded-t-2xl border-slate-200 bg-[#f6f7f4] p-0 shadow-[0_-24px_70px_rgba(15,23,42,0.20)] dark:border-white/10 dark:bg-[#0b101c]"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200/80 px-4 pb-3 pt-4 pr-12 text-left dark:border-white/10">
          <SheetTitle className="text-base">编辑账单</SheetTitle>
          <SheetDescription className="sr-only">
            修改账单信息并保存
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 custom-scrollbar sm:px-4">
          <div className="mx-auto w-full max-w-xl">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
