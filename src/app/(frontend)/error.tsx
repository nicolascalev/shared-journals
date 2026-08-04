'use client'

import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  return (
    <div className="container py-20 max-w-lg mx-auto space-y-5 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Something went wrong</p>
        <h1 className="text-3xl font-semibold tracking-tight">Request failed</h1>
        <p className="text-muted-foreground break-words" role="alert">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  )
}
