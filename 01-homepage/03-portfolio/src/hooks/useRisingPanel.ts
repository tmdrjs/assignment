import { useCallback, useEffect, useRef, useState } from 'react'

/** 패널이 오르내리는 시간. Section 패널 CSS 의 transition 과 맞춰 둔다. */
export const PANEL_TRANSITION_MS = 440

/** 이만큼만 굴려도 바로 올라온다. */
const WHEEL_THRESHOLD = 8
/** 터치로 위로 쓸어 올리는 거리 */
const TOUCH_THRESHOLD = 36

/**
 * 첫 화면에서 아래로 굴리면 다음 화면(섹션 패널)이 올라온다.
 *
 * 닫혀 있을 때만 입력을 듣는다. 여는 것은 여기서, 닫는 것은 패널 쪽에서 맡는다.
 * 전환 직후 짧게 입력을 삼켜, 남은 관성으로 곧바로 되돌아가지 않게 한다.
 */
export function useRisingPanel() {
  const [open, setOpen] = useState(false)

  const coolingRef = useRef(false)
  const timerRef = useRef(0)

  const cool = useCallback(() => {
    coolingRef.current = true
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      coolingRef.current = false
    }, PANEL_TRANSITION_MS)
  }, [])

  const openPanel = useCallback(() => {
    if (coolingRef.current) return
    setOpen(true)
    cool()
  }, [cool])

  const closePanel = useCallback(() => {
    if (coolingRef.current) return
    setOpen(false)
    cool()
  }, [cool])

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  // 첫 화면에서만 입력을 받아 패널을 올린다.
  useEffect(() => {
    if (open) return

    let intent = 0
    let touchStartY = 0

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY <= 0) {
        intent = 0
        return
      }
      intent += event.deltaY
      if (intent > WHEEL_THRESHOLD) {
        intent = 0
        openPanel()
      }
    }

    const handleTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? 0
    }

    const handleTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? touchStartY
      if (touchStartY - y > TOUCH_THRESHOLD) openPanel()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === ' ') {
        event.preventDefault()
        openPanel()
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, openPanel])

  return { open, openPanel, closePanel }
}
