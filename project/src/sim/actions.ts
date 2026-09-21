/** 여러 섹션에서 공유하는 상위 동작 */
import { resolveScenario, scenarioById } from './scenarios.ts'
import { encodeShare } from './share.ts'
import { closedArray, useSim } from './store.ts'

export function scrollToSection(id: string): void {
  document.getElementById(id)?.scrollIntoView({ behavior: document.hidden ? 'instant' : 'smooth', block: 'start' })
}

/** 시뮬레이터로 이동하면서 공항 선택(옵션) + 카메라 이동 */
export function goToSimulator(airport?: number): void {
  const s = useSim.getState()
  if (airport !== undefined && s.net) {
    const a = s.net.airports[airport]
    s.select(airport)
    s.flyTo(a.lat, a.lon, 1.4)
  }
  scrollToSection('simulator')
}

export function applyScenario(id: string): void {
  const s = useSim.getState()
  const sc = scenarioById(id)
  if (!sc || !s.net) return
  const { closed, domesticOnly } = resolveScenario(s.net, sc)
  s.applyState(closed, domesticOnly, { id: sc.id, label: sc.title })
  s.select(null)
  s.flyTo(sc.view.lat, sc.view.lng, sc.view.altitude, 1200)
  scrollToSection('simulator')
}

export async function copyShareLink(): Promise<void> {
  const s = useSim.getState()
  if (!s.net) return
  const hash = encodeShare(s.net, {
    closed: closedArray(s.closed),
    domesticOnly: s.domesticOnly,
    from: s.routeFrom,
    to: s.routeTo,
    scenarioId: s.scenarioId,
  })
  const url = `${location.origin}${location.pathname}${location.search}${hash}`
  try {
    await navigator.clipboard.writeText(url)
    s.showToast(hash ? '현재 폐쇄 상태를 담은 링크를 복사했어요' : '폐쇄한 공항이 없어 기본 링크를 복사했어요')
  } catch {
    history.replaceState(null, '', hash || location.pathname)
    s.showToast('주소창의 링크를 복사해 공유하세요')
  }
}

export const fmt = new Intl.NumberFormat('ko-KR')
export const pct = (v: number, digits = 1): string => `${(v * 100).toFixed(digits)}%`

if (import.meta.env.DEV) {
  ;(window as unknown as { __skycutActions?: unknown }).__skycutActions = { applyScenario, goToSimulator, copyShareLink }
}
