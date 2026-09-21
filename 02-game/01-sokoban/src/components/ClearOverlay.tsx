import { formatTime } from '../game/format'
import type { StageRecord } from '../game/storage'

interface ClearOverlayProps {
  stageName: string
  moves: number
  pushes: number
  seconds: number
  minMoves?: number
  newRecord: boolean
  previousBest?: StageRecord
  hasNext: boolean
  onNext: () => void
  onRetry: () => void
  onList: () => void
}

export function ClearOverlay({
  stageName,
  moves,
  pushes,
  seconds,
  minMoves,
  newRecord,
  previousBest,
  hasNext,
  onNext,
  onRetry,
  onList,
}: ClearOverlayProps) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="clear-title">
      <div className="overlay__panel">
        <p className="overlay__eyebrow">{stageName}</p>
        <h2 className="overlay__title" id="clear-title">
          {hasNext ? '클리어!' : '모든 스테이지 완료!'}
        </h2>

        {!hasNext && <p className="overlay__message">마지막 스테이지까지 모두 풀었습니다.</p>}

        <dl className="overlay__stats">
          <div>
            <dt>이동</dt>
            <dd>{moves}</dd>
          </div>
          <div>
            <dt>밀기</dt>
            <dd>{pushes}</dd>
          </div>
          <div>
            <dt>시간</dt>
            <dd>{formatTime(seconds)}</dd>
          </div>
        </dl>

        {newRecord ? (
          <p className="overlay__record overlay__record--new">
            ★ 최고 기록 갱신
            {previousBest ? ` (이전 ${previousBest.moves}회)` : ''}
          </p>
        ) : (
          previousBest && <p className="overlay__record">최고 기록 {previousBest.moves}회</p>
        )}

        {minMoves !== undefined && (
          <p className="overlay__hint">이 스테이지의 최소 이동 수는 {minMoves}회입니다.</p>
        )}

        <div className="overlay__actions">
          {hasNext && (
            <button type="button" className="button button--primary" onClick={onNext} autoFocus>
              다음 스테이지
            </button>
          )}
          <button
            type="button"
            className={`button${hasNext ? '' : ' button--primary'}`}
            onClick={onRetry}
            autoFocus={!hasNext}
          >
            다시 하기
          </button>
          <button type="button" className="button" onClick={onList}>
            스테이지 목록
          </button>
        </div>
      </div>
    </div>
  )
}
