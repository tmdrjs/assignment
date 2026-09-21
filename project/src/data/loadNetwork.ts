import type { Airport, Network, NetworkFile } from '../types.ts'
import { buildCsr } from '../graph/csr.ts'

/** 컬럼형 JSON → 행 객체 + 인덱스 복원 */
export function decodeNetwork(file: NetworkFile): Network {
  const c = file.airports
  const n = c.iata.length
  const airports: Airport[] = new Array(n)
  const byIata = new Map<string, number>()
  const byCountry = new Map<string, number[]>()
  const byContinent = new Map<string, number[]>()
  for (let i = 0; i < n; i++) {
    airports[i] = {
      i,
      iata: c.iata[i],
      name: c.name[i],
      city: c.city[i],
      country: c.country[i],
      continent: c.continent[i],
      lat: c.lat[i],
      lon: c.lon[i],
      type: c.type[i],
      deg: c.deg[i],
      bc: c.bc[i],
      rank: c.rank[i],
    }
    byIata.set(c.iata[i], i)
    let list = byCountry.get(c.country[i])
    if (!list) byCountry.set(c.country[i], (list = []))
    list.push(i)
    let cl = byContinent.get(c.continent[i])
    if (!cl) byContinent.set(c.continent[i], (cl = []))
    cl.push(i)
  }
  const ranked = airports.map((a) => a.i).sort((x, y) => airports[x].rank - airports[y].rank)
  return {
    meta: file.meta,
    airports,
    routes: file.routes,
    countries: file.countries,
    collapse: file.collapse,
    byIata,
    byCountry,
    byContinent,
    ranked,
    csr: buildCsr(n, file.routes),
  }
}

export async function loadNetwork(): Promise<Network> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/network.json`)
  if (!res.ok) throw new Error(`network.json ${res.status}`)
  return decodeNetwork((await res.json()) as NetworkFile)
}

export const CONTINENT_KO: Record<string, string> = {
  AF: '아프리카',
  AN: '남극',
  AS: '아시아',
  EU: '유럽',
  NA: '북아메리카',
  OC: '오세아니아',
  SA: '남아메리카',
}

export const TYPE_KO: Record<string, string> = {
  L: '대형 공항',
  M: '중형 공항',
  S: '소형 공항',
  P: '수상 비행장',
  H: '헬리포트',
  U: '규모 미상',
}
