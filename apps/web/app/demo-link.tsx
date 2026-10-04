'use client'

import { useEffect, useState } from 'react'

/** A configured development gateway is explicit; the standalone demo remains loopback-only. */
export default function DemoLink() {
  const [demoUrl, setDemoUrl] = useState<string | null>(null)

  useEffect(() => {
    const { hostname } = window.location
    const configured = process.env.NEXT_PUBLIC_DEMO_URL?.trim()
    if (configured) {
      try {
        const target = new URL(configured)
        if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password)
          return
        const loopback = ['localhost', '127.0.0.1', '[::1]']
        if (loopback.includes(target.hostname) && !loopback.includes(hostname)) return
        setDemoUrl(target.href)
      } catch {
        // A malformed URL never becomes a navigation target.
      }
      return
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') setDemoUrl(`http://${hostname}:8081`)
  }, [])

  return demoUrl ? (
    <a className="button primary" href={demoUrl}>
      Apri la demo locale <span aria-hidden="true">↗</span>
    </a>
  ) : (
    <p className="demo-local-label">Apri la demo dall’ambiente locale di Lilleri.</p>
  )
}
