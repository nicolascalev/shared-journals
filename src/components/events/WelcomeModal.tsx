'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { dismissWelcome } from '@/app/(frontend)/actions/invite'

type Props = {
  slug: string
  eventTitle: string
  eventPath: string
}

export function WelcomeModal({ slug, eventTitle, eventPath }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(true)
  const [pending, startTransition] = useTransition()

  if (!open) return null

  const onClose = () => {
    startTransition(async () => {
      await dismissWelcome(slug)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-lg space-y-4"
      >
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-2">Welcome</p>
          <h2 id="welcome-title" className="text-2xl font-semibold tracking-tight">
            You&apos;re in — {eventTitle}
          </h2>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Save this event link so you can come back anytime:{' '}
            <a href={eventPath} className="text-foreground underline underline-offset-4 break-all">
              {eventPath}
            </a>
          </p>
          <p>
            Bookmark or favorite that page. Do <strong className="text-foreground">not</strong> use
            the invite link again, and do not share the invite link publicly — it is only for
            onboarding new members.
          </p>
        </div>

        <Button type="button" className="w-full" onClick={onClose} disabled={pending}>
          {pending ? 'Saving…' : 'Got it'}
        </Button>
      </div>
    </div>
  )
}
