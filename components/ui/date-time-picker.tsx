"use client"

import { cn } from "@/lib/utils"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"

type DateTimePickerProps = {
  date: string
  time: string
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  className?: string
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  className,
}: DateTimePickerProps) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)_5.25rem] gap-2", className)}>
      <DatePicker value={date} onChange={onDateChange} />
      <TimePicker value={time} onChange={onTimeChange} />
    </div>
  )
}
