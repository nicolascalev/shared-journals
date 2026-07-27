'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  endDate: string
}

function getParts(endDate: string) {
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

export function Countdown({ endDate }: Props) {
  const [parts, setParts] = useState(() => getParts(endDate))

  useEffect(() => {
    const id = window.setInterval(() => setParts(getParts(endDate)), 1000)
    return () => window.clearInterval(id)
  }, [endDate])

  if (!parts) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Status</p>
        <p className="text-2xl font-semibold tracking-tight">Event ended</p>
      </div>
    )
  }

  const cells = [
    { label: 'Days', value: parts.days },
    { label: 'Hours', value: parts.hours },
    { label: 'Minutes', value: parts.minutes },
    { label: 'Seconds', value: parts.seconds },
  ]

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground mb-3">Time remaining</p>
      <div className="grid grid-cols-4 gap-3">
        {cells.map((cell) => (
          <div key={cell.label} className="text-center">
            <p className="text-2xl md:text-3xl font-semibold tabular-nums tracking-tight">
              {String(cell.value).padStart(2, '0')}
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{cell.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
