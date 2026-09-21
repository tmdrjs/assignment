import type { Airport, Network } from '../types.ts'

/** 한글 도시명 → 데이터의 영문 도시명 (검색 편의) */
const KO_ALIAS: Record<string, string> = {
  서울: 'Seoul',
  인천: 'Seoul',
  김포: 'Seoul',
  부산: 'Busan',
  제주: 'Jeju',
  도쿄: 'Tokyo',
  동경: 'Tokyo',
  나리타: 'Narita',
  오사카: 'Osaka',
  베이징: 'Beijing',
  북경: 'Beijing',
  상하이: 'Shanghai',
  상해: 'Shanghai',
  홍콩: 'Hong Kong',
  타이베이: 'Taipei',
  싱가포르: 'Singapore',
  방콕: 'Bangkok',
  하노이: 'Hanoi',
  호치민: 'Ho Chi Minh',
  마닐라: 'Manila',
  자카르타: 'Jakarta',
  델리: 'Delhi',
  뭄바이: 'Mumbai',
  두바이: 'Dubai',
  도하: 'Doha',
  이스탄불: 'Istanbul',
  런던: 'London',
  파리: 'Paris',
  프랑크푸르트: 'Frankfurt',
  암스테르담: 'Amsterdam',
  마드리드: 'Madrid',
  로마: 'Rome',
  모스크바: 'Moscow',
  취리히: 'Zurich',
  뉴욕: 'New York',
  로스앤젤레스: 'Los Angeles',
  la: 'Los Angeles',
  샌프란시스코: 'San Francisco',
  시카고: 'Chicago',
  애틀랜타: 'Atlanta',
  시애틀: 'Seattle',
  토론토: 'Toronto',
  밴쿠버: 'Vancouver',
  멕시코시티: 'Mexico City',
  상파울루: 'São Paulo',
  시드니: 'Sydney',
  멜버른: 'Melbourne',
  오클랜드: 'Auckland',
  앵커리지: 'Anchorage',
  요하네스버그: 'Johannesburg',
  카이로: 'Cairo',
  나이로비: 'Nairobi',
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

interface Indexed {
  a: Airport
  iata: string
  city: string
  name: string
  country: string
}

let cache: { net: Network; rows: Indexed[] } | null = null

function index(net: Network): Indexed[] {
  if (cache?.net === net) return cache.rows
  const rows = net.airports.map((a) => ({
    a,
    iata: a.iata.toLowerCase(),
    city: norm(a.city),
    name: norm(a.name),
    country: norm(`${net.countries[a.country]?.name ?? ''} ${net.countries[a.country]?.ko ?? ''}`),
  }))
  cache = { net, rows }
  return rows
}

/** IATA / 도시 / 공항명 / 국가로 검색. 점수 높은 순 */
export function searchAirports(net: Network, query: string, limit = 8): Airport[] {
  const raw = query.trim()
  if (!raw) return []
  const q = norm(KO_ALIAS[raw.toLowerCase()] ?? raw)
  const scored: { a: Airport; s: number }[] = []
  for (const r of index(net)) {
    let s = 0
    if (r.iata === q) s = 1000
    else if (q.length <= 3 && r.iata.startsWith(q)) s = 500
    else if (r.city.startsWith(q)) s = 300
    else if (r.name.startsWith(q)) s = 250
    else if (r.city.includes(q)) s = 150
    else if (r.name.includes(q)) s = 120
    else if (q.length >= 2 && r.country.includes(q)) s = 60
    if (s > 0) scored.push({ a: r.a, s: s + Math.log1p(r.a.deg) })
  }
  scored.sort((x, y) => y.s - x.s)
  return scored.slice(0, limit).map((x) => x.a)
}
