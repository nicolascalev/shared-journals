'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

export type InviteAnswer = {
  id: string
  createdAt: string
  memberName: string
  answers: { field: string; value: string }[]
}

type Props = {
  answers: InviteAnswer[]
}

const PAGE_SIZE = 15

export function InviteAnswersButton({ answers }: Props) {
  const [open, setOpen] = useState(false)

  if (!answers.length) {
    return (
      <Button type="button" variant="outline" disabled>
        Invite answers (0)
      </Button>
    )
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Invite answers ({answers.length})
      </Button>
      {open ? <InviteAnswersDialog answers={answers} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

function InviteAnswersDialog({
  answers,
  onClose,
}: {
  answers: InviteAnswer[]
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(answers.length / PAGE_SIZE))
  const pageAnswers = useMemo(
    () => answers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [answers, page],
  )

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
        aria-labelledby="invite-answers-title"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h3 id="invite-answers-title" className="text-lg font-semibold tracking-tight">
              Invite answers
            </h3>
            <p className="text-sm text-muted-foreground">{answers.length} submissions</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {pageAnswers.map((submission) => (
            <article key={submission.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="font-medium">{submission.memberName}</h4>
                <p className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(submission.createdAt))}
                </p>
              </div>
              <dl className="space-y-2 text-sm">
                {submission.answers.map((answer) => (
                  <div key={`${submission.id}-${answer.field}`}>
                    <dt className="text-muted-foreground">{answer.field}</dt>
                    <dd className="whitespace-pre-wrap">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
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
