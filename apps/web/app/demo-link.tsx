'use client'

import { useEffect, useState } from 'react'

/** The demo is local-only; never turn a hosted landing into a public banking link. */
export default function DemoLink() {
  const [demoUrl, setDemoUrl] = useState<string | null>(null)

  useEffect(() => {
    const { hostname } = window.location
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
