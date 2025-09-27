'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void
  }
}

export default function PlausibleTracker() {
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      window.plausible('pageview')
    }
  }, [pathname, search])

  return null
}
