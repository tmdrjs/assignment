import { DIFFICULTY_LABEL, LEVELS } from '../game/levels'
import { formatTime } from '../game/format'
import type { Progress } from '../game/storage'
import { isStageCleared, isStageUnlocked } from '../game/storage'

interface StageSelectScreenProps {
  progress: Progress
  onSelect: (stageId: number) => void
  onBack: () => void
}

export function StageSelectScreen({ progress, onSelect, onBack }: StageSelectScreenProps) {
  return (
    <div className="screen screen--select">
      <header className="select__header">
        <button type="button" className="button button--ghost" onClick={onBack}>
          ← 처음으로
        </button>
        <h1 className="select__title">스테이지</h1>
        <span className="select__count">
          {progress.clearedStages.length} / {LEVELS.length}
        </span>
      </header>

      <ul className="stage-grid">
        {LEVELS.map((level) => {
          const unlocked = isStageUnlocked(progress, level.id)
          const cleared = isStageCleared(progress, level.id)
          const record = progress.records[level.id]

          return (
            <li key={level.id}>
              <button
                type="button"
                className={`stage-card${cleared ? ' stage-card--cleared' : ''}`}
                onClick={() => onSelect(level.id)}
                disabled={!unlocked}
                aria-label={
                  unlocked
                    ? `${level.id}번 스테이지 ${level.name}, ${cleared ? '클리어함' : '미클리어'}`
                    : `${level.id}번 스테이지 잠김. 이전 스테이지를 먼저 클리어하세요.`
                }
              >
                <span className="stage-card__number">{level.id}</span>
                <span className="stage-card__name">{unlocked ? level.name : '잠김'}</span>
                <span className={`badge badge--${level.difficulty}`}>
                  {DIFFICULTY_LABEL[level.difficulty]}
                </span>
                <span className="stage-card__record">
                  {!unlocked && <span aria-hidden="true">🔒</span>}
                  {unlocked && cleared && record && (
                    <>
                      <span className="stage-card__check" aria-hidden="true">
                        ✓
                      </span>
                      {record.moves}회 · {formatTime(record.seconds)}
                    </>
                  )}
                  {unlocked && !cleared && '도전하기'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
