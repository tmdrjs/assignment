import type { Direction, Position } from './types'

/** XSB 표기법 문자 */
export const TILE = {
  WALL: '#',
  FLOOR: ' ',
  GOAL: '.',
  BOX: '$',
  BOX_ON_GOAL: '*',
  PLAYER: '@',
  PLAYER_ON_GOAL: '+',
} as const

export const DIRECTION_DELTA: Record<Direction, Position> = {
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
}

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const DIRECTION_LABEL: Record<Direction, string> = {
  up: '위',
  down: '아래',
  left: '왼쪽',
  right: '오른쪽',
}
