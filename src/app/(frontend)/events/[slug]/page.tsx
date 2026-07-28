import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import React from 'react'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

import { UnlockForm } from '@/components/events/UnlockForm'
import { EventDashboard } from '@/components/events/EventDashboard'
import type { FeedEntry } from '@/components/events/EntriesFeed'
import type { LeaderboardRow } from '@/components/events/Leaderboard'
import type { InviteAnswer } from '@/components/events/InviteAnswersButton'
import {
  WELCOME_PENDING_COOKIE,
  getEventSessionForSlug,
} from '@/utilities/eventSession'
import { getServerSideURL } from '@/utilities/getURL'
import type { Media, Member } from '@/payload-types'

type Args = {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    select: { title: true },
  })

  const event = result.docs[0]
  if (!event) return { title: 'Event' }

  return {
    title: event.title,
    description: `Shared journal for ${event.title}`,
  }
}

export default async function EventPage({ params }: Args) {
  const { slug } = await params
  const payload = await getPayload({ config })
  const session = await getEventSessionForSlug(slug)
  const jar = await cookies()
  const showWelcome = jar.get(WELCOME_PENDING_COOKIE)?.value === slug

  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: session ? 2 : 0,
    overrideAccess: true,
  })

  const event = result.docs[0]
  if (!event) notFound()

  if (!session) {
    return (
      <div className="container py-20">
        <UnlockForm slug={event.slug} title={event.title} />
      </div>
    )
  }

  const members = (event.members || [])
    .filter((m): m is Member => typeof m === 'object' && m !== null)
    .map((m) => ({ id: String(m.id), name: m.name }))

  const entriesResult = await payload.find({
    collection: 'entries',
    where: { event: { equals: event.id } },
    sort: '-loggedAt',
    depth: 1,
    limit: 200,
    overrideAccess: true,
  })

  const entries: FeedEntry[] = entriesResult.docs.map((entry) => {
    const member = typeof entry.member === 'object' ? entry.member : null
    const image = typeof entry.image === 'object' ? (entry.image as Media | null) : null
    return {
      id: String(entry.id),
      description: entry.description,
      loggedAt: entry.loggedAt,
      durationMinutes: entry.durationMinutes,
      memberId: member ? String(member.id) : String(entry.member),
      memberName: member?.name || 'Unknown',
      imageUrl: image?.url || image?.sizes?.medium?.url || null,
    }
  })

  const counts = new Map<string, number>()
  const lastLoggedAt = new Map<string, number>()
  for (const entry of entries) {
    counts.set(entry.memberId, (counts.get(entry.memberId) || 0) + 1)
    const loggedMs = new Date(entry.loggedAt).getTime()
    const previous = lastLoggedAt.get(entry.memberId) || 0
    if (loggedMs > previous) lastLoggedAt.set(entry.memberId, loggedMs)
  }

  const sevenDaysMs = 1000 * 60 * 60 * 24 * 7
  const inactiveBefore = Date.now() - sevenDaysMs

  const leaderboard: LeaderboardRow[] = members
    .map((member) => {
      const last = lastLoggedAt.get(member.id)
      return {
        memberId: member.id,
        memberName: member.name,
        count: counts.get(member.id) || 0,
        inactive: !last || last < inactiveBefore,
      }
    })
    .sort((a, b) => b.count - a.count || a.memberName.localeCompare(b.memberName))

  const inviteFormId =
    typeof event.inviteForm === 'object' && event.inviteForm
      ? event.inviteForm.id
      : event.inviteForm

  let inviteAnswers: InviteAnswer[] = []
  if (inviteFormId) {
    const submissions = await payload.find({
      collection: 'form-submissions',
      where: {
        and: [{ form: { equals: inviteFormId } }, { event: { equals: event.id } }],
      },
      sort: '-createdAt',
      depth: 1,
      limit: 200,
      overrideAccess: true,
    })

    inviteAnswers = submissions.docs.map((doc) => {
      const member = typeof doc.member === 'object' && doc.member ? doc.member : null
      const nameFromAnswers = (doc.submissionData || []).find((item) => item.field === 'name')?.value
      return {
        id: String(doc.id),
        createdAt: doc.createdAt,
        memberName: member?.name || nameFromAnswers || 'Unknown',
        answers: (doc.submissionData || []).map((item) => ({
          field: item.field,
          value: item.value,
        })),
      }
    })
  }

  return (
    <EventDashboard
      slug={event.slug}
      title={event.title}
      startDate={event.startDate}
      endDate={event.endDate}
      description={(event.description as DefaultTypedEditorState | null) || null}
      rankingEnabled={Boolean(event.rankingEnabled)}
      members={members}
      selectedMemberId={session.memberId ? String(session.memberId) : null}
      entries={entries}
      leaderboard={leaderboard}
      showWelcome={showWelcome}
      eventPath={`${getServerSideURL()}/events/${event.slug}`}
      inviteAnswers={inviteAnswers}
      hasInviteForm={Boolean(inviteFormId)}
    />
  )
}
