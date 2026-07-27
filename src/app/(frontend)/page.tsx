import Link from 'next/link'
import { getPayload } from 'payload'
import config from '@payload-config'
import React from 'react'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const payload = await getPayload({ config })
  const events = await payload.find({
    collection: 'events',
    depth: 0,
    limit: 50,
    sort: '-startDate',
    overrideAccess: true,
    select: {
      title: true,
      slug: true,
      startDate: true,
      endDate: true,
    },
  })

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,oklch(0.92_0.04_145),transparent_45%),linear-gradient(180deg,transparent,var(--background))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
      />

      <section className="container py-16 md:py-24">
        <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground mb-5">Fitness crew</p>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tight max-w-3xl mb-5">
          Shared Journals
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mb-10">
          Log workouts together, chase the leaderboard, and keep each other honest for the next three
          months — no accounts required, just an event code.
        </p>

        <div className="space-y-4 max-w-2xl">
          <h2 className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Events</h2>
          {events.docs.length === 0 ? (
            <p className="text-muted-foreground">
              No events yet. Create one in the{' '}
              <Link href="/admin" className="underline underline-offset-4">
                admin panel
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card/70 backdrop-blur">
              {events.docs.map((event) => {
                const ended = new Date(event.endDate).getTime() < Date.now()
                return (
                  <li key={event.id}>
                    <Link
                      href={`/events/${event.slug}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-lg">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                            new Date(event.startDate),
                          )}
                          {' — '}
                          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
                            new Date(event.endDate),
                          )}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {ended ? 'Ended' : 'Open'} →
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
