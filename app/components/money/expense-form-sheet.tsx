"use client"

import { useEffect, useState, type ReactNode } from "react"

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
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)")
    const updateIsDesktop = () => setIsDesktop(query.matches)

    updateIsDesktop()
    query.addEventListener("change", updateIsDesktop)

    return () => query.removeEventListener("change", updateIsDesktop)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className="flex flex-col gap-0 border-slate-200 bg-[#f6f7f4] p-0 dark:border-white/10 dark:bg-[#0b101c] data-[state=closed]:duration-200 data-[state=open]:duration-300 max-lg:max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] max-lg:rounded-t-2xl max-lg:shadow-[0_-24px_70px_rgba(15,23,42,0.20)] lg:h-dvh lg:w-[min(31rem,calc(100vw-2rem))] lg:max-w-none lg:shadow-[-24px_0_70px_rgba(15,23,42,0.18)]"
      >
        <SheetHeader className="shrink-0 border-b border-slate-200/80 px-4 pb-3 pt-4 pr-12 text-left dark:border-white/10 lg:px-5 lg:pb-4 lg:pt-5">
          <SheetTitle className="text-base">编辑账单</SheetTitle>
          <SheetDescription className="sr-only">
            修改账单信息并保存
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 custom-scrollbar sm:px-4 lg:px-5 lg:pb-5 lg:pt-4">
          <div className="mx-auto w-full max-w-xl lg:max-w-none">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
