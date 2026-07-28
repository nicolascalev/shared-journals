'use client'

import React, { useCallback, useState } from 'react'
import { Button, FieldLabel, useFormFields } from '@payloadcms/ui'

export default function InviteLinkField() {
  const token = useFormFields(([fields]) => fields.inviteToken?.value as string | undefined)
  const [copied, setCopied] = useState(false)

  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SERVER_URL || ''

  const url = token ? `${base}/invite/${token}` : ''

  const onCopy = useCallback(async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }, [url])

  return (
    <div className="field-type">
      <FieldLabel label="Invite link" />
      {!token ? (
        <p style={{ margin: 0, opacity: 0.7 }}>Save the event once to generate an invite link.</p>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <code
            style={{
              flex: 1,
              minWidth: '12rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 4,
              background: 'var(--theme-elevation-100)',
              wordBreak: 'break-all',
            }}
          >
            {url}
          </code>
          <Button buttonStyle="secondary" onClick={onCopy} type="button">
            {copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      )}
      <p style={{ marginTop: '0.5rem', opacity: 0.7, fontSize: 13 }}>
        Share privately. Recipients still need the access code, and the invite form must include a
        text field named <code>name</code>.
      </p>
    </div>
  )
}
