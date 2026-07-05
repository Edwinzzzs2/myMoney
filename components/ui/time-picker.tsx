"use client"

import { useState } from "react"
import { ChevronDown, Clock3 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TimePickerProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

const hours = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0")
)

const minutes = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0")
)

function parseTimeValue(value: string) {
  const [hour = "00", minute = "00"] = value.slice(0, 5).split(":")
  return {
    hour: hours.includes(hour) ? hour : "00",
    minute: minutes.includes(minute) ? minute : "00",
  }
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const { hour, minute } = parseTimeValue(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-8 min-w-0 justify-between gap-1 border-slate-200 bg-white/70 px-2 text-xs font-normal text-slate-800 shadow-none dark:border-white/10 dark:bg-black/20 dark:text-slate-100",
            className
          )}
          aria-label="选择支出时间"
        >
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{hour}:{minute}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-44 p-3" align="end" sideOffset={6}>
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">选择时间</p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <Select
            value={hour}
            onValueChange={(nextHour) => onChange(`${nextHour}:${minute}`)}
          >
            <SelectTrigger className="h-9 px-2 text-xs" aria-label="选择小时">
              <SelectValue placeholder="时" />
            </SelectTrigger>
            <SelectContent className="max-h-56 min-w-[4.5rem]">
              {hours.map((item) => (
                <SelectItem key={item} value={item} className="text-xs">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-sm font-semibold text-slate-400">:</span>

          <Select
            value={minute}
            onValueChange={(nextMinute) => {
              onChange(`${hour}:${nextMinute}`)
              setOpen(false)
            }}
          >
            <SelectTrigger className="h-9 px-2 text-xs" aria-label="选择分钟">
              <SelectValue placeholder="分" />
            </SelectTrigger>
            <SelectContent className="max-h-56 min-w-[4.5rem]">
              {minutes.map((item) => (
                <SelectItem key={item} value={item} className="text-xs">
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}
