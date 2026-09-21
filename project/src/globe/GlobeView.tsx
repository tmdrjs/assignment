/**
 * globe.gl 지구본 — 단일 WebGL 인스턴스를 고정 레이어에 두고 페이지 모드에 따라 동작을 바꾼다.
 *  - hero: 자동 회전, 휠은 페이지 스크롤, 드래그 회전 가능
 *  - story: 배경으로 흐릿하게, 상호작용 없음
 *  - sim: 확대/축소·클릭 선택·국가 클릭
 * 포인터 레이캐스트는 끄고(enablePointerInteraction=false) 자체 피킹을 쓴다.
 */
import { useEffect, useRef, useState } from 'react'
import Globe from 'globe.gl'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { MeshPhongMaterial } from 'three'
import { useSim } from '../sim/store.ts'
import type { Airport } from '../types.ts'
import {
  ArcCache,
  buildArcs,
  buildLabels,
  buildRings,
  nodeStatus,
  pointAltitude,
  pointColor,
  pointRadius,
  routeDisplayOrder,
  STATUS_LABEL,
  type ArcDatum,
  type ArcKind,
  type LabelDatum,
  type RingDatum,
} from './layers.ts'
import { countryAt, nearestAirport, type CountryFeature } from './picking.ts'

type GlobeInstance = InstanceType<typeof Globe>

const arc = <T,>(fn: (d: ArcDatum) => T) => (o: object) => fn(o as ArcDatum)
const ring = <T,>(fn: (d: RingDatum) => T) => (o: object) => fn(o as RingDatum)
const label = <T,>(fn: (d: LabelDatum) => T) => (o: object) => fn(o as LabelDatum)
const pt = <T,>(fn: (a: Airport) => T) => (o: object) => fn(o as Airport)
const poly = <T,>(fn: (f: CountryFeature) => T) => (o: object) => fn(o as CountryFeature)

const ARC_STROKE: Record<ArcKind, number | null> = { bg: null, cut: null, before: 0.45, after: 0.7 }
const ARC_DASH: Record<ArcKind, number> = { bg: 0.35, cut: 0.12, before: 0.22, after: 1 }
const RING_RGB: Record<RingDatum['kind'], string> = {
  closed: '255,77,77',
  selected: '125,211,255',
  from: '55,214,122',
  to: '180,156,255',
}
const LABEL_COLOR: Record<LabelDatum['kind'], string> = {
  hub: 'rgba(205,222,255,0.72)',
  selected: '#ffffff',
  hovered: '#e6f0ff',
  from: '#7ff0ad',
  to: '#c9b8ff',
}

interface Tooltip {
  x: number
  y: number
  title: string
  sub: string
}

export function GlobeView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const arcCache = useRef(new ArcCache())
  const bgOrder = useRef<number[]>([])
  const countriesRef = useRef<CountryFeature[]>([])
  const statusRef = useRef<Uint8Array | null>(null)
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef(0)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [globeReady, setGlobeReady] = useState(false)

  const net = useSim((s) => s.net)
  const mode = useSim((s) => s.mode)
  const lightMode = useSim((s) => s.lightMode)
  const closed = useSim((s) => s.closed)
  const domesticOnly = useSim((s) => s.domesticOnly)
  const analysis = useSim((s) => s.analysis)
  const route = useSim((s) => s.route)
  const selected = useSim((s) => s.selected)
  const hovered = useSim((s) => s.hovered)
  const hoveredCountry = useSim((s) => s.hoveredCountry)
  const routeFrom = useSim((s) => s.routeFrom)
  const routeTo = useSim((s) => s.routeTo)
  const fly = useSim((s) => s.fly)

  // ---------- 초기화 ----------
  useEffect(() => {
    const el = containerRef.current
    if (!net || !el) return
    const globe = new Globe(el, {
      animateIn: false,
      rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' },
    })
    globe
      .width(el.clientWidth)
      .height(el.clientHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#4d7cff')
      .atmosphereAltitude(0.16)
      .enablePointerInteraction(false)
      .pointsMerge(true)
      .pointResolution(6)
      .pointsTransitionDuration(0)
      .pointLat(pt((a) => a.lat))
      .pointLng(pt((a) => a.lon))
      .arcsTransitionDuration(0)
      .arcStartLat(arc((d) => d.startLat))
      .arcStartLng(arc((d) => d.startLng))
      .arcEndLat(arc((d) => d.endLat))
      .arcEndLng(arc((d) => d.endLng))
      .arcAltitudeAutoScale(0.35)
      .arcStroke(arc((d) => ARC_STROKE[d.kind]))
      .arcDashLength(arc((d) => ARC_DASH[d.kind]))
      .arcDashInitialGap(arc((d) => d.phase))
      .polygonsTransitionDuration(0)
      .polygonAltitude(0.005)
      .polygonSideColor(() => 'rgba(0,0,0,0)')
      .polygonStrokeColor(() => 'rgba(130,170,240,0.35)')
      .ringLat(ring((d) => d.lat))
      .ringLng(ring((d) => d.lng))
      .ringAltitude(0.006)
      .ringColor(ring((d) => (t: number) => `rgba(${RING_RGB[d.kind]},${(1 - t).toFixed(2)})`))
      .ringMaxRadius(ring((d) => (d.kind === 'closed' ? 2.2 : 3.2)))
      .ringPropagationSpeed(ring((d) => (d.kind === 'closed' ? 1.6 : 2.6)))
      .ringRepeatPeriod(ring((d) => (d.kind === 'closed' ? 1500 : 900)))
      .labelLat(label((d) => d.lat))
      .labelLng(label((d) => d.lng))
      .labelText(label((d) => d.text))
      .labelSize(label((d) => (d.kind === 'hub' ? 0.5 : 0.75)))
      .labelColor(label((d) => LABEL_COLOR[d.kind]))
      .labelDotRadius(label((d) => (d.kind === 'hub' ? 0 : 0.25)))
      .labelAltitude(0.015)
      .labelResolution(2)
      .labelsTransitionDuration(0)

    const mat = globe.globeMaterial() as MeshPhongMaterial
    mat.color.set('#0c1531')
    mat.emissive.set('#050a1a')
    mat.shininess = 4

    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.35
    controls.enableZoom = false
    controls.minDistance = 125
    controls.maxDistance = 480
    controls.zoomSpeed = 0.8
    globe.pointOfView({ lat: 22, lng: 65, altitude: 2.4 }, 0)

    bgOrder.current = routeDisplayOrder(net)
    globe.pointsData(net.airports)

    fetch(`${import.meta.env.BASE_URL}data/countries-110m.json`)
      .then((r) => r.json())
      .then((topo: Topology<{ countries: GeometryCollection<{ name: string; iso2: string | null }> }>) => {
        const fc = feature(topo, topo.objects.countries)
        countriesRef.current = fc.features as CountryFeature[]
        globe.polygonsData(countriesRef.current)
      })
      .catch(() => {
        /* 폴리곤은 장식 요소 — 실패해도 시뮬레이터는 동작 */
      })

    const ro = new ResizeObserver(() => {
      globe.width(el.clientWidth).height(el.clientHeight)
    })
    ro.observe(el)
    const onVis = () => (document.hidden ? globe.pauseAnimation() : globe.resumeAnimation())
    document.addEventListener('visibilitychange', onVis)

    // 성능 탐지: 2.5초 평균 fps 가 낮으면 가벼운 모드로
    let frames = 0
    let probeStart = 0
    let probeRaf = 0
    const probe = (t: number) => {
      if (!probeStart) probeStart = t
      frames++
      if (t - probeStart < 2500) probeRaf = requestAnimationFrame(probe)
      else {
        const elapsed = t - probeStart
        // 탭이 가려져 rAF 가 멈췄던 구간이 섞이면(4초 초과) 측정 무효
        if (document.hidden || elapsed > 4000) return
        const fps = frames / (elapsed / 1000)
        const s = useSim.getState()
        if (fps < 26 && !s.lightMode) {
          s.setLightMode(true)
          s.showToast(`화면이 버벅여(${fps.toFixed(0)}fps) 가벼운 모드로 전환했어요`)
        }
      }
    }
    const probeTimer = window.setTimeout(() => (probeRaf = requestAnimationFrame(probe)), 1500)

    globeRef.current = globe
    setGlobeReady(true)
    if (import.meta.env.DEV) {
      // 개발 편의: 콘솔에서 지구본·스토어 접근
      ;(window as unknown as { __skycut?: unknown }).__skycut = { globe, useSim }
    }
    return () => {
      window.clearTimeout(probeTimer)
      cancelAnimationFrame(probeRaf)
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      globe._destructor()
      globeRef.current = null
      setGlobeReady(false)
    }
  }, [net])

  // ---------- 점 (상태 색) ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !net || !globeReady) return
    const st = nodeStatus(net, closed, analysis)
    statusRef.current = st
    globe
      .pointColor(pt((a) => pointColor(st[a.i], a)))
      .pointRadius(pt((a) => pointRadius(st[a.i], a)))
      .pointAltitude(pt((a) => pointAltitude(st[a.i], a)))
      .pointsData([...net.airports])
  }, [net, globeReady, closed, analysis])

  // ---------- 호 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !net || !globeReady) return
    const arcs = buildArcs(net, arcCache.current, bgOrder.current, { closed, domesticOnly, lightMode, route })
    globe
      .arcColor(
        arc((d) => {
          switch (d.kind) {
            case 'bg':
              return lightMode ? 'rgba(96,150,255,0.22)' : ['rgba(88,150,255,0.34)', 'rgba(150,110,255,0.34)']
            case 'cut':
              return 'rgba(255,77,77,0.6)'
            case 'before':
              return 'rgba(190,160,255,0.95)'
            case 'after':
              return '#37d67a'
          }
        }),
      )
      .arcDashGap(arc((d) => (d.kind === 'bg' ? (lightMode ? 0 : 0.5) : d.kind === 'after' ? 0 : 0.12)))
      .arcDashAnimateTime(
        arc((d) => (d.kind === 'bg' ? (lightMode ? 0 : 2600 + d.km / 4) : d.kind === 'before' ? 1800 : 0)),
      )
      .arcsData(arcs)
  }, [net, globeReady, closed, domesticOnly, lightMode, route])

  // ---------- 링 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !net || !globeReady) return
    globe.ringsData(buildRings(net, { closed, selected, from: routeFrom, to: routeTo, lightMode }))
  }, [net, globeReady, closed, selected, routeFrom, routeTo, lightMode])

  // ---------- 라벨 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !net || !globeReady) return
    globe.labelsData(buildLabels(net, { selected, hovered, from: routeFrom, to: routeTo, hubs: lightMode ? 15 : 30 }))
  }, [net, globeReady, selected, hovered, routeFrom, routeTo, lightMode])

  // ---------- 국가 폴리곤 색 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !net || !globeReady) return
    const closedByCountry = new Map<string, number>()
    for (const i of closed) {
      const c = net.airports[i].country
      closedByCountry.set(c, (closedByCountry.get(c) ?? 0) + 1)
    }
    const fullyClosed = new Set<string>()
    for (const [c, n] of closedByCountry) if (n >= (net.byCountry.get(c)?.length ?? Infinity)) fullyClosed.add(c)
    globe.polygonCapColor(
      poly((f) => {
        const iso = f.properties.iso2
        if (iso && iso === hoveredCountry) return 'rgba(120,170,255,0.5)'
        if (iso && fullyClosed.has(iso)) return 'rgba(255,77,77,0.32)'
        return 'rgba(48,78,140,0.34)'
      }),
    )
  }, [net, globeReady, closed, hoveredCountry])

  // ---------- 모드 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !globeReady) return
    const controls = globe.controls()
    controls.autoRotate = mode !== 'sim'
    controls.autoRotateSpeed = mode === 'hero' ? 0.35 : 0.15
    controls.enableZoom = mode === 'sim'
    globe.renderer().domElement.style.touchAction = mode === 'sim' ? 'none' : 'pan-y'
    if (mode === 'hero') {
      const pov = globe.pointOfView()
      if (pov.altitude < 2.1) globe.pointOfView({ altitude: 2.4 }, 800)
    }
    if (mode === 'sim') {
      const pov = globe.pointOfView()
      if (pov.altitude > 2.2) globe.pointOfView({ altitude: 2.0 }, 800)
    }
  }, [mode, globeReady])

  // ---------- 카메라 이동 요청 ----------
  useEffect(() => {
    const globe = globeRef.current
    if (!globe || !fly || !globeReady) return
    globe.pointOfView({ lat: fly.lat, lng: fly.lng, altitude: fly.altitude ?? 1.3 }, fly.ms ?? 900)
  }, [fly, globeReady])

  // ---------- 피킹 ----------
  const pick = (x: number, y: number): { airport: number | null; country: CountryFeature | null } => {
    const globe = globeRef.current
    const el = containerRef.current
    if (!globe || !el || !net) return { airport: null, country: null }
    const rect = el.getBoundingClientRect()
    const lx = x - rect.left
    const ly = y - rect.top
    const geo = globe.toGlobeCoords(lx, ly)
    if (!geo) return { airport: null, country: null }
    const maxPx = window.matchMedia('(pointer: coarse)').matches ? 20 : 12
    const airport = nearestAirport(
      net.airports,
      geo.lat,
      geo.lng,
      { x: lx, y: ly },
      (lat, lng) => globe.getScreenCoords(lat, lng, 0.01),
      maxPx,
    )
    if (airport !== null) return { airport, country: null }
    return { airport: null, country: countryAt(countriesRef.current, geo.lat, geo.lng) }
  }

  const runHover = () => {
    rafRef.current = 0
    const p = pointerRef.current
    const el = containerRef.current
    if (!p || !el || !net) return
    const { airport, country } = pick(p.x, p.y)
    const s = useSim.getState()
    const rect = el.getBoundingClientRect()
    if (airport !== null) {
      const a = net.airports[airport]
      const status = statusRef.current?.[airport] ?? 0
      const c = net.countries[a.country]
      s.hover(airport, null)
      setTooltip({
        x: p.x - rect.left,
        y: p.y - rect.top,
        title: `${a.iata} · ${a.name}`,
        sub: `${a.city}, ${c?.ko ?? a.country} · ${status ? STATUS_LABEL[status] : `직항 ${a.deg}개 · 중심성 ${a.rank}위`}`,
      })
      el.style.cursor = 'pointer'
    } else if (country && s.mode === 'sim' && country.properties.iso2) {
      const iso = country.properties.iso2
      const n = net.byCountry.get(iso)?.length ?? 0
      s.hover(null, iso)
      setTooltip({
        x: p.x - rect.left,
        y: p.y - rect.top,
        title: net.countries[iso]?.ko ?? country.properties.name,
        sub: n ? `공항 ${n}개 · 클릭하면 국가 전체 폐쇄` : '노선 데이터에 공항 없음',
      })
      el.style.cursor = n ? 'pointer' : 'grab'
    } else {
      s.hover(null, null)
      setTooltip(null)
      el.style.cursor = 'grab'
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    pointerRef.current = { x: e.clientX, y: e.clientY }
    if (downRef.current) return // 드래그 중에는 피킹 안 함
    if (!rafRef.current) rafRef.current = requestAnimationFrame(runHover)
  }
  const onPointerDown = (e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = downRef.current
    downRef.current = null
    if (!d || !net) return
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y)
    if (moved > 6 || performance.now() - d.t > 700) return
    const s = useSim.getState()
    const { airport, country } = pick(e.clientX, e.clientY)
    if (airport !== null) {
      s.select(airport)
      if (s.mode !== 'sim') {
        document.getElementById('simulator')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      return
    }
    if (s.mode !== 'sim') return
    if (country?.properties.iso2 && net.byCountry.has(country.properties.iso2)) {
      s.askCountry(country.properties.iso2)
      return
    }
    s.select(null)
  }
  const onPointerLeave = () => {
    downRef.current = null
    pointerRef.current = null
    useSim.getState().hover(null, null)
    setTooltip(null)
  }

  return (
    <div
      ref={containerRef}
      className="globe-root"
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {tooltip && (
        <div className="globe-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
          <strong>{tooltip.title}</strong>
          <span>{tooltip.sub}</span>
        </div>
      )}
    </div>
  )
}
