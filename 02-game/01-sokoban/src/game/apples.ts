import { DIRECTION_DELTA } from './constants'
import { cellIndex } from './parseLevel'
import type { Apple, BoardState, Position, StaticMap } from './types'

/** 사과가 새로 생기는 간격 */
export const APPLE_SPAWN_INTERVAL_MS = 5000

/** 보드에 동시에 놓일 수 있는 사과 수. 가득 차면 먹을 때까지 새로 생기지 않는다. */
export const MAX_APPLES = 5

/**
 * 벽 안쪽의 칸 목록.
 * 맵 바깥쪽 빈 칸에 사과가 생기지 않도록 플레이어 위치에서 벽만 피해 flood fill 한다.
 * 상자는 움직이므로 막힌 칸으로 보지 않는다.
 */
function findInnerCells(staticMap: StaticMap, start: Position): Position[] {
  const { rows, cols, walls } = staticMap
  const visited = new Set([cellIndex(start.row, start.col, cols)])
  const queue = [start]
  const cells: Position[] = []

  while (queue.length > 0) {
    const current = queue.pop()!
    cells.push(current)

    for (const delta of Object.values(DIRECTION_DELTA)) {
      const next = { row: current.row + delta.row, col: current.col + delta.col }
      if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) continue
      if (walls[next.row][next.col]) continue

      const index = cellIndex(next.row, next.col, cols)
      if (visited.has(index)) continue
      visited.add(index)
      queue.push(next)
    }
  }

  return cells
}

/**
 * 사과를 놓을 칸을 무작위로 고른다.
 * 플레이어, 상자, 이미 있는 사과, 목표 지점 칸은 제외한다. 놓을 칸이 없으면 null.
 */
export function pickAppleCell(
  staticMap: StaticMap,
  board: BoardState,
  apples: Apple[],
  random: () => number = Math.random,
): Position | null {
  const { cols, goals } = staticMap
  const occupied = new Set(apples.map((apple) => cellIndex(apple.row, apple.col, cols)))
  occupied.add(cellIndex(board.player.row, board.player.col, cols))

  const candidates = findInnerCells(staticMap, board.player).filter((cell) => {
    const index = cellIndex(cell.row, cell.col, cols)
    return !goals[cell.row][cell.col] && !occupied.has(index) && !board.boxAt.has(index)
  })

  if (candidates.length === 0) return null
  return candidates[Math.floor(random() * candidates.length)]
}

export function appleAt(apples: Apple[], position: Position): Apple | undefined {
  return apples.find((apple) => apple.row === position.row && apple.col === position.col)
}
