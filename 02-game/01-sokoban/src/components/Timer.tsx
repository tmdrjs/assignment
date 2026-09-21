import { formatTime } from '../game/format'
import { useElapsedSeconds } from '../hooks/useElapsedSeconds'

interface TimerProps {
  startedAt: number | null
  finishedAt: number | null
}

/** 시간 표시만 다시 그리도록 분리한 컴포넌트. */
export function Timer({ startedAt, finishedAt }: TimerProps) {
  const seconds = useElapsedSeconds(startedAt, finishedAt)
  return <span className="stat__value">{formatTime(seconds)}</span>
}
