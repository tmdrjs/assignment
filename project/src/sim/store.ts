import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Analysis, Network, RouteCompare } from '../types.ts'

/** 페이지 스크롤 위치에 따른 지구본 동작 모드 */
export type Mode = 'hero' | 'story' | 'sim'

export interface FlyTarget {
  lat: number
  lng: number
  altitude?: number
  ms?: number
  seq: number
}

export interface SimState {
  net: Network | null
  loadError: string | null
  /** 워커 준비 완료 */
  ready: boolean
  closed: ReadonlySet<number>
  /** 국제선 차단 (국경 폐쇄 시나리오) */
  domesticOnly: boolean
  selected: number | null
  hovered: number | null
  hoveredCountry: string | null
  /** 국가 단위 폐쇄 확인 대기 (ISO alpha-2) */
  pendingCountry: string | null
  routeFrom: number | null
  routeTo: number | null
  analysis: Analysis | null
  analyzing: boolean
  route: RouteCompare | null
  routing: boolean
  lightMode: boolean
  mode: Mode
  scenarioId: string | null
  scenarioLabel: string | null
  fly: FlyTarget | null
  toast: { id: number; text: string } | null
}

export interface SimActions {
  setNet(net: Network): void
  setLoadError(message: string): void
  setReady(): void
  toggleClosed(i: number): void
  closeMany(ids: number[]): void
  restoreMany(ids: number[]): void
  restoreAll(): void
  setDomesticOnly(on: boolean): void
  select(i: number | null): void
  hover(i: number | null, country?: string | null): void
  askCountry(iso2: string | null): void
  setRouteFrom(i: number | null): void
  setRouteTo(i: number | null): void
  swapRoute(): void
  setAnalysis(a: Analysis | null, analyzing?: boolean): void
  setRoute(r: RouteCompare | null, routing?: boolean): void
  setLightMode(on: boolean): void
  setMode(m: Mode): void
  flyTo(lat: number, lng: number, altitude?: number, ms?: number): void
  showToast(text: string): void
  /** 시나리오·공유 링크에서 폐쇄 상태를 통째로 적용 */
  applyState(closed: number[], domesticOnly: boolean, scenario?: { id: string; label: string } | null): void
}

let flySeq = 0
let toastSeq = 0

export const useSim = create<SimState & SimActions>()(
  subscribeWithSelector((set, get) => ({
    net: null,
    loadError: null,
    ready: false,
    closed: new Set<number>(),
    domesticOnly: false,
    selected: null,
    hovered: null,
    hoveredCountry: null,
    pendingCountry: null,
    routeFrom: null,
    routeTo: null,
    analysis: null,
    analyzing: false,
    route: null,
    routing: false,
    lightMode: false,
    mode: 'hero',
    scenarioId: null,
    scenarioLabel: null,
    fly: null,
    toast: null,

    setNet: (net) => set({ net }),
    setLoadError: (loadError) => set({ loadError }),
    setReady: () => set({ ready: true }),

    toggleClosed: (i) => {
      const closed = new Set(get().closed)
      if (closed.has(i)) closed.delete(i)
      else closed.add(i)
      set({ closed, scenarioId: null, scenarioLabel: null })
    },
    closeMany: (ids) => {
      const closed = new Set(get().closed)
      for (const i of ids) closed.add(i)
      set({ closed, scenarioId: null, scenarioLabel: null, pendingCountry: null })
    },
    restoreMany: (ids) => {
      const closed = new Set(get().closed)
      for (const i of ids) closed.delete(i)
      set({ closed, scenarioId: null, scenarioLabel: null })
    },
    restoreAll: () =>
      set({
        closed: new Set(),
        domesticOnly: false,
        scenarioId: null,
        scenarioLabel: null,
        pendingCountry: null,
      }),
    setDomesticOnly: (domesticOnly) => set({ domesticOnly, scenarioId: null, scenarioLabel: null }),
    select: (selected) => set({ selected, pendingCountry: null }),
    hover: (hovered, country = null) => {
      const s = get()
      if (s.hovered !== hovered || s.hoveredCountry !== country) set({ hovered, hoveredCountry: country })
    },
    askCountry: (pendingCountry) => set({ pendingCountry }),
    setRouteFrom: (routeFrom) => set({ routeFrom }),
    setRouteTo: (routeTo) => set({ routeTo }),
    swapRoute: () => set({ routeFrom: get().routeTo, routeTo: get().routeFrom }),
    setAnalysis: (analysis, analyzing = false) => set({ analysis, analyzing }),
    setRoute: (route, routing = false) => set({ route, routing }),
    setLightMode: (lightMode) => set({ lightMode }),
    setMode: (mode) => {
      if (get().mode !== mode) set({ mode })
    },
    flyTo: (lat, lng, altitude, ms) => set({ fly: { lat, lng, altitude, ms, seq: ++flySeq } }),
    showToast: (text) => set({ toast: { id: ++toastSeq, text } }),
    applyState: (ids, domesticOnly, scenario = null) =>
      set({
        closed: new Set(ids),
        domesticOnly,
        scenarioId: scenario?.id ?? null,
        scenarioLabel: scenario?.label ?? null,
        pendingCountry: null,
      }),
  })),
)

/** 폐쇄 집합을 정렬된 배열로 (워커 전송·URL 인코딩용) */
export const closedArray = (closed: ReadonlySet<number>): number[] => [...closed].sort((a, b) => a - b)
