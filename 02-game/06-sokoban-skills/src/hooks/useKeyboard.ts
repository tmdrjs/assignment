import { useEffect } from 'react'
import type { Direction } from '../game/types'

const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
}

export interface KeyboardHandlers {
  onMove: (direction: Direction) => void
  onUndo: () => void
  onReset: () => void
  onExit: () => void
  enabled: boolean
}

/**
 * 게임 화면 전용 키보드 조작.
 * 방향키로 화면이 스크롤되지 않도록 기본 동작을 막는다.
 */
export function useKeyboard({ onMove, onUndo, onReset, onExit, enabled }: KeyboardHandlers): void {
  useEffect(() => {
    if (!enabled) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return

      const target = event.target as HTMLElement | null
      // 버튼에 포커스가 있을 때 Space/Enter 는 버튼이 처리하도록 둔다.
      if (target?.tagName === 'BUTTON' && (event.code === 'Space' || event.code === 'Enter')) {
        return
      }

      const direction = MOVE_KEYS[event.code]
      if (direction) {
        event.preventDefault()
        onMove(direction)
        return
      }

      switch (event.code) {
        case 'KeyZ':
          event.preventDefault()
          onUndo()
          break
        case 'KeyR':
          event.preventDefault()
          onReset()
          break
        case 'Escape':
          event.preventDefault()
          onExit()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onMove, onUndo, onReset, onExit])
}
