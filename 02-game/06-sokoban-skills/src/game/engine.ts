import { DIRECTION_DELTA, OPPOSITE_DIRECTION } from './constants'
import { cellIndex } from './parseLevel'
import type { BoardState, Direction, MoveRecord, MoveResult, Position, StaticMap } from './types'

/** 맵 범위 안이고 벽이 아닌 칸인지 확인한다. */
function isWalkable(staticMap: StaticMap, position: Position): boolean {
  const { rows, cols, walls } = staticMap
  if (position.row < 0 || position.row >= rows) return false
  if (position.col < 0 || position.col >= cols) return false
  return !walls[position.row][position.col]
}

function translate(position: Position, direction: Direction): Position {
  const delta = DIRECTION_DELTA[direction]
  return { row: position.row + delta.row, col: position.col + delta.col }
}

export function boxIndexAt(board: BoardState, position: Position, cols: number): number | undefined {
  return board.boxAt.get(cellIndex(position.row, position.col, cols))
}

/**
 * 한 칸 이동을 시도한다.
 * 이동할 수 없으면 null 을 돌려주고, 기존 상태는 변경하지 않는다.
 */
export function tryMove(
  staticMap: StaticMap,
  board: BoardState,
  direction: Direction,
): MoveResult | null {
  const { cols } = staticMap
  const next = translate(board.player, direction)

  if (!isWalkable(staticMap, next)) return null

  const targetBoxIndex = boxIndexAt(board, next, cols)

  // 빈 칸으로 이동
  if (targetBoxIndex === undefined) {
    return {
      board: { player: next, boxes: board.boxes, boxAt: board.boxAt },
      record: { direction, pushed: false },
    }
  }

  // 상자를 미는 경우: 상자 뒤 칸이 비어 있어야 한다.
  const behind = translate(next, direction)
  if (!isWalkable(staticMap, behind)) return null
  if (boxIndexAt(board, behind, cols) !== undefined) return null

  const boxes = board.boxes.slice()
  boxes[targetBoxIndex] = { ...boxes[targetBoxIndex], row: behind.row, col: behind.col }

  const boxAt = new Map(board.boxAt)
  boxAt.delete(cellIndex(next.row, next.col, cols))
  boxAt.set(cellIndex(behind.row, behind.col, cols), targetBoxIndex)

  return {
    board: { player: next, boxes, boxAt },
    record: { direction, pushed: true },
  }
}

/**
 * 이동 기록 하나를 되돌린다.
 * 기록은 이동 직후 상태를 기준으로 하므로 플레이어를 반대 방향으로 옮기고,
 * 상자를 밀었다면 상자를 플레이어가 있던 칸으로 되돌린다.
 */
export function undoMove(
  staticMap: StaticMap,
  board: BoardState,
  record: MoveRecord,
): BoardState {
  const { cols } = staticMap
  const previousPlayer = translate(board.player, OPPOSITE_DIRECTION[record.direction])

  if (!record.pushed) {
    return { player: previousPlayer, boxes: board.boxes, boxAt: board.boxAt }
  }

  const boxPosition = translate(board.player, record.direction)
  const boxIndex = boxIndexAt(board, boxPosition, cols)

  if (boxIndex === undefined) {
    // 기록과 보드가 어긋난 경우: 플레이어 위치만 되돌린다.
    return { player: previousPlayer, boxes: board.boxes, boxAt: board.boxAt }
  }

  const boxes = board.boxes.slice()
  boxes[boxIndex] = { ...boxes[boxIndex], row: board.player.row, col: board.player.col }

  const boxAt = new Map(board.boxAt)
  boxAt.delete(cellIndex(boxPosition.row, boxPosition.col, cols))
  boxAt.set(cellIndex(board.player.row, board.player.col, cols), boxIndex)

  return { player: previousPlayer, boxes, boxAt }
}

/** 모든 상자가 목표 지점 위에 있으면 클리어다. */
export function isCleared(staticMap: StaticMap, board: BoardState): boolean {
  return board.boxes.every((box) => staticMap.goals[box.row][box.col])
}

export function countBoxesOnGoal(staticMap: StaticMap, board: BoardState): number {
  return board.boxes.filter((box) => staticMap.goals[box.row][box.col]).length
}
