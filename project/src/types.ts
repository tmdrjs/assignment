/** 대륙 코드 (OurAirports 기준) */
export type Continent = 'AF' | 'AN' | 'AS' | 'EU' | 'NA' | 'OC' | 'SA'
/** 공항 규모: L 대형, M 중형, S 소형, P 수상, H 헬리포트, U 미상 */
export type AirportType = 'L' | 'M' | 'S' | 'P' | 'H' | 'U'

export interface Airport {
  i: number
  iata: string
  name: string
  city: string
  country: string
  continent: string
  lat: number
  lon: number
  type: AirportType
  /** 직항 노선 수 */
  deg: number
  /** 매개 중심성 (0~1, 비가중 최소 환승 경로 기준) */
  bc: number
  /** 매개 중심성 순위 (1부터) */
  rank: number
}

/** [출발 인덱스, 도착 인덱스, 거리 km, 취항 항공사 수] */
export type Route = [number, number, number, number]

export interface CountryMeta {
  name: string
  ko: string
  continent: string
}

export interface Collapse {
  /** x 축 간격 (제거 비율) */
  step: number
  random: number[]
  betweenness: number[]
  degree: number[]
}

export interface SourceMeta {
  name: string
  url: string
  license: string
  asOf?: string
}

export interface NetworkMeta {
  builtAt: string
  airports: number
  routes: number
  countries: number
  typeCount: Record<string, number>
  dropped: { unresolvedRouteRows: number; multiStopRows: number }
  sources: Record<'airports' | 'routes' | 'countries' | 'polygons', SourceMeta>
  graph: string
  betweenness: string
}

/** public/data/network.json 의 원본(컬럼형) 형태 */
export interface NetworkFile {
  meta: NetworkMeta
  airports: {
    iata: string[]
    name: string[]
    city: string[]
    country: string[]
    continent: string[]
    lat: number[]
    lon: number[]
    type: AirportType[]
    deg: number[]
    bc: number[]
    rank: number[]
  }
  routes: Route[]
  countries: Record<string, CountryMeta>
  collapse: Collapse
}

/** 압축 희소 행(CSR) 인접 구조 */
export interface Csr {
  n: number
  m: number
  off: Int32Array
  nbr: Int32Array
  km: Float32Array
  /** 인접 슬롯 → routes 인덱스 */
  edge: Int32Array
}

/** 브라우저에서 사용하는 복원된 네트워크 */
export interface Network {
  meta: NetworkMeta
  airports: Airport[]
  routes: Route[]
  countries: Record<string, CountryMeta>
  collapse: Collapse
  byIata: Map<string, number>
  byCountry: Map<string, number[]>
  byContinent: Map<string, number[]>
  /** 매개 중심성 순위대로 정렬된 공항 인덱스 */
  ranked: number[]
  csr: Csr
}

export interface LoadShift {
  i: number
  /** 폐쇄 전 경유 부담 (샘플 출발지 × 전체 도착지 쌍 중 이 공항을 지나는 비율) */
  before: number
  after: number
}

export interface Analysis {
  closedCount: number
  openCount: number
  /** 끊긴 노선 수 (폐쇄 공항 연결 + 국제선 차단) */
  cutRoutes: number
  /** 열린 공항 기준 연결 요소 수 */
  components: number
  /** 최대 연결 요소 크기 */
  lcc: number
  lccBefore: number
  /** 열려 있지만 남은 노선이 하나도 없는 공항 */
  isolated: number[]
  /** 노선은 있으나 주 네트워크에서 분리된 공항 */
  detached: number[]
  /** 열린 공항 쌍 중 서로 도달할 수 없는 비율 */
  unreachableFrac: number
  avgTransfersBefore: number
  avgTransfersAfter: number
  /** 경유 부담이 가장 크게 늘어난 공항 */
  loadShift: LoadShift[]
  elapsedMs: number
}

export interface PathResult {
  nodes: number[]
  km: number
  transfers: number
}

export interface PathPair {
  /** 환승 최소, 같으면 거리 최소 */
  fewest: PathResult | null
  /** 총 거리 최소 */
  shortest: PathResult | null
}

export interface RouteCompare {
  from: number
  to: number
  before: PathPair
  after: PathPair
}

export type WorkerRequest =
  | { type: 'init'; id: number; n: number; routes: Route[]; country: string[] }
  | { type: 'analyze'; id: number; closed: number[]; domesticOnly: boolean }
  | { type: 'route'; id: number; from: number; to: number; closed: number[]; domesticOnly: boolean }

export type WorkerResponse =
  | { type: 'ready'; id: number }
  | { type: 'analysis'; id: number; result: Analysis }
  | { type: 'route'; id: number; result: RouteCompare }
  | { type: 'error'; id: number; message: string }
