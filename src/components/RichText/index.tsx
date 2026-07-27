import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import {
  RichText as ConvertRichText,
  type JSXConvertersFunction,
} from '@payloadcms/richtext-lexical/react'
import React from 'react'

import { cn } from '@/utilities/ui'

type Props = {
  data: DefaultTypedEditorState
  className?: string
  enableGutter?: boolean
}

const jsxConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
})

export default function RichText({ data, className, enableGutter = true }: Props) {
  return (
    <ConvertRichText
      converters={jsxConverters}
      className={cn(
        'payload-richtext prose dark:prose-invert max-w-none',
        {
          container: enableGutter,
        },
        className,
      )}
      data={data}
    />
  )
}
