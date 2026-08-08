'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  SubmitErrorAlert,
  formatSubmitError,
  showSubmitFailure,
} from '@/components/SubmitErrorAlert'
import { unlockEvent } from '@/app/(frontend)/actions/session'

type Props = {
  slug: string
  title: string
}

export function UnlockForm({ slug, title }: Props) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        const result = await unlockEvent(slug, code)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not unlock this event.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <div className="mx-auto max-w-md w-full">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Private event</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2 break-words [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="text-muted-foreground">Enter the shared access code to open the journal.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="access-code">Access code</Label>
          <Input
            id="access-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        <SubmitErrorAlert message={error} />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <>
              <Spinner />
              Unlocking…
            </>
          ) : (
            'Unlock'
          )}
        </Button>
      </form>
    </div>
  )
}
