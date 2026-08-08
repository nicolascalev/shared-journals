'use client'

import { cn } from '@/utilities/ui'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import * as React from 'react'

const Tabs: React.FC<React.ComponentProps<typeof TabsPrimitive.Root>> = (props) => {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />
}

const TabsList: React.FC<React.ComponentProps<typeof TabsPrimitive.List>> = ({
  className,
  ...props
}) => {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'bg-muted text-muted-foreground inline-flex h-10 w-full items-center justify-center rounded-md p-1',
        className,
      )}
      {...props}
    />
  )
}

const TabsTrigger: React.FC<React.ComponentProps<typeof TabsPrimitive.Trigger>> = ({
  className,
  ...props
}) => {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
}

const TabsContent: React.FC<React.ComponentProps<typeof TabsPrimitive.Content>> = ({
  className,
  ...props
}) => {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('mt-4 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
