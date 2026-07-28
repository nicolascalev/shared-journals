'use client'

import React, { useEffect, useState } from 'react'

import { getEventPhase, type EventPhase } from '@/utilities/eventPhase'

type Props = {
  startDate: string
  endDate: string
}

function getParts(targetIso: string) {
  const diff = new Date(targetIso).getTime() - Date.now()
  if (diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

function CountdownGrid({
  label,
  title,
  parts,
}: {
  label: string
  title: string
  parts: { days: number; hours: number; minutes: number; seconds: number }
}) {
  const cells = [
    { label: 'Days', value: parts.days },
    { label: 'Hours', value: parts.hours },
    { label: 'Minutes', value: parts.minutes },
    { label: 'Seconds', value: parts.seconds },
  ]

  return (
    <div className="rounded-lg border border-border bg-card px-5 py-4">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold tracking-tight mb-3">{title}</p>
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

export function Countdown({ startDate, endDate }: Props) {
  const [phase, setPhase] = useState<EventPhase>(() => getEventPhase(startDate, endDate))
  const [parts, setParts] = useState(() => {
    const initial = getEventPhase(startDate, endDate)
    if (initial === 'upcoming') return getParts(startDate)
    if (initial === 'active') return getParts(endDate)
    return null
  })

  useEffect(() => {
    const tick = () => {
      const nextPhase = getEventPhase(startDate, endDate)
      setPhase(nextPhase)
      if (nextPhase === 'upcoming') setParts(getParts(startDate))
      else if (nextPhase === 'active') setParts(getParts(endDate))
      else setParts(null)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startDate, endDate])

  if (phase === 'finished') {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Status</p>
        <p className="text-2xl font-semibold tracking-tight">Finished event</p>
        <p className="text-sm text-muted-foreground mt-1">Logging is closed. Final standings are locked in.</p>
      </div>
    )
  }

  if (phase === 'upcoming') {
    if (!parts) {
      return (
        <div className="rounded-lg border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="text-2xl font-semibold tracking-tight">Starting soon</p>
        </div>
      )
    }
    return <CountdownGrid label="Status" title="Starting soon" parts={parts} />
  }

  if (!parts) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-4">
        <p className="text-sm text-muted-foreground">Status</p>
        <p className="text-2xl font-semibold tracking-tight">Finished event</p>
      </div>
    )
  }

  return <CountdownGrid label="Time remaining" title="Event in progress" parts={parts} />
}
