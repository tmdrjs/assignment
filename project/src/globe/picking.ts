/**
 * 자체 피킹 — globe.gl 의 레이캐스트(포인터 상호작용)를 끄고
 * 커서 아래 지표 좌표(toGlobeCoords)에서 가장 가까운 공항 / 국가를 직접 찾는다.
 * 3,000개 점을 개별 메시로 두고 레이캐스트하는 것보다 훨씬 싸다.
 */
import { geoContains } from 'd3-geo'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { Airport } from '../types.ts'

export type CountryFeature = Feature<Polygon | MultiPolygon, { name: string; iso2: string | null }>

const RAD = Math.PI / 180

/** 두 지점 사이 각거리(도) */
export function angularDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * RAD
  const dLon = (lon2 - lon1) * RAD
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2
  return (2 * Math.asin(Math.min(1, Math.sqrt(a)))) / RAD
}

/**
 * 커서 아래 지표점(lat,lng) 주변 공항 중 화면 거리 maxPx 이내에서 가장 가까운 공항.
 * 각거리 12° 이내로 먼저 거른 뒤 화면 좌표로 정밀 비교한다.
 */
export function nearestAirport(
  airports: Airport[],
  lat: number,
  lng: number,
  px: { x: number; y: number },
  toScreen: (lat: number, lng: number) => { x: number; y: number },
  maxPx: number,
): number | null {
  let best = -1
  let bestD = maxPx * maxPx
  for (let i = 0; i < airports.length; i++) {
    const a = airports[i]
    if (Math.abs(a.lat - lat) > 12) continue
    if (angularDeg(lat, lng, a.lat, a.lon) > 12) continue
    const s = toScreen(a.lat, a.lon)
    const dx = s.x - px.x
    const dy = s.y - px.y
    const d = dx * dx + dy * dy
    if (d < bestD) {
      bestD = d
      best = i
    }
  }
  return best === -1 ? null : best
}

export function countryAt(features: CountryFeature[], lat: number, lng: number): CountryFeature | null {
  for (const f of features) {
    if (geoContains(f, [lng, lat])) return f
  }
  return null
}
