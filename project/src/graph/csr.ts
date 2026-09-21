import type { Csr, Route } from '../types.ts'

/** 무방향 엣지 목록 → CSR 인접 구조 (워커·메인 스레드 공용) */
export function buildCsr(n: number, routes: Route[]): Csr {
  const m = routes.length
  const off = new Int32Array(n + 1)
  for (const [a, b] of routes) {
    off[a + 1]++
    off[b + 1]++
  }
  for (let i = 0; i < n; i++) off[i + 1] += off[i]
  const nbr = new Int32Array(2 * m)
  const km = new Float32Array(2 * m)
  const edge = new Int32Array(2 * m)
  const fill = off.slice(0, n)
  for (let e = 0; e < m; e++) {
    const [a, b, d] = routes[e]
    nbr[fill[a]] = b
    km[fill[a]] = d
    edge[fill[a]++] = e
    nbr[fill[b]] = a
    km[fill[b]] = d
    edge[fill[b]++] = e
  }
  return { n, m, off, nbr, km, edge }
}
