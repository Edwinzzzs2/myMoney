"use client"

import { AlertCircle, CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-center"
      closeButton
      richColors
      duration={3800}
      visibleToasts={2}
      offset={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)', left: '0.75rem', right: '0.75rem' }}
      containerAriaLabel="Notifications"
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <AlertCircle className="h-4 w-4" />,
        loading: <Loader2 className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: 'Close notification',
        classNames: {
          toast: 'group rounded-lg border shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-xl',
          title: 'text-sm font-semibold leading-6',
          description: 'text-xs leading-5 opacity-80',
          closeButton: 'rounded-md',
          error: 'border-red-200 bg-white text-red-700 dark:border-red-500/30 dark:bg-[#160d12] dark:text-red-100',
          success: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-[#071711] dark:text-emerald-100',
          warning: 'border-amber-200 bg-white text-amber-700 dark:border-amber-500/30 dark:bg-[#181105] dark:text-amber-100',
          info: 'border-sky-200 bg-white text-sky-700 dark:border-sky-500/30 dark:bg-[#07121a] dark:text-sky-100',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
