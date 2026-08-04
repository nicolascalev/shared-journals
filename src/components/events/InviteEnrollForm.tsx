'use client'

import React, { useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { enrollWithInvite, verifyInviteCode } from '@/app/(frontend)/actions/invite'
import {
  SubmitErrorAlert,
  formatSubmitError,
  showSubmitFailure,
} from '@/components/SubmitErrorAlert'
import RichText from '@/components/RichText'
import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

export type InviteFormField = {
  id?: string
  blockType: string
  name?: string
  label?: string
  required?: boolean
  defaultValue?: string | boolean | null
  placeholder?: string
  options?: { label: string; value: string }[]
  message?: DefaultTypedEditorState | null
}

type Props = {
  token: string
  eventTitle: string
  inviteDescription?: DefaultTypedEditorState | null
  fields: InviteFormField[]
  submitLabel?: string | null
}

export function InviteEnrollForm({
  token,
  eventTitle,
  inviteDescription,
  fields,
  submitLabel,
}: Props) {
  const [code, setCode] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const inputFields = useMemo(
    () => fields.filter((field) => field.blockType !== 'message' && field.name),
    [fields],
  )

  const onUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Enter the access code.')
      return
    }

    startTransition(async () => {
      try {
        const result = await verifyInviteCode(token, trimmed)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        setUnlocked(true)
      } catch (err) {
        const message = formatSubmitError(err, 'Could not verify access code.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  const onEnroll = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set('token', token)
    formData.set('code', code)

    startTransition(async () => {
      try {
        const result = await enrollWithInvite(formData)
        if (result && !result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
        }
      } catch (err) {
        // redirect() throws a special NEXT_REDIRECT error — ignore those
        if (
          err &&
          typeof err === 'object' &&
          'digest' in err &&
          String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')
        ) {
          return
        }
        const message = formatSubmitError(err, 'Could not complete enrollment.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-8">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground mb-3">Invite</p>
        <h1 className="text-3xl font-semibold tracking-tight mb-2 break-words [overflow-wrap:anywhere]">
          {eventTitle}
        </h1>
        <p className="text-muted-foreground">
          {unlocked
            ? 'Complete the form to join this event.'
            : 'Enter the shared access code to continue.'}
        </p>
      </div>

      {inviteDescription ? <RichText data={inviteDescription} enableGutter={false} /> : null}

      {!unlocked ? (
        <form onSubmit={onUnlock} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Access code</Label>
            <Input
              id="invite-code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error ? <SubmitErrorAlert message={error} /> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Checking…' : 'Continue'}
          </Button>
        </form>
      ) : (
        <form onSubmit={onEnroll} className="space-y-4 rounded-lg border border-border bg-card p-5">
          {fields.map((field, index) => {
            if (field.blockType === 'message' && field.message) {
              return (
                <div key={field.id || `message-${index}`}>
                  <RichText data={field.message} enableGutter={false} />
                </div>
              )
            }

            if (!field.name) return null
            const id = `invite-field-${field.name}`

            if (field.blockType === 'textarea') {
              return (
                <div key={field.id || field.name} className="space-y-2">
                  <Label htmlFor={id}>
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </Label>
                  <Textarea
                    id={id}
                    name={field.name}
                    required={Boolean(field.required)}
                    defaultValue={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
                    rows={4}
                  />
                </div>
              )
            }

            if (field.blockType === 'checkbox') {
              return (
                <label
                  key={field.id || field.name}
                  className="flex items-center gap-2 text-sm"
                  htmlFor={id}
                >
                  <input
                    id={id}
                    name={field.name}
                    type="checkbox"
                    defaultChecked={Boolean(field.defaultValue)}
                    required={Boolean(field.required)}
                    className="size-4 rounded border"
                  />
                  <span>
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </span>
                </label>
              )
            }

            if (field.blockType === 'select' || field.blockType === 'radio') {
              return (
                <div key={field.id || field.name} className="space-y-2">
                  <Label htmlFor={id}>
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </Label>
                  <select
                    id={id}
                    name={field.name}
                    required={Boolean(field.required)}
                    defaultValue={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
                    className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                  >
                    <option value="" disabled>
                      {field.placeholder || 'Select…'}
                    </option>
                    {(field.options || []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            }

            const inputType =
              field.blockType === 'email'
                ? 'email'
                : field.blockType === 'number'
                  ? 'number'
                  : field.blockType === 'date'
                    ? 'date'
                    : 'text'

            return (
              <div key={field.id || field.name} className="space-y-2">
                <Label htmlFor={id}>
                  {field.label || field.name}
                  {field.required ? ' *' : ''}
                </Label>
                <Input
                  id={id}
                  name={field.name}
                  type={inputType}
                  required={Boolean(field.required) || field.name === 'name'}
                  defaultValue={typeof field.defaultValue === 'string' ? field.defaultValue : ''}
                  placeholder={field.placeholder || undefined}
                />
              </div>
            )
          })}

          {inputFields.length === 0 ? (
            <p className="text-sm text-destructive">
              This invite form has no fields. Ask the admin to add a text field named &quot;name&quot;.
            </p>
          ) : null}

          {error ? <SubmitErrorAlert message={error} /> : null}

          <Button type="submit" className="w-full" disabled={pending || inputFields.length === 0}>
            {pending ? 'Joining…' : submitLabel || 'Join event'}
          </Button>
        </form>
      )}
    </div>
  )
}
