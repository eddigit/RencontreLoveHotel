'use client'

import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react'
import { analyticsPageUrl } from '@/lib/public-analytics'

export function PublicAnalytics() {
  // The React entry point does not send Next.js' separate route (`dp`) field.
  // beforeSend is therefore the only route representation that reaches Vercel.
  return <Analytics beforeSend={(event: BeforeSendEvent) => {
    const url = analyticsPageUrl(event.url, location.origin, document.referrer)
    return url ? { ...event, url } : null
  }} />
}
