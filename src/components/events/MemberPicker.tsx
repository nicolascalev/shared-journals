'use client'

import React, { useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { selectMember } from '@/app/(frontend)/actions/session'

export type MemberOption = {
  id: string
  name: string
}

type Props = {
  slug: string
  members: MemberOption[]
  selectedMemberId?: string | null
}

export function MemberPicker({ slug, members, selectedMemberId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-2">
      <Label>Posting as</Label>
      <Select
        value={selectedMemberId ? String(selectedMemberId) : undefined}
        disabled={pending}
        onValueChange={(value) => {
          startTransition(async () => {
            await selectMember(slug, value)
            router.refresh()
          })
        }}
      >
        <SelectTrigger className="w-full md:w-72">
          <SelectValue placeholder="Pick your name" />
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
