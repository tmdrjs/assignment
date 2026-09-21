import { useEffect, useState } from 'react'
import { useSim } from '../sim/store.ts'

export function Toast() {
  const toast = useSim((s) => s.toast)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const t = window.setTimeout(() => setVisible(false), 2800)
    return () => window.clearTimeout(t)
  }, [toast])
  if (!toast) return null
  return (
    <div className={`toast ${visible ? 'show' : ''}`} role="status" aria-live="polite">
      {toast.text}
    </div>
  )
}
