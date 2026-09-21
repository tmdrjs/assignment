/**
 * 브라우저(Web Worker) 그래프 엔진 — PRD §8
 *
 *  - 연결 요소: BFS (고립·분리 공항 탐지)
 *  - 최소 환승 경로: 다익스트라 (비용 = 환승 × BIG + km → 환승 우선, 거리로 동률 해소)
 *  - 최단 거리 경로: 다익스트라 (km)
 *  - 부담 증가 공항: 고정된 샘플 출발지 집합에 대해 Brandes 의존도 누적 → 폐쇄 전후 비교
 *
 * 폐쇄 상태는 노드 on/off 와 "국제선 차단" 플래그로 표현하고,
 * 인접 슬롯 단위로 활성 여부를 판단한다.
 */
import type { Analysis, LoadShift, PathPair, PathResult, Route, RouteCompare } from '../types.ts'
import { buildCsr } from './csr.ts'

const BIG = 1e6

interface BaselineStat {
  bc: Float64Array
  stat: { sumHops: number; reachedPairs: number; activeSources: number }
}

/** 최소 힙 (지연 삭제, 동일 노드 중복 삽입 허용) */
class MinHeap {
  private keys: number[] = []
  private vals: number[] = []
  get size(): number {
    return this.keys.length
  }
  clear(): void {
    this.keys.length = 0
    this.vals.length = 0
  }
  push(key: number, val: number): void {
    const k = this.keys
    const v = this.vals
    k.push(key)
    v.push(val)
    let i = k.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (k[p] <= k[i]) break
      ;[k[p], k[i]] = [k[i], k[p]]
      ;[v[p], v[i]] = [v[i], v[p]]
      i = p
    }
  }
  /** [key, val] 을 out 에 기록 */
  pop(out: [number, number]): void {
    const k = this.keys
    const v = this.vals
    out[0] = k[0]
    out[1] = v[0]
    const lk = k.pop() as number
    const lv = v.pop() as number
    if (k.length === 0) return
    k[0] = lk
    v[0] = lv
    let i = 0
    const n = k.length
    for (;;) {
      const l = 2 * i + 1
      const r = l + 1
      let s = i
      if (l < n && k[l] < k[s]) s = l
      if (r < n && k[r] < k[s]) s = r
      if (s === i) break
      ;[k[s], k[i]] = [k[i], k[s]]
      ;[v[s], v[i]] = [v[i], v[s]]
      i = s
    }
  }
}

function seededShuffle(n: number, seed: number): Int32Array {
  let a = seed >>> 0
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const arr = new Int32Array(n)
  for (let i = 0; i < n; i++) arr[i] = i
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
  return arr
}

export class GraphEngine {
  readonly n: number
  readonly m: number
  readonly off: Int32Array
  readonly nbr: Int32Array
  readonly km: Float32Array
  private readonly sameCountry: Uint8Array
  private readonly open: Uint8Array
  /** 인접 슬롯별 활성 여부 (setState 에서 한 번 계산) */
  private readonly edgeOn: Uint8Array
  /** 기준선(폐쇄 없음) 샘플 매개 중심성 캐시 — 키: 폐쇄된 샘플 출발지 목록 */
  private readonly baseCache = new Map<string, BaselineStat>()
  /** 샘플 출발지 (고정 시드 → 폐쇄 전후 비교 가능) */
  private readonly sources: Int32Array

  // 스크래치 버퍼
  private readonly dist: Int32Array
  private readonly order: Int32Array
  private readonly sigma: Float64Array
  private readonly delta: Float64Array
  private readonly parentSlot: Int32Array
  private readonly cost: Float64Array
  private readonly comp: Int32Array
  private readonly heap = new MinHeap()

  constructor(n: number, routes: Route[], country: string[], sampleSize = 200, seed = 42) {
    const csr = buildCsr(n, routes)
    this.n = n
    this.m = csr.m
    this.off = csr.off
    this.nbr = csr.nbr
    this.km = csr.km
    this.sameCountry = new Uint8Array(2 * csr.m)
    for (let v = 0; v < n; v++) {
      for (let k = this.off[v]; k < this.off[v + 1]; k++) {
        this.sameCountry[k] = country[v] === country[this.nbr[k]] ? 1 : 0
      }
    }
    this.open = new Uint8Array(n).fill(1)
    this.edgeOn = new Uint8Array(2 * csr.m).fill(1)
    this.sources = seededShuffle(n, seed).slice(0, Math.min(sampleSize, n))
    this.dist = new Int32Array(n)
    this.order = new Int32Array(n)
    this.sigma = new Float64Array(n)
    this.delta = new Float64Array(n)
    this.parentSlot = new Int32Array(n)
    this.cost = new Float64Array(n)
    this.comp = new Int32Array(n)
  }

  setState(closed: ArrayLike<number>, domesticOnly: boolean): void {
    const { open, edgeOn, nbr, sameCountry } = this
    open.fill(1)
    for (let i = 0; i < closed.length; i++) open[closed[i]] = 0
    const len = edgeOn.length
    if (domesticOnly) for (let k = 0; k < len; k++) edgeOn[k] = open[nbr[k]] & sameCountry[k]
    else for (let k = 0; k < len; k++) edgeOn[k] = open[nbr[k]]
  }

  /** 인접 슬롯 k 가 현재 상태에서 활성인지 (출발 노드는 열려 있다고 가정) */
  private active(k: number): boolean {
    return this.edgeOn[k] === 1
  }

  activeEdgeCount(): number {
    let c = 0
    for (let v = 0; v < this.n; v++) {
      if (!this.open[v]) continue
      for (let k = this.off[v]; k < this.off[v + 1]; k++) if (this.active(k)) c++
    }
    return c / 2
  }

  /** 열린 노드들의 연결 요소. comp[v] = -1 이면 폐쇄 */
  components(): { comp: Int32Array; sizes: number[]; lccId: number } {
    const { comp, order, off, nbr, open, edgeOn } = this
    comp.fill(-1)
    const sizes: number[] = []
    let lccId = -1
    for (let s = 0; s < this.n; s++) {
      if (!open[s] || comp[s] !== -1) continue
      const id = sizes.length
      comp[s] = id
      let head = 0
      let tail = 0
      order[tail++] = s
      while (head < tail) {
        const v = order[head++]
        for (let k = off[v]; k < off[v + 1]; k++) {
          const u = nbr[k]
          if (comp[u] === -1 && edgeOn[k]) {
            comp[u] = id
            order[tail++] = u
          }
        }
      }
      sizes.push(tail)
      if (lccId === -1 || tail > sizes[lccId]) lccId = id
    }
    return { comp, sizes, lccId }
  }

  /**
   * 샘플 출발지 기준 Brandes 의존도 누적.
   * out[v] += 출발지 s 에서 모든 도착지로 가는 최단 경로 중 v 를 지나는 비율의 합
   */
  sampledBetweenness(out: Float64Array, skipSources?: ReadonlySet<number>): BaselineStat['stat'] {
    const { dist, order, sigma, delta, off, nbr, open, sources, edgeOn } = this
    let sumHops = 0
    let reachedPairs = 0
    let activeSources = 0
    for (let si = 0; si < sources.length; si++) {
      const s = sources[si]
      if (!open[s] || skipSources?.has(s)) continue
      activeSources++
      dist.fill(-1)
      sigma.fill(0)
      delta.fill(0)
      dist[s] = 0
      sigma[s] = 1
      let head = 0
      let tail = 0
      order[tail++] = s
      while (head < tail) {
        const v = order[head++]
        const dv = dist[v]
        for (let k = off[v]; k < off[v + 1]; k++) {
          if (!edgeOn[k]) continue
          const w = nbr[k]
          if (dist[w] === -1) {
            dist[w] = dv + 1
            order[tail++] = w
            sumHops += dv + 1
          }
          if (dist[w] === dv + 1) sigma[w] += sigma[v]
        }
      }
      reachedPairs += tail - 1
      for (let p = tail - 1; p > 0; p--) {
        const w = order[p]
        const coeff = (1 + delta[w]) / sigma[w]
        const dw = dist[w]
        for (let k = off[w]; k < off[w + 1]; k++) {
          if (!edgeOn[k]) continue
          const v = nbr[k]
          if (dist[v] === dw - 1) delta[v] += sigma[v] * coeff
        }
        out[w] += delta[w]
      }
    }
    return { sumHops, reachedPairs, activeSources }
  }

  /** 다익스트라. lexicographic=true 면 환승 수 우선, 거리로 동률 해소 */
  path(from: number, to: number, lexicographic: boolean): PathResult | null {
    if (!this.open[from] || !this.open[to]) return null
    if (from === to) return { nodes: [from], km: 0, transfers: 0 }
    const { cost, parentSlot, off, nbr, km, heap } = this
    cost.fill(Infinity)
    parentSlot.fill(-1)
    cost[from] = 0
    heap.clear()
    heap.push(0, from)
    const top: [number, number] = [0, 0]
    while (heap.size) {
      heap.pop(top)
      const c = top[0]
      const v = top[1]
      if (c > cost[v]) continue
      if (v === to) break
      for (let k = off[v]; k < off[v + 1]; k++) {
        if (!this.active(k)) continue
        const u = nbr[k]
        const nc = c + (lexicographic ? BIG + km[k] : km[k])
        if (nc < cost[u]) {
          cost[u] = nc
          parentSlot[u] = k
          heap.push(nc, u)
        }
      }
    }
    if (cost[to] === Infinity) return null
    const nodes: number[] = []
    let total = 0
    let v = to
    while (v !== from) {
      nodes.push(v)
      const k = parentSlot[v]
      total += km[k]
      // 슬롯 k 는 (parent → v) 방향. parent 는 슬롯이 속한 노드: off 이진 탐색
      v = this.ownerOfSlot(k)
    }
    nodes.push(from)
    nodes.reverse()
    return { nodes, km: Math.round(total), transfers: nodes.length - 2 }
  }

  private ownerOfSlot(k: number): number {
    const off = this.off
    let lo = 0
    let hi = this.n - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (off[mid] <= k) lo = mid
      else hi = mid - 1
    }
    return lo
  }

  /** 폐쇄 없는 전체 그래프에서, 폐쇄된 샘플 출발지만 제외한 기준선 (캐시) */
  private baseline(isClosed: Uint8Array): BaselineStat {
    const skip = new Set<number>()
    for (let i = 0; i < this.sources.length; i++) if (isClosed[this.sources[i]]) skip.add(this.sources[i])
    const key = [...skip].sort((a, b) => a - b).join(',')
    const hit = this.baseCache.get(key)
    if (hit) return hit
    this.setState([], false)
    const bc = new Float64Array(this.n)
    const stat = this.sampledBetweenness(bc, skip)
    const entry = { bc, stat }
    if (this.baseCache.size >= 8) this.baseCache.delete(this.baseCache.keys().next().value as string)
    this.baseCache.set(key, entry)
    return entry
  }

  private pathPair(from: number, to: number): PathPair {
    return { fewest: this.path(from, to, true), shortest: this.path(from, to, false) }
  }

  routeCompare(from: number, to: number, closed: number[], domesticOnly: boolean): RouteCompare {
    this.setState([], false)
    const before = this.pathPair(from, to)
    this.setState(closed, domesticOnly)
    const after = this.pathPair(from, to)
    return { from, to, before, after }
  }

  analyze(closed: number[], domesticOnly: boolean): Analysis {
    const t0 = performance.now()
    const n = this.n
    this.setState(closed, domesticOnly)
    const openCount = n - closed.length
    const cutRoutes = this.m - this.activeEdgeCount()

    const { comp, sizes, lccId } = this.components()
    const isolated: number[] = []
    const detached: number[] = []
    for (let v = 0; v < n; v++) {
      if (comp[v] === -1) continue
      if (sizes[comp[v]] === 1) isolated.push(v)
      else if (comp[v] !== lccId) detached.push(v)
    }
    let reachable = 0
    for (const s of sizes) reachable += s * (s - 1)
    const unreachableFrac = openCount > 1 ? 1 - reachable / (openCount * (openCount - 1)) : 0

    const after = new Float64Array(n)
    const aStat = this.sampledBetweenness(after)
    const isClosed = new Uint8Array(n)
    for (const c of closed) isClosed[c] = 1
    const { bc: before, stat: bStat } = this.baseline(isClosed)
    // 폐쇄된 출발지는 양쪽 모두에서 제외되므로 activeSources 는 동일
    const norm = aStat.activeSources > 0 ? 1 / (aStat.activeSources * (n - 1)) : 0
    const candidates: LoadShift[] = []
    for (let v = 0; v < n; v++) {
      if (isClosed[v]) continue
      const d = after[v] - before[v]
      if (d > 0) candidates.push({ i: v, before: before[v] * norm, after: after[v] * norm })
    }
    candidates.sort((x, y) => y.after - y.before - (x.after - x.before))
    const loadShift = candidates.slice(0, 10)

    return {
      closedCount: closed.length,
      openCount,
      cutRoutes,
      components: sizes.length,
      lcc: lccId >= 0 ? sizes[lccId] : 0,
      lccBefore: n,
      isolated,
      detached,
      unreachableFrac,
      avgTransfersBefore: bStat.reachedPairs ? bStat.sumHops / bStat.reachedPairs - 1 : 0,
      avgTransfersAfter: aStat.reachedPairs ? aStat.sumHops / aStat.reachedPairs - 1 : 0,
      loadShift,
      elapsedMs: performance.now() - t0,
    }
  }
}
