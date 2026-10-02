'use client'

import { useEffect, useState } from 'react'

export default function ThemeButton() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDark(preference)
    document.documentElement.dataset.theme = preference ? 'dark' : 'light'
  }, [])
  return (
    <button
      className="theme-button"
      type="button"
      aria-label={dark ? 'Usa aspetto chiaro' : 'Usa aspetto scuro'}
      aria-pressed={dark}
      onClick={() => {
        setDark(!dark)
        document.documentElement.dataset.theme = dark ? 'light' : 'dark'
      }}
    >
      <span aria-hidden="true">{dark ? '☼' : '◐'}</span>
      <span>{dark ? 'Chiaro' : 'Scuro'}</span>
    </button>
  )
}
