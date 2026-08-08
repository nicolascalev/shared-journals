'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { EntryCard, type FeedEntry } from '@/components/events/TimelineFeed'

export type LeaderboardRow = {
  memberId: string
  memberName: string
  count: number
  inactive: boolean
}

type Props = {
  rows: LeaderboardRow[]
  entries: FeedEntry[]
  slug: string
  selectedMemberId?: string | null
}

const PAGE_SIZE = 15

export function Leaderboard({ rows, entries, slug, selectedMemberId }: Props) {
  const [activeMemberId, setActiveMemberId] = useState<string | null>(null)

  const activeRow = rows.find((row) => row.memberId === activeMemberId) || null
  const memberEntries = useMemo(
    () =>
      activeMemberId
        ? entries.filter((entry) => entry.memberId === activeMemberId)
        : [],
    [activeMemberId, entries],
  )

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">Rankings will appear once entries are logged.</p>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium text-right">Entries</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.memberId}
                className="group border-t border-border cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => setActiveMemberId(row.memberId)}
              >
                <td className="px-4 py-3 tabular-nums text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    {row.memberName}
                    {row.inactive ? (
                      <AlertCircle
                        className="size-4 shrink-0 text-red-600 dark:text-red-500"
                        aria-label="No entry in the last 7 days"
                      />
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex items-center justify-end gap-1.5 tabular-nums text-muted-foreground transition-colors group-hover:text-foreground">
                    {row.count}
                    <Eye
                      className="size-4 shrink-0 opacity-50 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                    <span className="sr-only">View entries</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeRow ? (
        <MemberEntriesDialog
          memberName={activeRow.memberName}
          entries={memberEntries}
          slug={slug}
          selectedMemberId={selectedMemberId}
          onClose={() => setActiveMemberId(null)}
        />
      ) : null}
    </>
  )
}

function MemberEntriesDialog({
  memberName,
  entries,
  slug,
  selectedMemberId,
  onClose,
}: {
  memberName: string
  entries: FeedEntry[]
  slug: string
  selectedMemberId?: string | null
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
  const pageEntries = entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const from = entries.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, entries.length)

  useEffect(() => {
    setPage(1)
  }, [memberName])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-entries-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 id="member-entries-title" className="text-lg font-semibold tracking-tight">
              {memberName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              {entries.length > 0 ? ` · showing ${from}–${to}` : ''}
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries from this member yet.</p>
          ) : (
            <ul className="space-y-4">
              {pageEntries.map((entry) => (
                <EntryCard
                  key={entry.id}
                  slug={slug}
                  entry={entry}
                  canEdit={Boolean(selectedMemberId) && entry.memberId === String(selectedMemberId)}
                />
              ))}
            </ul>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
