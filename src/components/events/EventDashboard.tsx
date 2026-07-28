'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Countdown } from '@/components/events/Countdown'
import { EntryForm } from '@/components/events/EntryForm'
import { EntriesFeed, type FeedEntry } from '@/components/events/EntriesFeed'
import { Leaderboard, type LeaderboardRow } from '@/components/events/Leaderboard'
import { MemberPicker, type MemberOption } from '@/components/events/MemberPicker'
import { WelcomeModal } from '@/components/events/WelcomeModal'
import { Podium } from '@/components/events/Podium'
import {
  InviteAnswersButton,
  type InviteAnswer,
} from '@/components/events/InviteAnswersButton'
import { lockEvent } from '@/app/(frontend)/actions/session'
import RichText from '@/components/RichText'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import { buildPodium, getEventPhase, type EventPhase } from '@/utilities/eventPhase'

type Props = {
  slug: string
  title: string
  endDate: string
  startDate: string
  description?: DefaultTypedEditorState | null
  rankingEnabled: boolean
  members: MemberOption[]
  selectedMemberId?: string | null
  entries: FeedEntry[]
  leaderboard: LeaderboardRow[]
  showWelcome?: boolean
  eventPath: string
  inviteAnswers?: InviteAnswer[]
  hasInviteForm?: boolean
}

export function EventDashboard({
  slug,
  title,
  endDate,
  startDate,
  description,
  rankingEnabled,
  members,
  selectedMemberId,
  entries,
  leaderboard,
  showWelcome = false,
  eventPath,
  inviteAnswers = [],
  hasInviteForm = false,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [phase, setPhase] = useState<EventPhase>(() => getEventPhase(startDate, endDate))
  const podium = useMemo(() => buildPodium(leaderboard), [leaderboard])

  useEffect(() => {
    const tick = () => setPhase(getEventPhase(startDate, endDate))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [startDate, endDate])

  return (
    <div className="container py-10 space-y-10">
      {showWelcome ? <WelcomeModal slug={slug} eventTitle={title} eventPath={eventPath} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Event</p>
          <h1 className="text-4xl font-semibold tracking-tight mb-3">{title}</h1>
          <p className="text-muted-foreground">
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(startDate))}
            {' — '}
            {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(endDate))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasInviteForm ? <InviteAnswersButton answers={inviteAnswers} /> : null}
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                await lockEvent(slug)
                router.refresh()
              })
            }}
          >
            Lock event
          </Button>
        </div>
      </div>

      {phase === 'finished' ? <Podium places={podium} /> : null}

      <Countdown startDate={startDate} endDate={endDate} />

      {description ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">Details</h2>
          <RichText data={description} enableGutter={false} />
        </section>
      ) : null}

      {phase === 'active' ? (
        <MemberPicker slug={slug} members={members} selectedMemberId={selectedMemberId} />
      ) : null}

      {rankingEnabled ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {phase === 'finished' ? 'Full leaderboard' : 'Leaderboard'}
            </h2>
            <p className="text-sm text-muted-foreground">
              Ranked by number of entries. Click a row to view that member&apos;s entries.
            </p>
          </div>
          <Leaderboard
            rows={leaderboard}
            entries={entries}
            slug={slug}
            selectedMemberId={phase === 'active' ? selectedMemberId : null}
          />
        </section>
      ) : null}

      {phase === 'upcoming' ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-6">
          <h2 className="text-lg font-semibold tracking-tight">Logging opens soon</h2>
          <p className="text-sm text-muted-foreground mt-1">
            The entry form unlocks when the event starts. Hang tight.
          </p>
        </div>
      ) : null}

      {phase === 'finished' ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-5 py-6">
          <h2 className="text-lg font-semibold tracking-tight">Logging closed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This event has finished. You can still browse entries and results below.
          </p>
        </div>
      ) : null}

      {phase === 'active' ? (
        <EntryForm slug={slug} members={members} selectedMemberId={selectedMemberId} />
      ) : null}

      <EntriesFeed
        slug={slug}
        entries={entries}
        selectedMemberId={phase === 'active' ? selectedMemberId : null}
      />
    </div>
  )
}
