import { cn } from '@/utilities/ui'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

type SpinnerProps = React.ComponentProps<'svg'> & {
  label?: string
}

export function Spinner({ className, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <Loader2
      role="status"
      aria-label={label}
      className={cn('size-4 shrink-0 animate-spin', className)}
      {...props}
    />
  )
}
