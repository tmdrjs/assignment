import { FIRST_STAGE_ID } from './levels'

const STORAGE_KEY = 'sokoban:progress:v1'

export interface StageRecord {
  moves: number
  /** 초 단위 */
  seconds: number
}

export interface Progress {
  clearedStages: number[]
  /** 스테이지 id -> 최고 기록 */
  records: Record<number, StageRecord>
  lastStage: number
}

export function createEmptyProgress(): Progress {
  return { clearedStages: [], records: {}, lastStage: FIRST_STAGE_ID }
}

/**
 * 저장된 진행 상황을 읽는다.
 * 데이터가 없거나 손상된 경우 초기 상태를 돌려주고 게임은 정상 진행한다.
 */
export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createEmptyProgress()
    return normalize(JSON.parse(raw))
  } catch {
    return createEmptyProgress()
  }
}

/** 저장 실패가 게임 진행을 막지 않도록 조용히 무시한다. */
export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // 저장 공간이 없거나 접근이 막힌 경우
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // 무시
  }
}

export function hasProgress(progress: Progress): boolean {
  return progress.clearedStages.length > 0
}

export function isStageCleared(progress: Progress, stageId: number): boolean {
  return progress.clearedStages.includes(stageId)
}

/** 1스테이지는 항상 열려 있고, 그 외에는 이전 스테이지를 클리어해야 열린다. */
export function isStageUnlocked(progress: Progress, stageId: number): boolean {
  if (stageId === FIRST_STAGE_ID) return true
  return isStageCleared(progress, stageId - 1)
}

export interface ClearOutcome {
  progress: Progress
  /** 최고 기록(이동 수)을 갱신했는지 여부 */
  newRecord: boolean
}

export function applyClear(
  progress: Progress,
  stageId: number,
  result: StageRecord,
): ClearOutcome {
  const previous = progress.records[stageId]
  const newRecord = !previous || result.moves < previous.moves

  return {
    progress: {
      clearedStages: progress.clearedStages.includes(stageId)
        ? progress.clearedStages
        : [...progress.clearedStages, stageId].sort((a, b) => a - b),
      records: newRecord ? { ...progress.records, [stageId]: result } : progress.records,
      lastStage: stageId,
    },
    newRecord,
  }
}

export function withLastStage(progress: Progress, stageId: number): Progress {
  if (progress.lastStage === stageId) return progress
  return { ...progress, lastStage: stageId }
}

/** 손상된 저장 데이터를 안전한 형태로 정리한다. */
function normalize(value: unknown): Progress {
  if (typeof value !== 'object' || value === null) return createEmptyProgress()
  const raw = value as Partial<Progress>

  const clearedStages = Array.isArray(raw.clearedStages)
    ? raw.clearedStages.filter((id): id is number => Number.isInteger(id))
    : []

  const records: Record<number, StageRecord> = {}
  if (typeof raw.records === 'object' && raw.records !== null) {
    for (const [key, record] of Object.entries(raw.records)) {
      const stageId = Number(key)
      if (!Number.isInteger(stageId)) continue
      if (typeof record !== 'object' || record === null) continue
      const { moves, seconds } = record as Partial<StageRecord>
      if (typeof moves !== 'number' || typeof seconds !== 'number') continue
      records[stageId] = { moves, seconds }
    }
  }

  const lastStage = Number.isInteger(raw.lastStage) ? (raw.lastStage as number) : FIRST_STAGE_ID

  return { clearedStages, records, lastStage }
}
