'use client'

import React from 'react'

import type { PodiumPlace } from '@/utilities/eventPhase'

type Props = {
  places: PodiumPlace[]
}

export function Podium({ places }: Props) {
  if (!places.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-5 py-6 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Final results</p>
        <p className="text-lg font-semibold tracking-tight">No entries were logged</p>
      </div>
    )
  }

  return (
    <section className="rounded-lg border border-border bg-card px-5 py-6 space-y-5">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Final results</p>
        <h2 className="text-2xl font-semibold tracking-tight">Top placements</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {places.map((place) => (
          <div
            key={place.place}
            className="rounded-lg border border-border bg-background/60 px-4 py-5 text-center space-y-3"
          >
            <p className="text-4xl leading-none" aria-hidden>
              {place.medal}
            </p>
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">{place.label}</p>
              <p className="text-sm text-muted-foreground tabular-nums mt-1">
                {place.count} {place.count === 1 ? 'entry' : 'entries'}
              </p>
            </div>
            <ul className="space-y-1">
              {place.members.map((member) => (
                <li key={member.memberId} className="font-medium text-lg tracking-tight">
                  {member.memberName}
                </li>
              ))}
            </ul>
            {place.members.length > 1 ? (
              <p className="text-xs text-muted-foreground">Shared {place.label.toLowerCase()} place</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
