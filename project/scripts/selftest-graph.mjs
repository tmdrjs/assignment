/**
 * 그래프 엔진 자체 검증 — 브루트포스와 비교
 *   1. 작은 무작위 그래프: 연결 요소 / 최소 환승 / 최단 거리 / 매개 중심성(모든 최단 경로 열거)
 *   2. 실제 네트워크: 워커 엔진의 전체 출발지 Brandes == 파이프라인이 저장한 bc
 * 실행: npm run test:graph  (Node 24 의 내장 TypeScript 스트리핑 사용)
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { GraphEngine } from '../src/graph/engine.ts'

const ROOT = path.resolve(import.meta.dirname, '..')

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- 1. 작은 그래프 브루트포스 ----------
function randomGraph(n, m, seed) {
  const rand = rng(seed)
  const set = new Set()
  const routes = []
  while (routes.length < m) {
    const a = Math.floor(rand() * n)
    const b = Math.floor(rand() * n)
    if (a === b) continue
    const key = a < b ? `${a}|${b}` : `${b}|${a}`
    if (set.has(key)) continue
    set.add(key)
    routes.push([a, b, 100 + Math.floor(rand() * 5000), 1])
  }
  return routes
}

function bruteComponents(n, routes, open) {
  const parent = [...Array(n).keys()]
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])))
  for (const [a, b] of routes) if (open[a] && open[b]) parent[find(a)] = find(b)
  const sizes = new Map()
  for (let v = 0; v < n; v++) if (open[v]) sizes.set(find(v), (sizes.get(find(v)) ?? 0) + 1)
  return [...sizes.values()].sort((x, y) => y - x)
}

function bruteShortest(n, routes, open, from, to, lexicographic) {
  // 단순 O(n^2) 다익스트라
  const adj = Array.from({ length: n }, () => [])
  for (const [a, b, km] of routes) {
    adj[a].push([b, km])
    adj[b].push([a, km])
  }
  const cost = new Array(n).fill(Infinity)
  const done = new Array(n).fill(false)
  cost[from] = 0
  for (;;) {
    let v = -1
    for (let i = 0; i < n; i++) if (!done[i] && open[i] && cost[i] < Infinity && (v === -1 || cost[i] < cost[v])) v = i
    if (v === -1) break
    done[v] = true
    for (const [u, km] of adj[v]) {
      if (!open[u]) continue
      const w = lexicographic ? 1e6 + km : km
      if (cost[v] + w < cost[u]) cost[u] = cost[v] + w
    }
  }
  return cost[to]
}

function bruteBetweenness(n, routes) {
  const adj = Array.from({ length: n }, () => [])
  for (const [a, b] of routes) adj[a].push(b), adj[b].push(a)
  const bc = new Array(n).fill(0)
  const bfs = (s) => {
    const d = new Array(n).fill(-1)
    d[s] = 0
    const q = [s]
    for (let h = 0; h < q.length; h++) for (const u of adj[q[h]]) if (d[u] === -1) (d[u] = d[q[h]] + 1), q.push(u)
    return d
  }
  for (let s = 0; s < n; s++) {
    const d = bfs(s)
    for (let t = s + 1; t < n; t++) {
      if (d[t] === -1) continue
      // 길이 d[t] 인 모든 최단 경로 열거
      const through = new Array(n).fill(0)
      let total = 0
      const walk = (v, visited) => {
        if (v === t) {
          total++
          for (const x of visited) through[x]++
          return
        }
        for (const u of adj[v]) if (d[u] === d[v] + 1) walk(u, u === t ? visited : [...visited, u])
      }
      walk(s, [])
      for (let v = 0; v < n; v++) if (v !== s && v !== t && through[v]) bc[v] += through[v] / total
    }
  }
  return bc
}

{
  const n = 40
  const routes = randomGraph(n, 90, 7)
  const country = Array.from({ length: n }, (_, i) => (i % 3 === 0 ? 'A' : 'B'))
  const eng = new GraphEngine(n, routes, country, n, 1) // 모든 노드를 출발지로 샘플
  const rand = rng(99)
  for (let trial = 0; trial < 30; trial++) {
    const closed = []
    for (let v = 0; v < n; v++) if (rand() < 0.15) closed.push(v)
    const open = new Array(n).fill(true)
    for (const c of closed) open[c] = false
    eng.setState(closed, false)
    const { sizes } = eng.components()
    assert.deepEqual([...sizes].sort((x, y) => y - x), bruteComponents(n, routes, open), 'components')
    for (let p = 0; p < 10; p++) {
      const from = Math.floor(rand() * n)
      const to = Math.floor(rand() * n)
      if (!open[from] || !open[to]) {
        assert.equal(eng.path(from, to, true), null)
        continue
      }
      for (const lex of [true, false]) {
        const expect = bruteShortest(n, routes, open, from, to, lex)
        const got = eng.path(from, to, lex)
        if (expect === Infinity) assert.equal(got, null, 'unreachable')
        else {
          const gotCost = lex ? (got.nodes.length - 1) * 1e6 + got.km : got.km
          assert.ok(Math.abs(gotCost - expect) < 1, `path cost ${gotCost} vs ${expect}`)
          // 경로가 실제 엣지로 이어지는지
          for (let i = 1; i < got.nodes.length; i++) {
            const a = got.nodes[i - 1]
            const b = got.nodes[i]
            assert.ok(routes.some(([x, y]) => (x === a && y === b) || (x === b && y === a)), 'edge exists')
          }
        }
      }
    }
  }
  // 매개 중심성 (전체 그래프)
  eng.setState([], false)
  const out = new Float64Array(n)
  eng.sampledBetweenness(out)
  const brute = bruteBetweenness(n, routes)
  for (let v = 0; v < n; v++) assert.ok(Math.abs(out[v] / 2 - brute[v]) < 1e-9, `bc[${v}] ${out[v] / 2} vs ${brute[v]}`)
  // 국제선 차단: A-B 간 엣지가 없어야 함
  eng.setState([], true)
  const comps = eng.components()
  // 국내선만 남으면 모든 연결 요소는 한 나라 안에 있어야 한다
  const compCountry = new Map()
  for (let v = 0; v < n; v++) {
    const c = comps.comp[v]
    if (compCountry.has(c)) assert.equal(compCountry.get(c), country[v], 'component spans countries')
    else compCountry.set(c, country[v])
  }
  console.log('✓ small graph: components, paths, betweenness, domestic filter')
}

// ---------- 2. 실제 네트워크 ----------
{
  const file = JSON.parse(await readFile(path.join(ROOT, 'public/data/network.json'), 'utf8'))
  const n = file.airports.iata.length
  const t0 = performance.now()
  const eng = new GraphEngine(n, file.routes, file.airports.country, n, 1)
  eng.setState([], false)
  const out = new Float64Array(n)
  eng.sampledBetweenness(out)
  const scale = 1 / ((n - 1) * (n - 2))
  let maxErr = 0
  for (let v = 0; v < n; v++) maxErr = Math.max(maxErr, Math.abs(out[v] * scale - file.airports.bc[v]))
  assert.ok(maxErr < 1e-4, `betweenness mismatch ${maxErr}`)
  console.log(`✓ real network: full Brandes matches pipeline (max err ${maxErr.toExponential(2)}, ${(performance.now() - t0).toFixed(0)} ms)`)

  const eng2 = new GraphEngine(n, file.routes, file.airports.country)
  const idx = (iata) => file.airports.iata.indexOf(iata)
  const t1 = performance.now()
  const a = eng2.analyze([], false)
  assert.equal(a.components, 1)
  assert.equal(a.isolated.length, 0)
  const t2 = performance.now()
  const hubs = file.airports.rank.map((r, i) => [r, i]).sort((x, y) => x[0] - y[0]).slice(0, 10).map((x) => x[1])
  const b = eng2.analyze(hubs, false)
  const t3 = performance.now()
  console.log(
    `✓ analyze: baseline ${(t2 - t1).toFixed(0)} ms, top-10 hubs closed ${(t3 - t2).toFixed(0)} ms → components ${b.components}, isolated ${b.isolated.length}, detached ${b.detached.length}, unreachable ${(b.unreachableFrac * 100).toFixed(1)}%, cut ${b.cutRoutes}`,
  )
  console.log(
    '  load shift top 5:',
    b.loadShift.slice(0, 5).map((s) => `${file.airports.iata[s.i]} ${(s.before * 100).toFixed(2)}%→${(s.after * 100).toFixed(2)}%`).join(', '),
  )
  const r = eng2.routeCompare(idx('ICN'), idx('JFK'), [idx('JFK')], false)
  assert.ok(r.before.fewest && r.before.fewest.transfers === 0, 'ICN-JFK direct exists')
  assert.equal(r.after.fewest, null, 'JFK closed → unreachable')
  const r2 = eng2.routeCompare(idx('ICN'), idx('JFK'), [idx('NRT'), idx('LAX')], false)
  console.log(
    `✓ route ICN→JFK: before ${r2.before.fewest.nodes.map((i) => file.airports.iata[i]).join('→')} (${r2.before.fewest.km} km), ` +
      `NRT+LAX closed: ${r2.after.fewest.nodes.map((i) => file.airports.iata[i]).join('→')} (${r2.after.fewest.km} km)`,
  )
  const c = eng2.analyze([], true)
  console.log(`✓ domestic-only: components ${c.components}, isolated ${c.isolated.length}, unreachable ${(c.unreachableFrac * 100).toFixed(1)}%, cut ${c.cutRoutes} (${c.elapsedMs.toFixed(0)} ms)`)
}
console.log('all graph self-tests passed')
