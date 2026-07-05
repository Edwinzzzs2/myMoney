"use client"

import { useState } from "react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type DatePickerProps = {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  ariaLabel?: string
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined

  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DatePicker({
  value,
  onChange,
  className,
  placeholder = "选择日期",
  ariaLabel = "选择支出日期",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateValue(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-8 w-full min-w-0 justify-between gap-1.5 border-slate-200 bg-white/70 px-2 text-xs font-normal text-slate-800 shadow-none dark:border-white/10 dark:bg-black/20 dark:text-slate-100",
            className
          )}
          aria-label={ariaLabel}
        >
          <span className="min-w-0 flex-1 truncate text-center">
            {selectedDate ? format(selectedDate, "yyyy年M月d日", { locale: zhCN }) : placeholder}
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start" sideOffset={6}>
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(nextDate) => {
            if (!nextDate) return
            onChange(toDateValue(nextDate))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
