import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="container py-28">
      <h1 className="text-4xl font-semibold tracking-tight mb-3">404</h1>
      <p className="mb-6 text-muted-foreground">This page could not be found.</p>
      <Button asChild variant="default">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  )
}
