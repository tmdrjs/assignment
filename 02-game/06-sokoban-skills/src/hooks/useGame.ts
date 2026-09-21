import { useCallback, useMemo, useReducer } from 'react'
import { hasStuckBox } from '../game/deadlock'
import { countBoxesOnGoal, isCleared, tryMove, undoMove } from '../game/engine'
import { parseLevel } from '../game/parseLevel'
import type { BoardState, Direction, Level, MoveRecord, StaticMap } from '../game/types'

export interface GameState {
  level: Level
  staticMap: StaticMap
  board: BoardState
  history: MoveRecord[]
  moves: number
  pushes: number
  /** 첫 입력 시각. 아직 입력이 없으면 null */
  startedAt: number | null
  /** 클리어 시각 */
  finishedAt: number | null
  cleared: boolean
  /** 막힌 방향으로 입력했을 때 반응을 주기 위한 값 */
  blocked: { direction: Direction; tick: number } | null
}

type GameAction =
  | { type: 'load'; level: Level }
  | { type: 'move'; direction: Direction; now: number }
  | { type: 'undo' }
  | { type: 'reset' }

export function createGameState(level: Level): GameState {
  const { staticMap, initialBoard } = parseLevel(level)
  return {
    level,
    staticMap,
    board: initialBoard,
    history: [],
    moves: 0,
    pushes: 0,
    startedAt: null,
    finishedAt: null,
    cleared: isCleared(staticMap, initialBoard),
    blocked: null,
  }
}

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'load':
      return createGameState(action.level)

    case 'reset':
      return createGameState(state.level)

    case 'move': {
      if (state.cleared) return state

      const result = tryMove(state.staticMap, state.board, action.direction)
      const startedAt = state.startedAt ?? action.now

      if (!result) {
        // 이동할 수 없는 방향: 화면에서 짧게 반응만 준다.
        const tick = (state.blocked?.tick ?? 0) + 1
        return { ...state, startedAt, blocked: { direction: action.direction, tick } }
      }

      const cleared = isCleared(state.staticMap, result.board)

      return {
        ...state,
        board: result.board,
        history: [...state.history, result.record],
        moves: state.moves + 1,
        pushes: state.pushes + (result.record.pushed ? 1 : 0),
        startedAt,
        finishedAt: cleared ? action.now : null,
        cleared,
        blocked: null,
      }
    }

    case 'undo': {
      const last = state.history[state.history.length - 1]
      if (!last) return state

      return {
        ...state,
        board: undoMove(state.staticMap, state.board, last),
        history: state.history.slice(0, -1),
        moves: state.moves - 1,
        pushes: state.pushes - (last.pushed ? 1 : 0),
        finishedAt: null,
        cleared: false,
        blocked: null,
      }
    }

    default:
      return state
  }
}

export interface GameController {
  state: GameState
  boxesOnGoal: number
  canUndo: boolean
  /** 확실하게 막힌 상자가 있는 상태 */
  stuck: boolean
  move: (direction: Direction) => void
  undo: () => void
  reset: () => void
  load: (level: Level) => void
}

export function useGame(initialLevel: Level): GameController {
  const [state, dispatch] = useReducer(reducer, initialLevel, createGameState)

  const move = useCallback((direction: Direction) => {
    dispatch({ type: 'move', direction, now: Date.now() })
  }, [])

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  const load = useCallback((level: Level) => dispatch({ type: 'load', level }), [])

  const boxesOnGoal = useMemo(
    () => countBoxesOnGoal(state.staticMap, state.board),
    [state.staticMap, state.board],
  )

  const stuck = useMemo(
    () => !state.cleared && hasStuckBox(state.staticMap, state.board),
    [state.cleared, state.staticMap, state.board],
  )

  return {
    state,
    boxesOnGoal,
    canUndo: state.history.length > 0,
    stuck,
    move,
    undo,
    reset,
    load,
  }
}
