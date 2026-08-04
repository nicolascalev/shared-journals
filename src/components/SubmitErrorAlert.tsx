'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'

type Props = {
  message: string | null
  id?: string
}

export function SubmitErrorAlert({ message, id = 'submit-error' }: Props) {
  if (!message) return null

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0 break-words">{message}</p>
    </div>
  )
}

export function formatSubmitError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (typeof err === 'string' && err.trim()) return err

  if (err instanceof Error) {
    const message = err.message || fallback
    const lower = message.toLowerCase()

    if (
      lower.includes('bodysizelimit') ||
      lower.includes('body exceeded') ||
      lower.includes('function_payload_too_large') ||
      lower.includes('413') ||
      lower.includes('too large')
    ) {
      return 'Upload is too large. Try a smaller image and submit again.'
    }

    // Next.js server-action digest errors are opaque to the client
    if (lower.includes('unexpected response') || lower.includes('failed to find server action')) {
      return 'Could not reach the server. Refresh and try again.'
    }

    return message
  }

  return fallback
}

export function showSubmitFailure(message: string) {
  // Guarantee the user sees something even if the UI state update is skipped
  window.alert(message)
}
