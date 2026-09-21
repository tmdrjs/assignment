/**
 * 상태 저장소 ↔ 워커 연결.
 *  - 폐쇄 상태가 바뀌면 영향 분석 요청, 출발·도착 또는 폐쇄 상태가 바뀌면 경로 비교 요청
 *  - 타이머 없이 합치기: 요청이 진행 중일 때 들어온 변경은 "dirty" 로 표시해 두었다가
 *    응답이 오면 한 번만 다시 실행한다 (연타해도 최대 1건만 대기, 항상 최신 상태 반영)
 */
import { GraphClient } from '../graph/client.ts'
import { closedArray, useSim } from './store.ts'

function coalesce(run: () => Promise<void>): () => void {
  let inflight = false
  let dirty = false
  const kick = async () => {
    if (inflight) {
      dirty = true
      return
    }
    inflight = true
    try {
      do {
        dirty = false
        await run()
      } while (dirty)
    } finally {
      inflight = false
    }
  }
  return () => void kick()
}

export function startEngine(client: GraphClient): () => void {
  const analyze = coalesce(async () => {
    const s = useSim.getState()
    if (!s.ready) return
    s.setAnalysis(s.analysis, true)
    try {
      const result = await client.analyze(closedArray(s.closed), s.domesticOnly)
      useSim.getState().setAnalysis(result, false)
    } catch (err) {
      useSim.getState().setAnalysis(null, false)
      useSim.getState().showToast(`분석 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  const route = coalesce(async () => {
    const s = useSim.getState()
    if (!s.ready) return
    if (s.routeFrom === null || s.routeTo === null) {
      if (s.route) s.setRoute(null, false)
      return
    }
    s.setRoute(s.route, true)
    try {
      const result = await client.route(s.routeFrom, s.routeTo, closedArray(s.closed), s.domesticOnly)
      useSim.getState().setRoute(result, false)
    } catch (err) {
      useSim.getState().setRoute(null, false)
      useSim.getState().showToast(`경로 계산 실패: ${err instanceof Error ? err.message : String(err)}`)
    }
  })

  const unsubA = useSim.subscribe((s) => [s.closed, s.domesticOnly, s.ready] as const, analyze, {
    equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2],
    fireImmediately: true,
  })
  const unsubR = useSim.subscribe(
    (s) => [s.routeFrom, s.routeTo, s.closed, s.domesticOnly, s.ready] as const,
    route,
    { equalityFn: (a, b) => a.every((v, i) => v === b[i]), fireImmediately: true },
  )
  return () => {
    unsubA()
    unsubR()
  }
}
