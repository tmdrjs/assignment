import { useCallback, useMemo, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog'
import { GameScreen } from './components/GameScreen'
import { StageSelectScreen } from './components/StageSelectScreen'
import { StartScreen } from './components/StartScreen'
import { FIRST_STAGE_ID, findLevel, nextLevelId } from './game/levels'
import type { Progress, StageRecord } from './game/storage'
import {
  applyClear,
  clearProgress,
  createEmptyProgress,
  hasProgress,
  isStageUnlocked,
  loadProgress,
  saveProgress,
  withLastStage,
} from './game/storage'

type Screen = 'start' | 'select' | 'game'

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [screen, setScreen] = useState<Screen>('start')
  const [stageId, setStageId] = useState<number>(FIRST_STAGE_ID)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const level = useMemo(() => findLevel(stageId) ?? findLevel(FIRST_STAGE_ID)!, [stageId])

  /** 스테이지 진입 시점에도 진행 상황을 저장한다. */
  const enterStage = useCallback((id: number) => {
    setStageId(id)
    setScreen('game')
    setProgress((current) => {
      const updated = withLastStage(current, id)
      if (updated !== current) saveProgress(updated)
      return updated
    })
  }, [])

  const handleClear = useCallback((clearedStageId: number, record: StageRecord) => {
    setProgress((current) => {
      const { progress: updated } = applyClear(current, clearedStageId, record)
      saveProgress(updated)
      return updated
    })
  }, [])

  const handleNext = useCallback(() => {
    const next = nextLevelId(stageId)
    if (next === null) {
      setScreen('select')
      return
    }
    enterStage(next)
  }, [enterStage, stageId])

  const handleSelect = useCallback(
    (id: number) => {
      if (!isStageUnlocked(progress, id)) return
      enterStage(id)
    },
    [enterStage, progress],
  )

  const handleResetProgress = useCallback(() => {
    clearProgress()
    setProgress(createEmptyProgress())
    setStageId(FIRST_STAGE_ID)
    setConfirmingReset(false)
  }, [])

  const savedProgress = hasProgress(progress)

  return (
    <main className="app">
      {screen === 'start' && (
        <StartScreen
          progress={progress}
          hasSavedProgress={savedProgress}
          onStart={() => enterStage(FIRST_STAGE_ID)}
          onContinue={() =>
            enterStage(
              isStageUnlocked(progress, progress.lastStage) && findLevel(progress.lastStage)
                ? progress.lastStage
                : FIRST_STAGE_ID,
            )
          }
          onSelect={() => setScreen('select')}
          onResetProgress={() => setConfirmingReset(true)}
        />
      )}

      {screen === 'select' && (
        <StageSelectScreen
          progress={progress}
          onSelect={handleSelect}
          onBack={() => setScreen('start')}
        />
      )}

      {screen === 'game' && (
        <GameScreen
          key={level.id}
          level={level}
          previousBest={progress.records[level.id]}
          hasNext={nextLevelId(level.id) !== null}
          onClear={handleClear}
          onNext={handleNext}
          onExit={() => setScreen('select')}
        />
      )}

      {confirmingReset && (
        <ConfirmDialog
          title="진행 기록을 초기화할까요?"
          message="클리어한 스테이지와 최고 기록이 모두 사라집니다. 되돌릴 수 없습니다."
          confirmLabel="초기화"
          onConfirm={handleResetProgress}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </main>
  )
}
