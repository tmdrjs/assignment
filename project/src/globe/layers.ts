/** 상태 → 지구본 레이어 데이터 (호·링·라벨·점 색). 순수 함수 + 객체 캐시로 identity 유지 */
import type { Airport, Analysis, Network, RouteCompare } from '../types.ts'

export type ArcKind = 'bg' | 'cut' | 'before' | 'after'

export interface ArcDatum {
  key: string
  kind: ArcKind
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  km: number
  airlines: number
  /** 대시 위상 분산용 0~1 */
  phase: number
}

export type RingKind = 'closed' | 'selected' | 'from' | 'to'
export interface RingDatum {
  lat: number
  lng: number
  kind: RingKind
}

export type LabelKind = 'hub' | 'selected' | 'hovered' | 'from' | 'to'
export interface LabelDatum {
  lat: number
  lng: number
  text: string
  kind: LabelKind
}

/** 점 상태: 0 정상, 1 폐쇄, 2 고립, 3 분리, 4 부담 증가 상위 */
export const STATUS_OPEN = 0
export const STATUS_CLOSED = 1
export const STATUS_ISOLATED = 2
export const STATUS_DETACHED = 3
export const STATUS_LOAD = 4

export const LIMITS = {
  full: { bg: 1500, cut: 500, rings: 150 },
  light: { bg: 400, cut: 200, rings: 60 },
}

export class ArcCache {
  private map = new Map<string, ArcDatum>()
  get(key: string, make: () => Omit<ArcDatum, 'key' | 'phase'>): ArcDatum {
    let d = this.map.get(key)
    if (!d) {
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
      d = { key, phase: (h % 1000) / 1000, ...make() }
      this.map.set(key, d)
    }
    return d
  }
}

/** 취항 항공사 수 내림차순(동률이면 거리 내림차순) 노선 인덱스 — 표시 우선순위 */
export function routeDisplayOrder(net: Network): number[] {
  const r = net.routes
  return r.map((_, i) => i).sort((a, b) => r[b][3] - r[a][3] || r[b][2] - r[a][2])
}

export function buildArcs(
  net: Network,
  cache: ArcCache,
  bgOrder: number[],
  opts: { closed: ReadonlySet<number>; domesticOnly: boolean; lightMode: boolean; route: RouteCompare | null },
): ArcDatum[] {
  const { closed, domesticOnly, lightMode, route } = opts
  const lim = lightMode ? LIMITS.light : LIMITS.full
  const A = net.airports
  const R = net.routes
  const out: ArcDatum[] = []
  const edgeArc = (e: number, kind: ArcKind) => {
    const [a, b, km, airlines] = R[e]
    return cache.get(`${kind}:${e}`, () => ({
      kind,
      startLat: A[a].lat,
      startLng: A[a].lon,
      endLat: A[b].lat,
      endLng: A[b].lon,
      km,
      airlines,
    }))
  }
  const isActive = (a: number, b: number) =>
    !closed.has(a) && !closed.has(b) && (!domesticOnly || A[a].country === A[b].country)

  let bg = 0
  let cut = 0
  for (const e of bgOrder) {
    if (bg >= lim.bg && cut >= lim.cut) break
    const [a, b] = R[e]
    if (isActive(a, b)) {
      if (bg < lim.bg) {
        out.push(edgeArc(e, 'bg'))
        bg++
      }
    } else if (cut < lim.cut) {
      out.push(edgeArc(e, 'cut'))
      cut++
    }
  }

  if (route) {
    const pathArcs = (nodes: number[], kind: ArcKind) => {
      for (let i = 1; i < nodes.length; i++) {
        const a = nodes[i - 1]
        const b = nodes[i]
        out.push(
          cache.get(`${kind}:${a}-${b}`, () => ({
            kind,
            startLat: A[a].lat,
            startLng: A[a].lon,
            endLat: A[b].lat,
            endLng: A[b].lon,
            km: 0,
            airlines: 0,
          })),
        )
      }
    }
    const before = route.before.fewest?.nodes ?? null
    const after = route.after.fewest?.nodes ?? null
    const same = before && after && before.length === after.length && before.every((v, i) => v === after[i])
    if (before && !same) pathArcs(before, 'before')
    if (after) pathArcs(after, 'after')
  }
  return out
}

export function buildRings(
  net: Network,
  opts: {
    closed: ReadonlySet<number>
    selected: number | null
    from: number | null
    to: number | null
    lightMode: boolean
  },
): RingDatum[] {
  const A = net.airports
  const cap = opts.lightMode ? LIMITS.light.rings : LIMITS.full.rings
  const out: RingDatum[] = []
  const closedSorted = [...opts.closed].sort((a, b) => A[b].deg - A[a].deg).slice(0, cap)
  for (const i of closedSorted) out.push({ lat: A[i].lat, lng: A[i].lon, kind: 'closed' })
  if (opts.from !== null) out.push({ lat: A[opts.from].lat, lng: A[opts.from].lon, kind: 'from' })
  if (opts.to !== null) out.push({ lat: A[opts.to].lat, lng: A[opts.to].lon, kind: 'to' })
  if (opts.selected !== null) out.push({ lat: A[opts.selected].lat, lng: A[opts.selected].lon, kind: 'selected' })
  return out
}

export function buildLabels(
  net: Network,
  opts: { selected: number | null; hovered: number | null; from: number | null; to: number | null; hubs: number },
): LabelDatum[] {
  const A = net.airports
  const map = new Map<number, LabelDatum>()
  for (const i of net.ranked.slice(0, opts.hubs)) map.set(i, { lat: A[i].lat, lng: A[i].lon, text: A[i].iata, kind: 'hub' })
  const put = (i: number | null, kind: LabelKind) => {
    if (i === null) return
    map.set(i, { lat: A[i].lat, lng: A[i].lon, text: `${A[i].iata} · ${A[i].city}`, kind })
  }
  put(opts.hovered, 'hovered')
  put(opts.from, 'from')
  put(opts.to, 'to')
  put(opts.selected, 'selected')
  return [...map.values()]
}

export function nodeStatus(net: Network, closed: ReadonlySet<number>, analysis: Analysis | null): Uint8Array {
  const st = new Uint8Array(net.airports.length)
  for (const i of closed) st[i] = STATUS_CLOSED
  if (analysis) {
    for (const i of analysis.isolated) if (!st[i]) st[i] = STATUS_ISOLATED
    for (const i of analysis.detached) if (!st[i]) st[i] = STATUS_DETACHED
    for (const s of analysis.loadShift) if (!st[s.i]) st[s.i] = STATUS_LOAD
  }
  return st
}

export const STATUS_LABEL: Record<number, string> = {
  [STATUS_OPEN]: '운영 중',
  [STATUS_CLOSED]: '폐쇄됨',
  [STATUS_ISOLATED]: '고립 · 남은 노선 없음',
  [STATUS_DETACHED]: '주 네트워크에서 분리됨',
  [STATUS_LOAD]: '경유 부담 증가',
}

const HUB_TOP = 20
export function pointColor(status: number, a: Airport): string {
  switch (status) {
    case STATUS_CLOSED:
      return '#ff4d4d'
    case STATUS_ISOLATED:
      return '#ff9f43'
    case STATUS_DETACHED:
      return '#ffd166'
    case STATUS_LOAD:
      return '#7dd3ff'
    default:
      if (a.rank <= HUB_TOP) return '#a9d1ff'
      if (a.type === 'L') return '#6f93d8'
      return '#41598c'
  }
}

export function pointRadius(status: number, a: Airport): number {
  const base = 0.07 + 0.11 * (Math.log1p(a.deg) / Math.log1p(250))
  if (status === STATUS_CLOSED) return base * 1.3 + 0.04
  if (status === STATUS_ISOLATED || status === STATUS_DETACHED) return base * 1.25 + 0.03
  if (status === STATUS_LOAD) return base * 1.3 + 0.03
  return base
}

export function pointAltitude(status: number, a: Airport): number {
  if (status === STATUS_CLOSED) return 0.03
  if (status === STATUS_LOAD) return 0.035
  return 0.004 + 0.02 * (Math.log1p(a.deg) / Math.log1p(250))
}
