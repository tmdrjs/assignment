import type { BoardState, StaticMap } from './types'

/**
 * 목표 지점이 아닌 칸에서 벽으로 된 코너에 박힌 상자를 찾는다.
 *
 * 코너에 들어간 상자는 밀어서 빼낼 수 없으므로 확실한 막힘 상태다.
 * 판정이 애매해지지 않도록 벽만 검사하고, 다른 상자로 생기는 막힘은 검사하지 않는다.
 */
export function hasStuckBox(staticMap: StaticMap, board: BoardState): boolean {
  const { rows, cols, walls, goals } = staticMap

  return board.boxes.some((box) => {
    if (goals[box.row][box.col]) return false

    const up = box.row - 1 < 0 || walls[box.row - 1][box.col]
    const down = box.row + 1 >= rows || walls[box.row + 1][box.col]
    const left = box.col - 1 < 0 || walls[box.row][box.col - 1]
    const right = box.col + 1 >= cols || walls[box.row][box.col + 1]

    const blockedVertically = up || down
    const blockedHorizontally = left || right

    return blockedVertically && blockedHorizontally
  })
}
