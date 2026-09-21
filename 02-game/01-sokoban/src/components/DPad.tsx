import { DIRECTION_LABEL } from '../game/constants'
import type { Direction } from '../game/types'

interface DPadProps {
  onMove: (direction: Direction) => void
  disabled: boolean
}

const ARROW: Record<Direction, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
}

/** 모바일에서 사용하는 방향 버튼. */
export function DPad({ onMove, disabled }: DPadProps) {
  function button(direction: Direction) {
    return (
      <button
        type="button"
        className={`dpad__button dpad__button--${direction}`}
        onClick={() => onMove(direction)}
        disabled={disabled}
        aria-label={`${DIRECTION_LABEL[direction]}으로 이동`}
      >
        <span aria-hidden="true">{ARROW[direction]}</span>
      </button>
    )
  }

  return (
    <div className="dpad">
      {button('up')}
      {button('left')}
      {button('right')}
      {button('down')}
    </div>
  )
}
