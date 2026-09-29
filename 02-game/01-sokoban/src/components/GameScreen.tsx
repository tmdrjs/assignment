import { useEffect, useRef, useState } from 'react'
import { DIFFICULTY_LABEL } from '../game/levels'
import type { StageRecord } from '../game/storage'
import type { Level } from '../game/types'
import { useApples } from '../hooks/useApples'
import { useGame } from '../hooks/useGame'
import { useKeyboard } from '../hooks/useKeyboard'
import { useSwipe } from '../hooks/useSwipe'
import { useTileSize } from '../hooks/useTileSize'
import { Board } from './Board'
import { ClearOverlay } from './ClearOverlay'
import { DPad } from './DPad'
import { Timer } from './Timer'

interface GameScreenProps {
  level: Level
  /** 이 스테이지에 들어오기 전까지의 최고 기록 */
  previousBest?: StageRecord
  hasNext: boolean
  onClear: (stageId: number, record: StageRecord) => void
  onNext: () => void
  onExit: () => void
}

interface ClearInfo {
  newRecord: boolean
  previousBest?: StageRecord
  seconds: number
}

export function GameScreen({
  level,
  previousBest,
  hasNext,
  onClear,
  onNext,
  onExit,
}: GameScreenProps) {
  const { state, boxesOnGoal, canUndo, stuck, move, undo, reset } = useGame(level)
  const boardAreaRef = useRef<HTMLDivElement>(null)
  const tileSize = useTileSize(boardAreaRef, state.staticMap.rows, state.staticMap.cols)
  const { apples, eaten } = useApples({
    staticMap: state.staticMap,
    board: state.board,
    active: !state.cleared,
  })

  // 진입 시점의 최고 기록. 클리어로 기록이 갱신돼도 비교 기준은 유지한다.
  const bestRef = useRef(previousBest)
  const reportedRef = useRef<number | null>(null)
  const [clearInfo, setClearInfo] = useState<ClearInfo | null>(null)

  useKeyboard({
    onMove: move,
    onUndo: undo,
    onReset: reset,
    onExit,
    enabled: true,
  })

  useSwipe(boardAreaRef, move, !state.cleared)

  useEffect(() => {
    if (!state.cleared || state.finishedAt === null) {
      // 되돌리기로 클리어가 취소된 경우
      if (clearInfo !== null) setClearInfo(null)
      return
    }
    if (reportedRef.current === state.finishedAt) return
    reportedRef.current = state.finishedAt

    const seconds = Math.floor((state.finishedAt - (state.startedAt ?? state.finishedAt)) / 1000)
    const record: StageRecord = { moves: state.moves, seconds }
    const best = bestRef.current
    const newRecord = !best || record.moves < best.moves

    setClearInfo({ newRecord, previousBest: best, seconds })
    if (newRecord) bestRef.current = record
    onClear(level.id, record)
  }, [
    clearInfo,
    level.id,
    onClear,
    state.cleared,
    state.finishedAt,
    state.moves,
    state.startedAt,
  ])

  const totalBoxes = state.board.boxes.length
  const statusText = state.cleared
    ? '클리어했습니다.'
    : `상자 ${boxesOnGoal} / ${totalBoxes} 완료`

  return (
    <div className="screen screen--game">
      <header className="game-header">
        <button type="button" className="button button--ghost" onClick={onExit}>
          ← 목록
        </button>
        <div className="game-header__title">
          <span className="game-header__stage">STAGE {level.id}</span>
          <h1 className="game-header__name">{level.name}</h1>
        </div>
        <span className={`badge badge--${level.difficulty}`}>
          {DIFFICULTY_LABEL[level.difficulty]}
        </span>
      </header>

      <div className="stats">
        <div className="stat">
          <span className="stat__label">이동</span>
          <span className="stat__value">{state.moves}</span>
        </div>
        <div className="stat">
          <span className="stat__label">밀기</span>
          <span className="stat__value">{state.pushes}</span>
        </div>
        <div className="stat">
          <span className="stat__label">시간</span>
          <Timer startedAt={state.startedAt} finishedAt={state.finishedAt} />
        </div>
        <div className="stat">
          <span className="stat__label">상자</span>
          <span className="stat__value">
            {boxesOnGoal}/{totalBoxes}
          </span>
        </div>
        <div className="stat">
          <span className="stat__label">사과</span>
          <span className="stat__value">{eaten}</span>
        </div>
      </div>

      <div className="board-area" ref={boardAreaRef}>
        <Board
          staticMap={state.staticMap}
          board={state.board}
          apples={apples}
          tileSize={tileSize}
          blocked={state.blocked}
        />

        {state.cleared && clearInfo && (
          <ClearOverlay
            stageName={level.name}
            moves={state.moves}
            pushes={state.pushes}
            seconds={clearInfo.seconds}
            minMoves={level.minMoves}
            newRecord={clearInfo.newRecord}
            previousBest={clearInfo.previousBest}
            hasNext={hasNext}
            onNext={onNext}
            onRetry={reset}
            onList={onExit}
          />
        )}
      </div>

      <p className={`status${stuck ? ' status--warning' : ''}`} role="status" aria-live="polite">
        {stuck ? '상자가 더 이상 움직일 수 없습니다. 되돌리거나 다시 시작하세요.' : statusText}
      </p>

      <div className="controls">
        <button type="button" className="button" onClick={undo} disabled={!canUndo}>
          되돌리기 <kbd>Z</kbd>
        </button>
        <button type="button" className="button" onClick={reset} disabled={state.moves === 0}>
          다시 시작 <kbd>R</kbd>
        </button>
      </div>

      <DPad onMove={move} disabled={state.cleared} />
    </div>
  )
}
