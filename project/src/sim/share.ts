import type { Network } from '../types.ts'

/** URL 해시에 담는 공유 상태 (E6): #c=ICN,JFK&i=1&r=ICN-LAX&s=volcano-2010 */
export interface ShareState {
  closed: number[]
  domesticOnly: boolean
  from: number | null
  to: number | null
  scenarioId: string | null
}

export function encodeShare(net: Network, s: ShareState): string {
  const p = new URLSearchParams()
  if (s.closed.length) p.set('c', s.closed.map((i) => net.airports[i].iata).join(','))
  if (s.domesticOnly) p.set('i', '1')
  if (s.from !== null && s.to !== null) p.set('r', `${net.airports[s.from].iata}-${net.airports[s.to].iata}`)
  if (s.scenarioId) p.set('s', s.scenarioId)
  const q = p.toString()
  return q ? `#${q}` : ''
}

export function decodeShare(net: Network, hash: string): ShareState | null {
  const raw = hash.replace(/^#/, '')
  if (!raw) return null
  const p = new URLSearchParams(raw)
  const closed: number[] = []
  for (const code of (p.get('c') ?? '').split(',')) {
    const i = net.byIata.get(code.trim().toUpperCase())
    if (i !== undefined) closed.push(i)
  }
  const domesticOnly = p.get('i') === '1'
  let from: number | null = null
  let to: number | null = null
  const r = p.get('r')
  if (r) {
    const [a, b] = r.split('-')
    from = net.byIata.get(a?.toUpperCase() ?? '') ?? null
    to = net.byIata.get(b?.toUpperCase() ?? '') ?? null
  }
  const scenarioId = p.get('s')
  if (!closed.length && !domesticOnly && from === null && to === null) return null
  return { closed, domesticOnly, from, to, scenarioId }
}
