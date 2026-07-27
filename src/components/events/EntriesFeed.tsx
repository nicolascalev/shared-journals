'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteEntry, updateEntry } from '@/app/(frontend)/actions/entries'
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

type Props = {
  slug: string
  entries: FeedEntry[]
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

export function EntriesFeed({ slug, entries, selectedMemberId, filterMemberId }: Props) {
  const [open, setOpen] = useState(true)
  const [pageSize, setPageSize] = useState<PageSize>(10)
  const [page, setPage] = useState(1)

  const visible = useMemo(
    () =>
      filterMemberId ? entries.filter((entry) => entry.memberId === filterMemberId) : entries,
    [entries, filterMemberId],
  )

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))

  useEffect(() => {
    setPage(1)
  }, [filterMemberId, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageEntries = visible.slice((page - 1) * pageSize, page * pageSize)
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
          <h2 className="text-lg font-semibold tracking-tight">Entries</h2>
          <p className="text-sm text-muted-foreground">
            {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
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
              {filterMemberId ? 'No entries from this member yet.' : 'No entries yet — be the first.'}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Showing {from}–{to} of {visible.length}
                </p>
                <div className="flex items-center gap-2">
                  <Label htmlFor="entries-page-size" className="text-muted-foreground font-normal">
                    Per page
                  </Label>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(value) => setPageSize(Number(value) as PageSize)}
                  >
                    <SelectTrigger id="entries-page-size" className="w-[5.5rem]">
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
                {pageEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    slug={slug}
                    entry={entry}
                    canEdit={Boolean(selectedMemberId) && entry.memberId === String(selectedMemberId)}
                  />
                ))}
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

export function EntryCard({
  slug,
  entry,
  canEdit,
}: {
  slug: string
  entry: FeedEntry
  canEdit: boolean
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
      const result = await deleteEntry(slug, entry.id)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
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
      const result = await updateEntry(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Save
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
                Delete
              </Button>
            </div>
          ) : null}
          {error ? <p className="text-sm text-destructive mt-2">{error}</p> : null}
        </>
      )}
    </li>
  )
}
