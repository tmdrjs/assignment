/**
 * SkyCut 데이터 파이프라인 (PRD §7, §8 사전 계산)
 *
 *   OurAirports airports.csv   → 공항 위치·규모·국가·대륙
 *   OpenFlights routes.dat     → 직항 노선 (2014년 6월 마지막 갱신)
 *   OpenFlights airports.dat   → OurAirports 에 없는 IATA 코드 보완
 *   mledoze/countries          → 국가 영문·한글명, ISO 숫자코드 ↔ alpha-2
 *   world-atlas 110m           → 지구본 국가 폴리곤 (TopoJSON)
 *
 * 처리 순서
 *   1. 직항(stops=0) 노선만 남기고 항공사 중복을 제거해 공항 쌍 단위 무방향 엣지로 통합
 *      (취항 항공사 수를 보조 가중치로 저장)
 *   2. 노선이 있는 공항만 남기고, 최대 연결 요소(giant component)만 유지
 *   3. 대권거리(haversine) 계산 → 엣지 가중치
 *   4. 매개 중심성(Brandes, 비가중) 정확 계산
 *   5. 붕괴 곡선: 무작위 제거(20회 평균) / 매개 중심성 순 / 연결 수 순(재계산) 제거 시 최대 연결 요소 비율
 *   6. public/data/network.json, public/data/countries-110m.json 출력
 *
 * 실행: npm run build:data   (원본은 .cache/ 에 캐시, 없으면 다운로드)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, '.cache')
const OUT = path.join(ROOT, 'public', 'data')

const SOURCES = {
  'ourairports.csv': 'https://davidmegginson.github.io/ourairports-data/airports.csv',
  'openflights-airports.dat':
    'https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat',
  'openflights-routes.dat':
    'https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat',
  'countries.json': 'https://raw.githubusercontent.com/mledoze/countries/master/countries.json',
  'countries-110m.json': 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json',
}

const t0 = Date.now()
const log = (msg) => process.stdout.write(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${msg}\n`)

async function source(name) {
  const file = path.join(CACHE, name)
  if (!existsSync(file)) {
    log(`downloading ${name} …`)
    const res = await fetch(SOURCES[name])
    if (!res.ok) throw new Error(`${name}: ${res.status} ${res.statusText}`)
    await mkdir(CACHE, { recursive: true })
    await writeFile(file, Buffer.from(await res.arrayBuffer()))
  }
  return readFile(file, 'utf8')
}

/** RFC-4180 CSV 파서 (따옴표 안의 쉼표·줄바꿈·"" 이스케이프 처리) */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** "Paris (Roissy-en-France, Val-d'Oise)" → "Paris" */
const cleanCity = (s) => (s ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim()

const toRad = (d) => (d * Math.PI) / 180
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** 재현 가능한 난수 (mulberry32) */
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

// ---------------------------------------------------------------------------
// 1. 국가 메타 (mledoze)
// ---------------------------------------------------------------------------
const countriesRaw = JSON.parse(await source('countries.json'))
const countryByIso2 = new Map()
const iso2ByName = new Map()
const iso2ByNumeric = new Map()
for (const c of countriesRaw) {
  countryByIso2.set(c.cca2, {
    name: c.name.common,
    ko: c.translations?.kor?.common ?? c.name.common,
  })
  if (c.ccn3) iso2ByNumeric.set(c.ccn3, c.cca2)
  for (const n of [c.name.common, c.name.official, ...(c.altSpellings ?? [])]) {
    if (n) iso2ByName.set(n.toLowerCase(), c.cca2)
  }
}
// OpenFlights 국가명 → ISO alpha-2 보정
const COUNTRY_ALIAS = {
  burma: 'MM',
  'congo (kinshasa)': 'CD',
  'congo (brazzaville)': 'CG',
  "cote d'ivoire": 'CI',
  macau: 'MO',
  'hong kong': 'HK',
  'east timor': 'TL',
  'saint vincent and the grenadines': 'VC',
  'saint kitts and nevis': 'KN',
  'antigua and barbuda': 'AG',
  'trinidad and tobago': 'TT',
  'sao tome and principe': 'ST',
  'north korea': 'KP',
  'south korea': 'KR',
  laos: 'LA',
  brunei: 'BN',
  'cape verde': 'CV',
  'virgin islands': 'VI',
  'british virgin islands': 'VG',
  'midway islands': 'UM',
  'johnston atoll': 'UM',
  'wake island': 'UM',
  'western sahara': 'EH',
  'netherlands antilles': 'CW',
  'falkland islands': 'FK',
  'svalbard': 'SJ',
  'swaziland': 'SZ',
  'czech republic': 'CZ',
  'micronesia': 'FM',
  'reunion': 'RE',
  'cocos (keeling) islands': 'CC',
  'saint helena': 'SH',
  'saint pierre and miquelon': 'PM',
  'turks and caicos islands': 'TC',
  'wallis and futuna': 'WF',
  'french guiana': 'GF',
  'guadeloupe': 'GP',
  'martinique': 'MQ',
  'northern mariana islands': 'MP',
  'american samoa': 'AS',
  'faroe islands': 'FO',
  'isle of man': 'IM',
  'russia': 'RU',
  'iran': 'IR',
  'syria': 'SY',
  'vietnam': 'VN',
  'tanzania': 'TZ',
  'bolivia': 'BO',
  'venezuela': 'VE',
  'moldova': 'MD',
  'macedonia': 'MK',
  turkey: 'TR',
  'west bank': 'PS',
}
function countryNameToIso2(name) {
  const k = name.trim().toLowerCase()
  return COUNTRY_ALIAS[k] ?? iso2ByName.get(k) ?? null
}

// ---------------------------------------------------------------------------
// 2. OurAirports 공항
// ---------------------------------------------------------------------------
const TYPE_RANK = {
  large_airport: 0,
  medium_airport: 1,
  small_airport: 2,
  seaplane_base: 3,
  heliport: 4,
  balloonport: 5,
}
const oa = parseCsv(await source('ourairports.csv'))
const oaHeader = oa[0]
const col = Object.fromEntries(oaHeader.map((h, i) => [h, i]))
const oaByIata = new Map()
const oaByIcao = new Map()
const continentByCountry = new Map() // iso2 → {continent: count}
for (let r = 1; r < oa.length; r++) {
  const row = oa[r]
  if (row.length < oaHeader.length) continue
  const type = row[col.type]
  if (type === 'closed' || !(type in TYPE_RANK)) continue
  const lat = parseFloat(row[col.latitude_deg])
  const lon = parseFloat(row[col.longitude_deg])
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  const rec = {
    iata: row[col.iata_code] || null,
    icao: row[col.icao_code] || row[col.gps_code] || row[col.ident] || null,
    name: row[col.name],
    city: cleanCity(row[col.municipality]) || row[col.name],
    country: row[col.iso_country],
    continent: row[col.continent],
    lat,
    lon,
    type,
    scheduled: row[col.scheduled_service] === 'yes',
  }
  const cc = continentByCountry.get(rec.country) ?? {}
  cc[rec.continent] = (cc[rec.continent] ?? 0) + 1
  continentByCountry.set(rec.country, cc)

  const better = (a, b) =>
    !b ||
    (a.scheduled && !b.scheduled) ||
    (a.scheduled === b.scheduled && TYPE_RANK[a.type] < TYPE_RANK[b.type])
  if (rec.iata && rec.iata.length === 3 && better(rec, oaByIata.get(rec.iata))) oaByIata.set(rec.iata, rec)
  if (rec.icao && better(rec, oaByIcao.get(rec.icao))) oaByIcao.set(rec.icao, rec)
}
const continentOf = (iso2) => {
  const cc = continentByCountry.get(iso2)
  if (!cc) return null
  return Object.entries(cc).sort((a, b) => b[1] - a[1])[0][0]
}
log(`OurAirports: ${oaByIata.size} IATA / ${oaByIcao.size} ICAO`)

// ---------------------------------------------------------------------------
// 3. OpenFlights 공항 (보완용)
// ---------------------------------------------------------------------------
const ofByIata = new Map()
const ofByIcao = new Map()
let unresolvedCountry = new Set()
for (const row of parseCsv(await source('openflights-airports.dat'))) {
  if (row.length < 8) continue
  const [, name, city, country, iata, icao, latS, lonS] = row
  const lat = parseFloat(latS)
  const lon = parseFloat(lonS)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
  const iso2 = countryNameToIso2(country)
  if (!iso2) unresolvedCountry.add(country)
  const rec = {
    iata: iata && iata !== '\\N' ? iata : null,
    icao: icao && icao !== '\\N' ? icao : null,
    name,
    city: city || name,
    country: iso2 ?? 'ZZ',
    continent: iso2 ? continentOf(iso2) ?? 'ZZ' : 'ZZ',
    lat,
    lon,
    type: 'unknown',
    scheduled: true,
  }
  if (rec.iata && !ofByIata.has(rec.iata)) ofByIata.set(rec.iata, rec)
  if (rec.icao && !ofByIcao.has(rec.icao)) ofByIcao.set(rec.icao, rec)
}
if (unresolvedCountry.size) log(`OpenFlights 국가명 미해결: ${[...unresolvedCountry].join(', ')}`)

// ---------------------------------------------------------------------------
// 4. 노선 → 무방향 엣지
// ---------------------------------------------------------------------------
const resolveCache = new Map()
let fallbackUsed = 0
function resolveAirport(code) {
  if (resolveCache.has(code)) return resolveCache.get(code)
  let rec = null
  if (code.length === 3) rec = oaByIata.get(code) ?? null
  if (!rec && code.length === 4) rec = oaByIcao.get(code) ?? null
  if (!rec) {
    rec = (code.length === 3 ? ofByIata.get(code) : ofByIcao.get(code)) ?? null
    if (rec) {
      fallbackUsed++
      // OurAirports 기준으로 ICAO 를 통해 규모/대륙 보완
      const oaRec = rec.icao ? oaByIcao.get(rec.icao) : null
      if (oaRec) rec = { ...oaRec, iata: rec.iata ?? oaRec.iata }
    }
  }
  if (rec && !rec.iata) rec = { ...rec, iata: code } // IATA 없는 공항은 라우트 코드(ICAO) 사용
  resolveCache.set(code, rec)
  return rec
}

const edgeMap = new Map() // "A|B" → Set<airline>
const airportByKey = new Map() // iata → rec
let routeRows = 0
let skippedStops = 0
let skippedUnresolved = 0
let skippedSelf = 0
for (const row of parseCsv(await source('openflights-routes.dat'))) {
  if (row.length < 8) continue
  routeRows++
  const [airline, , src, , dst, , , stops] = row
  if (stops !== '0') {
    skippedStops++
    continue
  }
  const a = resolveAirport(src)
  const b = resolveAirport(dst)
  if (!a || !b) {
    skippedUnresolved++
    continue
  }
  if (a.iata === b.iata) {
    skippedSelf++
    continue
  }
  airportByKey.set(a.iata, a)
  airportByKey.set(b.iata, b)
  const key = a.iata < b.iata ? `${a.iata}|${b.iata}` : `${b.iata}|${a.iata}`
  let set = edgeMap.get(key)
  if (!set) edgeMap.set(key, (set = new Set()))
  set.add(airline)
}
log(
  `routes: ${routeRows} rows → ${edgeMap.size} undirected edges, ${airportByKey.size} airports ` +
    `(skip: stops≠0 ${skippedStops}, unresolved ${skippedUnresolved}, self ${skippedSelf}; fallback ${fallbackUsed})`,
)

// ---------------------------------------------------------------------------
// 5. 최대 연결 요소만 유지 + 인덱싱
// ---------------------------------------------------------------------------
let iatas = [...airportByKey.keys()].sort()
let idx = new Map(iatas.map((k, i) => [k, i]))
let adjSets = iatas.map(() => new Set())
for (const key of edgeMap.keys()) {
  const [a, b] = key.split('|')
  adjSets[idx.get(a)].add(idx.get(b))
  adjSets[idx.get(b)].add(idx.get(a))
}
{
  const comp = new Int32Array(iatas.length).fill(-1)
  let best = { id: -1, size: 0 }
  let nComp = 0
  for (let s = 0; s < iatas.length; s++) {
    if (comp[s] !== -1) continue
    const id = nComp++
    const stack = [s]
    comp[s] = id
    let size = 0
    while (stack.length) {
      const v = stack.pop()
      size++
      for (const u of adjSets[v]) if (comp[u] === -1) (comp[u] = id), stack.push(u)
    }
    if (size > best.size) best = { id, size }
  }
  const keep = iatas.filter((_, i) => comp[i] === best.id)
  log(`components: ${nComp}, giant = ${best.size} / ${iatas.length} → dropping ${iatas.length - best.size} airports outside`)
  iatas = keep
}
idx = new Map(iatas.map((k, i) => [k, i]))
const N = iatas.length
const airports = iatas.map((iata, i) => {
  const r = airportByKey.get(iata)
  return {
    i,
    iata,
    icao: r.icao ?? null,
    name: r.name,
    city: r.city,
    country: r.country,
    continent: r.continent ?? continentOf(r.country) ?? 'ZZ',
    lat: +r.lat.toFixed(4),
    lon: +r.lon.toFixed(4),
    type: r.type,
    deg: 0,
    bc: 0,
    rank: 0,
  }
})
const routes = []
for (const [key, airlines] of edgeMap) {
  const [a, b] = key.split('|')
  if (!idx.has(a) || !idx.has(b)) continue
  const ia = idx.get(a)
  const ib = idx.get(b)
  const A = airports[ia]
  const B = airports[ib]
  routes.push([ia, ib, Math.round(haversineKm(A.lat, A.lon, B.lat, B.lon)), airlines.size])
  A.deg++
  B.deg++
}
routes.sort((x, y) => x[0] - y[0] || x[1] - y[1])
const M = routes.length
log(`network: ${N} airports, ${M} routes`)

// CSR
const off = new Int32Array(N + 1)
for (const [a, b] of routes) off[a + 1]++, off[b + 1]++
for (let i = 0; i < N; i++) off[i + 1] += off[i]
const nbr = new Int32Array(2 * M)
{
  const fill = off.slice(0, N)
  for (const [a, b] of routes) nbr[fill[a]++] = b, (nbr[fill[b]++] = a)
}

// ---------------------------------------------------------------------------
// 6. 매개 중심성 (Brandes, 비가중, 무방향)
// ---------------------------------------------------------------------------
function betweenness() {
  const bc = new Float64Array(N)
  const dist = new Int32Array(N)
  const sigma = new Float64Array(N)
  const delta = new Float64Array(N)
  const order = new Int32Array(N)
  for (let s = 0; s < N; s++) {
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
        const w = nbr[k]
        if (dist[w] === -1) {
          dist[w] = dv + 1
          order[tail++] = w
        }
        if (dist[w] === dv + 1) sigma[w] += sigma[v]
      }
    }
    for (let p = tail - 1; p > 0; p--) {
      const w = order[p]
      const coeff = (1 + delta[w]) / sigma[w]
      const dw = dist[w]
      for (let k = off[w]; k < off[w + 1]; k++) {
        const v = nbr[k]
        if (dist[v] === dw - 1) delta[v] += sigma[v] * coeff
      }
      bc[w] += delta[w]
    }
  }
  // 무방향: 각 쌍이 두 번 세어짐 → /2, 정규화: /((N-1)(N-2)/2)
  const scale = 1 / ((N - 1) * (N - 2))
  for (let i = 0; i < N; i++) bc[i] *= scale
  return bc
}
const bc = betweenness()
log('betweenness done')
const ranked = [...Array(N).keys()].sort((a, b) => bc[b] - bc[a] || airports[b].deg - airports[a].deg)
ranked.forEach((i, r) => {
  airports[i].bc = +bc[i].toPrecision(5)
  airports[i].rank = r + 1
})
log(
  'top 10: ' +
    ranked
      .slice(0, 10)
      .map((i) => `${airports[i].iata}(${airports[i].bc.toFixed(3)}, deg ${airports[i].deg})`)
      .join(' '),
)

// ---------------------------------------------------------------------------
// 7. 붕괴 곡선 (역순 Union-Find: 제거 순서를 뒤집어 노드를 추가하며 최대 요소 추적)
// ---------------------------------------------------------------------------
function lccSeries(order) {
  const parent = new Int32Array(N)
  const size = new Int32Array(N)
  const present = new Uint8Array(N)
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const res = new Int32Array(N + 1)
  let max = 0
  for (let k = N - 1; k >= 0; k--) {
    const v = order[k]
    present[v] = 1
    parent[v] = v
    size[v] = 1
    if (max < 1) max = 1
    for (let j = off[v]; j < off[v + 1]; j++) {
      const u = nbr[j]
      if (!present[u]) continue
      let a = find(v)
      let b = find(u)
      if (a === b) continue
      if (size[a] < size[b]) [a, b] = [b, a]
      parent[b] = a
      size[a] += size[b]
      if (size[a] > max) max = size[a]
    }
    res[k] = max
  }
  res[N] = 0
  return res
}
const STEP = 0.0025 // 0.25% 단위 401 포인트
const samplePoints = (series) => {
  const out = []
  for (let f = 0; f <= 1 + 1e-9; f += STEP) out.push(+(series[Math.min(N, Math.round(f * N))] / N).toFixed(4))
  return out
}
// (a) 무작위 제거 20회 평균
const RUNS = 20
const randomAvg = new Float64Array(N + 1)
for (let run = 0; run < RUNS; run++) {
  const rand = rng(1000 + run)
  const order = [...Array(N).keys()]
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  const s = lccSeries(order)
  for (let k = 0; k <= N; k++) randomAvg[k] += s[k] / RUNS
}
// (b) 매개 중심성 내림차순 (초기값 기준)
const bcSeries = lccSeries(ranked)
// (c) 연결 수 내림차순, 제거할 때마다 재계산
const degSeries = (() => {
  const deg = Int32Array.from(airports, (a) => a.deg)
  const removed = new Uint8Array(N)
  const order = []
  for (let step = 0; step < N; step++) {
    let best = -1
    for (let v = 0; v < N; v++) if (!removed[v] && (best === -1 || deg[v] > deg[best])) best = v
    removed[best] = 1
    order.push(best)
    for (let j = off[best]; j < off[best + 1]; j++) deg[nbr[j]]--
  }
  return lccSeries(order)
})()
const collapse = {
  step: STEP,
  random: samplePoints(randomAvg),
  betweenness: samplePoints(bcSeries),
  degree: samplePoints(degSeries),
}
const at = (arr, f) => arr[Math.round(f / STEP)]
log(
  `collapse @5% removed: random ${at(collapse.random, 0.05)}, betweenness ${at(collapse.betweenness, 0.05)}, degree ${at(collapse.degree, 0.05)}`,
)
log(
  `collapse @20% removed: random ${at(collapse.random, 0.2)}, betweenness ${at(collapse.betweenness, 0.2)}, degree ${at(collapse.degree, 0.2)}`,
)

// ---------------------------------------------------------------------------
// 8. 국가 메타 + 지구본 폴리곤 (ISO 숫자코드 → alpha-2 주입)
// ---------------------------------------------------------------------------
const countries = {}
for (const a of airports) {
  if (countries[a.country]) continue
  const meta = countryByIso2.get(a.country)
  countries[a.country] = {
    name: meta?.name ?? a.country,
    ko: meta?.ko ?? meta?.name ?? a.country,
    continent: continentOf(a.country) ?? a.continent,
  }
}
const topo = JSON.parse(await source('countries-110m.json'))
let polyMatched = 0
for (const g of topo.objects.countries.geometries) {
  const iso2 = iso2ByNumeric.get(String(g.id).padStart(3, '0')) ?? null
  g.properties = { name: g.properties?.name ?? '', iso2 }
  if (iso2) polyMatched++
}
log(`polygons: ${polyMatched} / ${topo.objects.countries.geometries.length} matched to ISO alpha-2`)

// ---------------------------------------------------------------------------
// 9. 출력
// ---------------------------------------------------------------------------
const TYPE_CODE = { large_airport: 'L', medium_airport: 'M', small_airport: 'S', seaplane_base: 'P', heliport: 'H', unknown: 'U' }
const typeCount = {}
for (const a of airports) typeCount[a.type] = (typeCount[a.type] ?? 0) + 1
const network = {
  meta: {
    builtAt: new Date().toISOString().slice(0, 10),
    airports: N,
    routes: M,
    countries: Object.keys(countries).length,
    typeCount,
    dropped: { unresolvedRouteRows: skippedUnresolved, multiStopRows: skippedStops },
    sources: {
      airports: { name: 'OurAirports', url: 'https://ourairports.com/data/', license: 'Public domain' },
      routes: {
        name: 'OpenFlights routes.dat',
        url: 'https://openflights.org/data',
        license: 'ODbL',
        asOf: '2014-06',
      },
      countries: { name: 'mledoze/countries', url: 'https://github.com/mledoze/countries', license: 'ODbL' },
      polygons: { name: 'world-atlas (Natural Earth 110m)', url: 'https://github.com/topojson/world-atlas', license: 'Public domain' },
    },
    graph: 'undirected, direct routes only, giant component',
    betweenness: 'Brandes exact, unweighted (min-transfer paths), normalized to [0,1]',
  },
  // 컬럼형(columnar) 저장: 키 반복을 없애 용량 절감 (브라우저에서 행 객체로 복원)
  airports: {
    iata: airports.map((a) => a.iata),
    name: airports.map((a) => a.name),
    city: airports.map((a) => a.city),
    country: airports.map((a) => a.country),
    continent: airports.map((a) => a.continent),
    lat: airports.map((a) => a.lat),
    lon: airports.map((a) => a.lon),
    type: airports.map((a) => TYPE_CODE[a.type] ?? 'U'),
    deg: airports.map((a) => a.deg),
    bc: airports.map((a) => a.bc),
    rank: airports.map((a) => a.rank),
  },
  routes,
  countries,
  collapse,
}
await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'network.json'), JSON.stringify(network))
await writeFile(path.join(OUT, 'countries-110m.json'), JSON.stringify(topo))
const size = (await readFile(path.join(OUT, 'network.json'))).length
log(`wrote network.json (${(size / 1024).toFixed(0)} KB), countries-110m.json`)
log(`type mix: ${JSON.stringify(typeCount)}`)
