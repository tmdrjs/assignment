import { memo } from 'react'
import type { CSSProperties } from 'react'
import { DIRECTION_DELTA } from '../game/constants'
import type { Apple, BoardState, Direction, StaticMap } from '../game/types'

interface StaticGridProps {
  staticMap: StaticMap
  tileSize: number
}

/** 벽과 목표 지점은 변하지 않으므로 따로 그리고 메모한다. */
const StaticGrid = memo(function StaticGrid({ staticMap, tileSize }: StaticGridProps) {
  const { rows, cols, walls, goals } = staticMap

  return (
    <div
      className="board__grid"
      style={{
        gridTemplateColumns: `repeat(${cols}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${tileSize}px)`,
      }}
    >
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          if (walls[row][col]) {
            return <div key={`${row}-${col}`} className="tile tile--wall" />
          }
          if (goals[row][col]) {
            return (
              <div key={`${row}-${col}`} className="tile tile--goal">
                <span className="goal-mark" />
              </div>
            )
          }
          return <div key={`${row}-${col}`} className="tile tile--floor" />
        }),
      )}
    </div>
  )
})

interface BoardProps {
  staticMap: StaticMap
  board: BoardState
  apples: Apple[]
  tileSize: number
  blocked: { direction: Direction; tick: number } | null
}

/** 막힌 방향으로 살짝 밀렸다 돌아오는 효과. 위치 transform 과 겹치지 않도록 안쪽 요소에 준다. */
function bumpStyle(direction: Direction): CSSProperties {
  const delta = DIRECTION_DELTA[direction]
  return {
    '--bump-x': `${delta.col * 18}%`,
    '--bump-y': `${delta.row * 18}%`,
  } as CSSProperties
}

export function Board({ staticMap, board, apples, tileSize, blocked }: BoardProps) {
  const { rows, cols, goals } = staticMap

  const actorStyle = (row: number, col: number): CSSProperties => ({
    width: tileSize,
    height: tileSize,
    transform: `translate3d(${col * tileSize}px, ${row * tileSize}px, 0)`,
  })

  // 같은 방향으로 계속 막혀도 효과가 다시 보이도록 애니메이션 이름을 번갈아 준다.
  const bumpClass = blocked ? ` player__body--bump-${blocked.tick % 2}` : ''

  return (
    <div
      className="board"
      style={{ width: cols * tileSize, height: rows * tileSize, ['--tile' as string]: `${tileSize}px` }}
      aria-hidden="true"
    >
      <StaticGrid staticMap={staticMap} tileSize={tileSize} />

      {/* 상자보다 먼저 그려서, 상자가 사과 위로 밀려 오면 사과를 가린다. */}
      {apples.map((apple) => (
        <div key={apple.id} className="actor apple" style={actorStyle(apple.row, apple.col)}>
          <span className="apple__body" />
        </div>
      ))}

      {board.boxes.map((box) => {
        const onGoal = goals[box.row][box.col]
        return (
          <div
            key={box.id}
            className={`actor box${onGoal ? ' box--done' : ''}`}
            style={actorStyle(box.row, box.col)}
          >
            <span className="box__face">{onGoal ? '✓' : ''}</span>
          </div>
        )
      })}

      <div className="actor player" style={actorStyle(board.player.row, board.player.col)}>
        <span
          className={`player__body${bumpClass}`}
          style={blocked ? bumpStyle(blocked.direction) : undefined}
        />
      </div>
    </div>
  )
}
