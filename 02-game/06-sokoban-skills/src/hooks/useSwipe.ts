import { useEffect } from 'react'
import type { RefObject } from 'react'
import type { Direction } from '../game/types'

/** 이 거리(px) 이상 움직여야 한 번의 이동으로 인정한다. */
const SWIPE_THRESHOLD = 24

/**
 * 보드 영역에서의 스와이프 조작.
 * 스와이프 중 화면이 함께 스크롤되지 않도록 기본 동작을 막는다.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipe: (direction: Direction) => void,
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    let startX = 0
    let startY = 0
    let tracking = false

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      tracking = true
    }

    function handleTouchMove(event: TouchEvent) {
      if (!tracking) return
      event.preventDefault()

      const touch = event.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const absX = Math.abs(deltaX)
      const absY = Math.abs(deltaY)

      if (Math.max(absX, absY) < SWIPE_THRESHOLD) return

      if (absX > absY) {
        onSwipe(deltaX > 0 ? 'right' : 'left')
        startX = touch.clientX
        startY = touch.clientY
      } else {
        onSwipe(deltaY > 0 ? 'down' : 'up')
        startX = touch.clientX
        startY = touch.clientY
      }
    }

    function handleTouchEnd() {
      tracking = false
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)
    element.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [ref, onSwipe, enabled])
}
