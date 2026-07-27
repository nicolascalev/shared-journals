import Link from 'next/link'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'

export function JournalHeader() {
  return (
    <header className="border-b border-border">
      <div className="container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="font-semibold tracking-tight text-lg">
          Shared Journals
        </Link>
        <ThemeSelector />
      </div>
    </header>
  )
}
