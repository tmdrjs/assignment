import { LEVELS } from '../game/levels'
import type { Progress } from '../game/storage'

interface StartScreenProps {
  progress: Progress
  hasSavedProgress: boolean
  onStart: () => void
  onContinue: () => void
  onSelect: () => void
  onResetProgress: () => void
}

export function StartScreen({
  progress,
  hasSavedProgress,
  onStart,
  onContinue,
  onSelect,
  onResetProgress,
}: StartScreenProps) {
  const clearedCount = progress.clearedStages.length

  return (
    <div className="screen screen--start">
      <div className="start__inner">
        <header className="start__header">
          <p className="start__eyebrow">PUSH THE BOXES</p>
          <h1 className="start__title">소코반</h1>
          <p className="start__description">
            상자를 밀어 모든 목표 지점에 올리면 클리어입니다.
            <br />
            상자는 밀 수만 있고 당길 수는 없습니다.
          </p>
        </header>

        <div className="start__actions">
          {hasSavedProgress ? (
            <>
              <button type="button" className="button button--primary button--lg" onClick={onContinue}>
                이어하기
                <span className="button__sub">STAGE {progress.lastStage}</span>
              </button>
              <button type="button" className="button button--lg" onClick={onSelect}>
                스테이지 선택
              </button>
            </>
          ) : (
            <>
              <button type="button" className="button button--primary button--lg" onClick={onStart}>
                시작하기
              </button>
              <button type="button" className="button button--lg" onClick={onSelect}>
                스테이지 선택
              </button>
            </>
          )}
        </div>

        <section className="start__help" aria-label="조작 방법">
          <h2 className="start__help-title">조작 방법</h2>
          <ul className="help-list">
            <li>
              <span className="help-key" aria-hidden="true">
                ↑ ↓ ← →
              </span>
              <span>방향키 또는 W A S D 로 이동</span>
            </li>
            <li>
              <span className="help-key" aria-hidden="true">
                Z
              </span>
              <span>되돌리기</span>
            </li>
            <li>
              <span className="help-key" aria-hidden="true">
                R
              </span>
              <span>다시 시작</span>
            </li>
            <li>
              <span className="help-key help-key--touch" aria-hidden="true">
                ✋
              </span>
              <span>모바일에서는 스와이프 또는 방향 버튼</span>
            </li>
          </ul>
        </section>

        <footer className="start__footer">
          <p>
            진행 {clearedCount} / {LEVELS.length} 스테이지
          </p>
          {hasSavedProgress && (
            <button type="button" className="button button--ghost button--sm" onClick={onResetProgress}>
              진행 기록 초기화
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
