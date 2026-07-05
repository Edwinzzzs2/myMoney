"use client"

import { Loader2, TriangleAlert } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ConfirmActionDialogProps = {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  tone?: "danger" | "warning"
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ConfirmActionDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  tone = "danger",
  onOpenChange,
  onConfirm,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent className="w-[calc(100%-1.5rem)] max-w-sm rounded-xl border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.24)] dark:border-white/10 dark:bg-[#121a22]">
        <AlertDialogHeader className="text-left">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-white",
              tone === "danger" ? "bg-red-600" : "bg-amber-500"
            )}
          >
            <TriangleAlert className="h-5 w-5" />
          </span>
          <AlertDialogTitle className="pt-1 text-base text-slate-950 dark:text-white">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line text-sm leading-6 text-slate-500 dark:text-slate-400">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:grid sm:grid-cols-2 sm:space-x-0">
          <AlertDialogCancel
            disabled={pending}
            className="mt-0 h-10 border-slate-200 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100"
          >
            取消
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            className={cn(
              "h-10 text-white",
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-amber-500 hover:bg-amber-600"
            )}
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
