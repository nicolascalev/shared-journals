'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  SubmitErrorAlert,
  formatSubmitError,
  showSubmitFailure,
} from '@/components/SubmitErrorAlert'
import { createEntry } from '@/app/(frontend)/actions/entries'
import { celebrateEntry } from '@/utilities/celebrateEntry'
import { prepareEntryImage } from '@/utilities/compressImage'
import type { MemberOption } from './MemberPicker'

type Props = {
  slug: string
  members: MemberOption[]
  selectedMemberId?: string | null
}

function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function EntryForm({ slug, members, selectedMemberId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const local = String(formData.get('loggedAtLocal') || '')
    if (local) {
      formData.set('loggedAt', new Date(local).toISOString())
    }
    formData.set('slug', slug)
    if (selectedMemberId) {
      formData.set('memberId', String(selectedMemberId))
    }

    startTransition(async () => {
      try {
        await prepareEntryImage(formData)
        const result = await createEntry(formData)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        celebrateEntry()
        form.reset()
        const loggedAt = form.querySelector<HTMLInputElement>('#loggedAtLocal')
        if (loggedAt) loggedAt.value = toLocalInputValue()
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not save your entry. Please try again.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Log an entry</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedMemberId
            ? 'Add a workout, check-in, or progress note.'
            : 'Pick your name above before posting.'}
        </p>
      </div>

      {!selectedMemberId ? (
        <div className="space-y-2">
          <Label htmlFor="memberId">Who is this for?</Label>
          <select
            id="memberId"
            name="memberId"
            required
            className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select member
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="memberId" value={String(selectedMemberId)} />
      )}

      <div className="space-y-2">
        <Label htmlFor="loggedAtLocal">When</Label>
        <Input
          id="loggedAtLocal"
          name="loggedAtLocal"
          type="datetime-local"
          defaultValue={toLocalInputValue()}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="What did you do?"
          required
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="durationMinutes">Duration (minutes)</Label>
          <Input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={0}
            step={1}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="image">Image</Label>
          <Input id="image" name="image" type="file" accept="image/*" />
          <p className="text-xs text-muted-foreground">Photos are compressed before upload.</p>
        </div>
      </div>

      <SubmitErrorAlert message={error} />

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Add entry'}
      </Button>
    </form>
  )
}
