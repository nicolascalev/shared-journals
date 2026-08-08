'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteEntry, updateEntry } from '@/app/(frontend)/actions/entries'
import { deleteUpdate, updateUpdate, uploadMedia } from '@/app/(frontend)/actions/updates'
import { MAX_UPDATE_IMAGES } from '@/utilities/uploadLimits'
import {
  SubmitErrorAlert,
  formatSubmitError,
  showSubmitFailure,
} from '@/components/SubmitErrorAlert'
import { compressImageFiles, prepareEntryImage } from '@/utilities/compressImage'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export type FeedEntry = {
  id: string
  description: string
  loggedAt: string
  durationMinutes?: number | null
  memberId: string
  memberName: string
  imageUrl?: string | null
}

export type FeedUpdate = {
  id: string
  text: string
  postedAt: string
  memberId: string
  memberName: string
  imageUrls: string[]
  imageIds: string[]
}

export type TimelineItem =
  | ({ kind: 'entry'; at: string } & FeedEntry)
  | ({ kind: 'update'; at: string } & FeedUpdate)

type Props = {
  slug: string
  items: TimelineItem[]
  selectedMemberId?: string | null
  filterMemberId?: string | null
}

const PAGE_SIZES = [10, 25, 50, 100] as const
type PageSize = (typeof PAGE_SIZES)[number]

function formatWhen(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function KindBadge({ kind }: { kind: 'entry' | 'update' }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border bg-muted/50 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {kind === 'entry' ? 'Entry' : 'Update'}
    </span>
  )
}

export function TimelineFeed({ slug, items, selectedMemberId, filterMemberId }: Props) {
  const [open, setOpen] = useState(true)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)

  const visible = useMemo(
    () =>
      filterMemberId ? items.filter((item) => item.memberId === filterMemberId) : items,
    [items, filterMemberId],
  )

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [filterMemberId, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageItems = visible.slice((page - 1) * pageSize, page * pageSize)
  const from = visible.length === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, visible.length)

  return (
    <section className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
          <p className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? 'item' : 'items'}
            {filterMemberId ? ' (filtered)' : ''}
          </p>
        </div>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <>
          {!visible.length ? (
            <p className="text-muted-foreground text-sm">
              {filterMemberId
                ? 'No posts from this member yet.'
                : 'No posts yet — be the first.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {from}–{to} of {visible.length}
                </p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="timeline-page-size" className="text-muted-foreground font-normal">
                    Per page
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value) as PageSize)}
                  >
                    <SelectTrigger id="timeline-page-size" className="w-[5.5rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ul className="space-y-4">
                {pageItems.map((item) =>
                  item.kind === 'entry' ? (
                    <EntryCard
                      key={`entry-${item.id}`}
                      slug={slug}
                      entry={item}
                      canEdit={
                        Boolean(selectedMemberId) && item.memberId === String(selectedMemberId)
                      }
                      showKindBadge
                    />
                  ) : (
                    <UpdateCard
                      key={`update-${item.id}`}
                      slug={slug}
                      update={item}
                      canEdit={
                        Boolean(selectedMemberId) && item.memberId === String(selectedMemberId)
                      }
                    />
                  ),
                )}
              </ul>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3">
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
            </>
          )}
        </>
      ) : null}
    </section>
  )
}

/** @deprecated Use TimelineFeed — kept as alias for older imports */
export const EntriesFeed = TimelineFeed

export function EntryCard({
  slug,
  entry,
  canEdit,
  showKindBadge = false,
}: {
  slug: string
  entry: FeedEntry
  canEdit: boolean
  showKindBadge?: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onDelete = () => {
    if (!window.confirm('Delete this entry?')) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteEntry(slug, entry.id)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not delete this entry.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  const onUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    const local = String(formData.get('loggedAtLocal') || '')
    if (local) formData.set('loggedAt', new Date(local).toISOString())
    formData.set('slug', slug)
    formData.set('entryId', entry.id)

    startTransition(async () => {
      try {
        await prepareEntryImage(formData)
        const result = await updateEntry(formData)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        setEditing(false)
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not update this entry.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="space-y-1">
          {showKindBadge ? <KindBadge kind="entry" /> : null}
          <p className="font-medium">{entry.memberName}</p>
          <p className="text-sm text-muted-foreground">{formatWhen(entry.loggedAt)}</p>
        </div>
        {entry.durationMinutes != null ? (
          <p className="text-sm text-muted-foreground tabular-nums">{entry.durationMinutes} min</p>
        ) : null}
      </div>

      {editing ? (
        <form onSubmit={onUpdate} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`loggedAt-${entry.id}`}>When</Label>
            <Input
              id={`loggedAt-${entry.id}`}
              name="loggedAtLocal"
              type="datetime-local"
              defaultValue={toLocalInputValue(entry.loggedAt)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`desc-${entry.id}`}>Description</Label>
            <Textarea
              id={`desc-${entry.id}`}
              name="description"
              defaultValue={entry.description}
              required
              rows={3}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`dur-${entry.id}`}>Duration (minutes)</Label>
              <Input
                id={`dur-${entry.id}`}
                name="durationMinutes"
                type="number"
                min={0}
                defaultValue={entry.durationMinutes ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`img-${entry.id}`}>Replace image</Label>
              <Input id={`img-${entry.id}`} name="image" type="file" accept="image/*" />
            </div>
          </div>
          {error ? <SubmitErrorAlert message={error} /> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{entry.description}</p>
          {entry.imageUrl ? (
            <div className="mt-3 space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowImage((value) => !value)}
              >
                {showImage ? 'Hide image' : 'Show image'}
              </Button>
              {showImage ? (
                <div className="overflow-hidden rounded-md bg-muted max-w-full md:max-w-[500px]">
                  <Image
                    src={getMediaUrl(entry.imageUrl)}
                    alt=""
                    width={500}
                    height={500}
                    className="h-auto w-full max-w-[500px] object-contain"
                    sizes="(max-width: 768px) 100vw, 500px"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {canEdit ? (
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Spinner />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          ) : null}
          {error ? <SubmitErrorAlert message={error} /> : null}
        </>
      )}
    </li>
  )
}

function UpdateCard({
  slug,
  update,
  canEdit,
}: {
  slug: string
  update: FeedUpdate
  canEdit: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [showImages, setShowImages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onDelete = () => {
    if (!window.confirm('Delete this update?')) return
    setError(null)
    startTransition(async () => {
      try {
        const result = await deleteUpdate(slug, update.id)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not delete this update.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  const onUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const form = e.currentTarget
    const formData = new FormData(form)
    const local = String(formData.get('postedAtLocal') || '')
    if (local) formData.set('postedAt', new Date(local).toISOString())
    formData.set('slug', slug)
    formData.set('updateId', update.id)

    const fileInput = form.querySelector<HTMLInputElement>(`#update-images-${update.id}`)
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

        if (selectedFiles.length > 0) {
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
          formData.set('replaceImages', '1')
          formData.delete('imageIds')
          for (const id of imageIds) {
            formData.append('imageIds', String(id))
          }
        }

        const result = await updateUpdate(formData)
        if (!result.ok) {
          setError(result.error)
          showSubmitFailure(result.error)
          return
        }
        setEditing(false)
        router.refresh()
      } catch (err) {
        const message = formatSubmitError(err, 'Could not update this post.')
        setError(message)
        showSubmitFailure(message)
      }
    })
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 space-y-1">
        <KindBadge kind="update" />
        <p className="font-medium">{update.memberName}</p>
        <p className="text-sm text-muted-foreground">{formatWhen(update.postedAt)}</p>
      </div>

      {editing ? (
        <form onSubmit={onUpdate} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`postedAt-${update.id}`}>When</Label>
            <Input
              id={`postedAt-${update.id}`}
              name="postedAtLocal"
              type="datetime-local"
              defaultValue={toLocalInputValue(update.postedAt)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`text-${update.id}`}>Update</Label>
            <Textarea
              id={`text-${update.id}`}
              name="text"
              defaultValue={update.text}
              required
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`update-images-${update.id}`}>Replace images</Label>
            <Input
              id={`update-images-${update.id}`}
              name="images"
              type="file"
              accept="image/*"
              multiple
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to keep current photos. Choosing new files replaces all images (max{' '}
              {MAX_UPDATE_IMAGES}).
            </p>
          </div>
          {error ? <SubmitErrorAlert message={error} /> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? (
                <>
                  <Spinner />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{update.text}</p>
          {update.imageUrls.length > 0 ? (
            <div className="mt-3 space-y-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowImages((value) => !value)}
              >
                {showImages
                  ? 'Hide images'
                  : `Show images (${update.imageUrls.length})`}
              </Button>
              {showImages ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {update.imageUrls.map((url, index) => (
                    <div
                      key={`${update.id}-img-${index}`}
                      className="overflow-hidden rounded-md bg-muted"
                    >
                      <Image
                        src={getMediaUrl(url)}
                        alt=""
                        width={500}
                        height={500}
                        className="h-auto w-full object-contain"
                        sizes="(max-width: 768px) 100vw, 250px"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {canEdit ? (
            <div className="mt-3 flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={pending}
              >
                {pending ? (
                  <>
                    <Spinner />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          ) : null}
          {error ? <SubmitErrorAlert message={error} /> : null}
        </>
      )}
    </li>
  )
}
