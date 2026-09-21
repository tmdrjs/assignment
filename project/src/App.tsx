import { lazy, Suspense, useEffect } from 'react'
import { Toast } from './components/Toast.tsx'
import { loadNetwork } from './data/loadNetwork.ts'
import { GraphClient } from './graph/client.ts'
import { useActiveSection } from './hooks/useActiveSection.ts'
import { Architecture } from './sections/Architecture.tsx'
import { Hero } from './sections/Hero.tsx'
import { HubRanking } from './sections/HubRanking.tsx'
import { Insights } from './sections/Insights.tsx'
import { Limits } from './sections/Limits.tsx'
import { Nav } from './sections/Nav.tsx'
import { Problem } from './sections/Problem.tsx'
import { Scenarios } from './sections/Scenarios.tsx'
import { Simulator } from './sections/Simulator.tsx'
import { Sources } from './sections/Sources.tsx'
import { startEngine } from './sim/engine.ts'
import { scenarioById } from './sim/scenarios.ts'
import { decodeShare } from './sim/share.ts'
import { useSim } from './sim/store.ts'

// three.js + globe.gl 은 별도 청크로 — 데이터 로딩과 병렬로 내려받고 스토리 섹션은 먼저 그린다
const GlobeView = lazy(() => import('./globe/GlobeView.tsx').then((m) => ({ default: m.GlobeView })))

function detectLightMode(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  return (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || coarse
}

export default function App() {
  const net = useSim((s) => s.net)
  const loadError = useSim((s) => s.loadError)
  const mode = useSim((s) => s.mode)
  useActiveSection()

  useEffect(() => {
    let cancelled = false
    let stop: (() => void) | null = null
    const client = new GraphClient()
    const s = useSim.getState()
    if (detectLightMode()) s.setLightMode(true)
    loadNetwork()
      .then(async (network) => {
        if (cancelled) return
        s.setNet(network)
        await client.init(network)
        if (cancelled) return
        s.setReady()
        stop = startEngine(client)
        // 공유 링크 복원 (E6)
        const shared = decodeShare(network, location.hash)
        if (shared) {
          const sc = shared.scenarioId ? scenarioById(shared.scenarioId) : null
          s.applyState(shared.closed, shared.domesticOnly, sc ? { id: sc.id, label: sc.title } : null)
          if (shared.from !== null) s.setRouteFrom(shared.from)
          if (shared.to !== null) s.setRouteTo(shared.to)
          window.setTimeout(() => document.getElementById('simulator')?.scrollIntoView({ block: 'start' }), 300)
        }
      })
      .catch((err: Error) => {
        if (!cancelled) s.setLoadError(err.message)
      })
    return () => {
      cancelled = true
      stop?.()
      client.dispose()
    }
  }, [])

  return (
    <>
      <div className={`globe-layer mode-${mode}`} aria-hidden="true">
        <Suspense fallback={null}>{net && <GlobeView />}</Suspense>
      </div>
      <Nav />
      <main className="page">
        <Hero />
        <Problem />
        <HubRanking />
        <Scenarios />
        <Simulator />
        <Insights />
        <Architecture />
        <Limits />
        <Sources />
      </main>
      <Toast />
      {!net && (
        <div className="loading" role="status">
          {loadError ? (
            <>
              <strong>데이터를 불러오지 못했어요</strong>
              <span>{loadError}</span>
            </>
          ) : (
            <>
              <span className="spinner" aria-hidden="true" />
              <span>항공 네트워크를 불러오는 중…</span>
            </>
          )}
        </div>
      )}
    </>
  )
}
