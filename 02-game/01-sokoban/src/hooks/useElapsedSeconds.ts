import { useEffect, useState } from 'react'

/**
 * 경과 시간(초)을 센다.
 * 보드와 분리해서 사용하기 위한 훅이라, 초가 바뀌어도 보드는 다시 그리지 않는다.
 */
export function useElapsedSeconds(startedAt: number | null, finishedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null || finishedAt !== null) return

    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [startedAt, finishedAt])

  if (startedAt === null) return 0
  return Math.floor(((finishedAt ?? now) - startedAt) / 1000)
}
