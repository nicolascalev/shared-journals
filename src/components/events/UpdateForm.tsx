'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  SubmitErrorAlert,
  formatSubmitError,
  showSubmitFailure,
} from '@/components/SubmitErrorAlert'
import { createUpdate, uploadMedia } from '@/app/(frontend)/actions/updates'
import { compressImageFiles } from '@/utilities/compressImage'
import { MAX_UPDATE_IMAGES } from '@/utilities/uploadLimits'
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

export function UpdateForm({ slug, members, selectedMemberId }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)

    const local = String(formData.get('postedAtLocal') || '')
    if (local) {
      formData.set('postedAt', new Date(local).toISOString())
    }
    formData.set('slug', slug)
    if (selectedMemberId) {
      formData.set('memberId', String(selectedMemberId))
    }

    const fileInput = form.querySelector<HTMLInputElement>('#update-images')
    const selectedFiles = fileInput?.files ? Array.from(fileInput.files) : []

    if (selectedFiles.length > MAX_UPDATE_IMAGES) {
      const message = `You can attach at most ${MAX_UPDATE_IMAGES} images.`
      setError(message)
      showSubmitFailure(message)
      return
    }

    startTransition(async () => {
      try {
        const text = String(formData.get('text') || '').trim()
        const compressed = await compressImageFiles(selectedFiles)
        const imageIds: number[] = []

        for (const file of compressed) {
          const uploadData = new FormData()
          uploadData.set('slug', slug)
          uploadData.set('alt', text.slice(0, 100) || 'Update photo')
          uploadData.set('image', file)
          const uploaded = await uploadMedia(uploadData)
          if (!uploaded.ok) {
            setError(uploaded.error)
            showSubmitFailure(uploaded.error)
            return
          }
          imageIds.push(uploaded.id)
        }

        formData.delete('images')
        formData.delete('imageIds')
        for (const id of imageIds) {
          formData.append('imageIds', String(id))
        }

        const result = await createUpdate(formData)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        form.reset()
        const postedAt = form.querySelector<HTMLInputElement>('#postedAtLocal')
        if (postedAt) postedAt.value = toLocalInputValue()
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not save your update. Please try again.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Post an update</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedMemberId
            ? 'Share a short update with optional photos.'
            : 'Pick your name above before posting.'}
        </p>
      </div>

      {!selectedMemberId ? (
        <div className="space-y-2">
          <Label htmlFor="update-memberId">Who is this for?</Label>
          <select
            id="update-memberId"
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
        <Label htmlFor="postedAtLocal">When</Label>
        <Input
          id="postedAtLocal"
          name="postedAtLocal"
          type="datetime-local"
          defaultValue={toLocalInputValue()}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="update-text">Update</Label>
        <Textarea
          id="update-text"
          name="text"
          placeholder="What's going on?"
          required
          rows={3}
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="update-images">Images</Label>
        <Input
          id="update-images"
          name="images"
          type="file"
          accept="image/*"
          multiple
        />
        <p className="text-xs text-muted-foreground">
          Up to {MAX_UPDATE_IMAGES} photos. Each is compressed before upload.
        </p>
      </div>

      <SubmitErrorAlert message={error} />

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            Posting…
          </>
        ) : (
          'Post update'
        )}
      </Button>
    </form>
  )
}
