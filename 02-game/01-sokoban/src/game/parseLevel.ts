import { TILE } from './constants'
import type { BoardState, Box, Level, StaticMap } from './types'

export interface ParsedLevel {
  staticMap: StaticMap
  /** 스테이지 시작 시점의 보드 상태 */
  initialBoard: BoardState
}

export function cellIndex(row: number, col: number, cols: number): number {
  return row * cols + col
}

export function createBoxLookup(boxes: Box[], cols: number): Map<number, number> {
  const lookup = new Map<number, number>()
  boxes.forEach((box, index) => {
    lookup.set(cellIndex(box.row, box.col, cols), index)
  })
  return lookup
}

/**
 * XSB 문자열 배열을 정적 맵과 초기 보드 상태로 변환한다.
 * 줄 길이가 다르면 가장 긴 줄에 맞춰 바닥으로 채운다.
 */
export function parseLevel(level: Level): ParsedLevel {
  const rows = level.map.length
  const cols = Math.max(...level.map.map((line) => line.length))

  const walls: boolean[][] = []
  const goals: boolean[][] = []
  const boxes: Box[] = []
  let player = { row: 0, col: 0 }
  let playerFound = false
  let goalCount = 0

  for (let row = 0; row < rows; row += 1) {
    const wallRow: boolean[] = new Array(cols).fill(false)
    const goalRow: boolean[] = new Array(cols).fill(false)
    const line = level.map[row] ?? ''

    for (let col = 0; col < cols; col += 1) {
      const char = line[col] ?? TILE.FLOOR

      if (char === TILE.WALL) {
        wallRow[col] = true
        continue
      }

      if (char === TILE.GOAL || char === TILE.BOX_ON_GOAL || char === TILE.PLAYER_ON_GOAL) {
        goalRow[col] = true
        goalCount += 1
      }

      if (char === TILE.BOX || char === TILE.BOX_ON_GOAL) {
        boxes.push({ id: boxes.length, row, col })
      }

      if (char === TILE.PLAYER || char === TILE.PLAYER_ON_GOAL) {
        player = { row, col }
        playerFound = true
      }
    }

    walls.push(wallRow)
    goals.push(goalRow)
  }

  if (!playerFound) {
    throw new Error(`레벨 ${level.id}: 플레이어를 찾을 수 없습니다.`)
  }

  return {
    staticMap: { rows, cols, walls, goals, goalCount },
    initialBoard: {
      player,
      boxes,
      boxAt: createBoxLookup(boxes, cols),
    },
  }
}

export interface LevelValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 레벨 데이터가 최소 조건을 만족하는지 확인한다.
 * (플레이어 1명 / 상자 수와 목표 수 일치 / 바깥이 벽으로 닫혀 있음)
 */
export function validateLevel(level: Level): LevelValidationResult {
  const errors: string[] = []
  const joined = level.map.join('')
  const playerCount =
    joined.split(TILE.PLAYER).length - 1 + (joined.split(TILE.PLAYER_ON_GOAL).length - 1)

  if (playerCount !== 1) {
    errors.push(`플레이어가 ${playerCount}명입니다. 정확히 1명이어야 합니다.`)
  }

  const boxCount = joined.split(TILE.BOX).length - 1 + (joined.split(TILE.BOX_ON_GOAL).length - 1)
  const goalCount =
    joined.split(TILE.GOAL).length -
    1 +
    (joined.split(TILE.BOX_ON_GOAL).length - 1) +
    (joined.split(TILE.PLAYER_ON_GOAL).length - 1)

  if (boxCount !== goalCount) {
    errors.push(`상자 ${boxCount}개, 목표 지점 ${goalCount}개로 서로 다릅니다.`)
  }

  if (boxCount === 0) {
    errors.push('상자가 없습니다.')
  }

  if (playerCount === 1 && !isEnclosed(level)) {
    errors.push('플레이 영역이 벽으로 닫혀 있지 않습니다.')
  }

  return { valid: errors.length === 0, errors }
}

/** 플레이어에서 시작한 flood fill 이 맵 바깥으로 새어 나가지 않는지 확인한다. */
function isEnclosed(level: Level): boolean {
  const { staticMap, initialBoard } = parseLevel(level)
  const { rows, cols, walls } = staticMap
  const visited = new Set<number>()
  const queue = [initialBoard.player]
  visited.add(cellIndex(initialBoard.player.row, initialBoard.player.col, cols))

  while (queue.length > 0) {
    const current = queue.pop()!
    const neighbors = [
      { row: current.row - 1, col: current.col },
      { row: current.row + 1, col: current.col },
      { row: current.row, col: current.col - 1 },
      { row: current.row, col: current.col + 1 },
    ]

    for (const next of neighbors) {
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) {
        return false
      }
      if (walls[next.row]![next.col]) continue

      const index = cellIndex(next.row, next.col, cols)
      if (visited.has(index)) continue
      visited.add(index)
      queue.push(next)
    }
  }

  return true
}
