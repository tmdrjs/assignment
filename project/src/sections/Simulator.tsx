/** 직접 해보기 (F2~F5, E3, E6) — 지구본 위에 얹히는 사이드 패널 */
import { useMemo, useState } from 'react'
import { AirportSearch } from '../components/AirportSearch.tsx'
import { StatTile } from '../components/StatTile.tsx'
import { CONTINENT_KO, TYPE_KO } from '../data/loadNetwork.ts'
import { copyShareLink, fmt, pct, scrollToSection } from '../sim/actions.ts'
import { useSim } from '../sim/store.ts'
import type { PathResult } from '../types.ts'

export function Simulator() {
  return (
    <section id="simulator" className="simulator" aria-label="직접 해보기">
      <aside className="panel">
        <PanelHeader />
        <SelectBlock />
        <ClosedBlock />
        <ImpactBlock />
        <RouteBlock />
        <div className="panel-foot">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => scrollToSection('insights')}>
            다음: 인사이트 ↓
          </button>
        </div>
      </aside>
    </section>
  )
}

function PanelHeader() {
  const lightMode = useSim((s) => s.lightMode)
  const setLightMode = useSim((s) => s.setLightMode)
  const restoreAll = useSim((s) => s.restoreAll)
  const scenarioLabel = useSim((s) => s.scenarioLabel)
  return (
    <header className="panel-head">
      <div>
        <p className="eyebrow">직접 해보기</p>
        <h2>공항을 끄고, 결과를 보자</h2>
        {scenarioLabel && <p className="scenario-tag">시나리오: {scenarioLabel}</p>}
      </div>
      <div className="panel-tools">
        <label className="switch" title="표시 노선을 줄이고 애니메이션을 끕니다">
          <input type="checkbox" checked={lightMode} onChange={(e) => setLightMode(e.target.checked)} />
          <span>가벼운 모드</span>
        </label>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void copyShareLink()}>
          링크 복사
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={restoreAll}>
          초기화
        </button>
      </div>
    </header>
  )
}

function SelectBlock() {
  const net = useSim((s) => s.net)
  const selected = useSim((s) => s.selected)
  const closed = useSim((s) => s.closed)
  const select = useSim((s) => s.select)
  const toggleClosed = useSim((s) => s.toggleClosed)
  const flyTo = useSim((s) => s.flyTo)
  const setRouteFrom = useSim((s) => s.setRouteFrom)
  const setRouteTo = useSim((s) => s.setRouteTo)
  const analysis = useSim((s) => s.analysis)

  if (!net) return null
  const a = selected !== null ? net.airports[selected] : null
  const isClosed = a ? closed.has(a.i) : false
  const isolated = a && analysis ? analysis.isolated.includes(a.i) : false
  const detached = a && analysis ? analysis.detached.includes(a.i) : false

  return (
    <div className="block">
      <h3>1. 공항 찾기</h3>
      <AirportSearch
        placeholder="IATA 코드, 도시, 공항명 검색 (예: ICN, 런던)"
        value={null}
        onPick={(i) => {
          select(i)
          flyTo(net.airports[i].lat, net.airports[i].lon, 1.4)
        }}
      />
      {a ? (
        <div className={`airport-card ${isClosed ? 'is-closed' : ''}`}>
          <div className="airport-head">
            <span className="iata">{a.iata}</span>
            <div>
              <strong>{a.name}</strong>
              <small>
                {a.city}, {net.countries[a.country]?.ko} · {CONTINENT_KO[a.continent] ?? a.continent} ·{' '}
                {TYPE_KO[a.type]}
              </small>
            </div>
          </div>
          <dl className="airport-meta">
            <div>
              <dt>직항 노선</dt>
              <dd>{fmt.format(a.deg)}</dd>
            </div>
            <div>
              <dt>매개 중심성</dt>
              <dd>
                {a.rank}위 <small>{a.bc.toFixed(4)}</small>
              </dd>
            </div>
            <div>
              <dt>상태</dt>
              <dd className={isClosed ? 'danger' : isolated ? 'warn' : detached ? 'caution' : ''}>
                {isClosed ? '폐쇄됨' : isolated ? '고립됨' : detached ? '주 네트워크와 분리' : '운영 중'}
              </dd>
            </div>
          </dl>
          <div className="row">
            <button
              type="button"
              className={`btn ${isClosed ? 'btn-ok' : 'btn-danger'}`}
              onClick={() => toggleClosed(a.i)}
            >
              {isClosed ? '이 공항 복구' : '이 공항 폐쇄'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRouteFrom(a.i)}>
              출발지로
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRouteTo(a.i)}>
              도착지로
            </button>
          </div>
        </div>
      ) : (
        <p className="muted small">지구본의 점을 클릭하거나 검색해서 공항을 고르세요. 국가를 클릭하면 나라 전체를 폐쇄할 수 있어요.</p>
      )}
    </div>
  )
}

function ClosedBlock() {
  const net = useSim((s) => s.net)
  const closed = useSim((s) => s.closed)
  const domesticOnly = useSim((s) => s.domesticOnly)
  const setDomesticOnly = useSim((s) => s.setDomesticOnly)
  const restoreMany = useSim((s) => s.restoreMany)
  const closeMany = useSim((s) => s.closeMany)
  const pendingCountry = useSim((s) => s.pendingCountry)
  const askCountry = useSim((s) => s.askCountry)
  const select = useSim((s) => s.select)
  const [region, setRegion] = useState('')
  const [countryQ, setCountryQ] = useState('')

  const countryOptions = useMemo(() => {
    if (!net) return []
    const q = countryQ.trim().toLowerCase()
    if (!q) return []
    return [...net.byCountry.keys()]
      .map((iso) => ({ iso, ...net.countries[iso], n: net.byCountry.get(iso)!.length }))
      .filter((c) => c.ko.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q)
      .sort((a, b) => b.n - a.n)
      .slice(0, 6)
  }, [net, countryQ])

  if (!net) return null
  const list = [...closed].sort((a, b) => net.airports[b].deg - net.airports[a].deg)
  const shown = list.slice(0, 40)
  const pending = pendingCountry ? { iso: pendingCountry, ...net.countries[pendingCountry], ids: net.byCountry.get(pendingCountry) ?? [] } : null

  return (
    <div className="block">
      <h3>
        2. 폐쇄 목록 <span className="count">{closed.size}</span>
      </h3>
      {pending && (
        <div className="confirm">
          <p>
            <strong>{pending.ko}</strong>의 공항 {pending.ids.length}개를 모두 폐쇄할까요?
          </p>
          <div className="row">
            <button type="button" className="btn btn-danger btn-sm" onClick={() => closeMany(pending.ids)}>
              폐쇄
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => askCountry(null)}>
              취소
            </button>
          </div>
        </div>
      )}
      {closed.size === 0 && !domesticOnly ? (
        <p className="muted small">아직 폐쇄한 공항이 없어요.</p>
      ) : (
        <div className="chips">
          {shown.map((i) => (
            <button
              key={i}
              type="button"
              className="chip"
              title={`${net.airports[i].name} 복구`}
              onClick={() => restoreMany([i])}
              onMouseEnter={() => select(i)}
            >
              {net.airports[i].iata} <span aria-hidden="true">×</span>
            </button>
          ))}
          {list.length > shown.length && <span className="chip muted">+{list.length - shown.length}</span>}
        </div>
      )}
      <label className="switch block-switch">
        <input type="checkbox" checked={domesticOnly} onChange={(e) => setDomesticOnly(e.target.checked)} />
        <span>
          국제선 차단 <small>국경 폐쇄 — 국내선만 남김</small>
        </span>
      </label>
      <div className="region-tools">
        <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="대륙 선택">
          <option value="">대륙 단위 폐쇄…</option>
          {[...net.byContinent.keys()].sort().map((c) => (
            <option key={c} value={c}>
              {CONTINENT_KO[c] ?? c} ({net.byContinent.get(c)!.length})
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          disabled={!region}
          onClick={() => {
            closeMany(net.byContinent.get(region) ?? [])
            setRegion('')
          }}
        >
          폐쇄
        </button>
      </div>
      <div className="region-tools search">
        <input
          type="search"
          value={countryQ}
          placeholder="국가 검색 후 폐쇄 (예: 일본, Japan)"
          onChange={(e) => setCountryQ(e.target.value)}
          aria-label="국가 검색"
        />
        {countryOptions.length > 0 && (
          <ul className="search-list">
            {countryOptions.map((c) => (
              <li
                key={c.iso}
                role="option"
                aria-selected={false}
                onMouseDown={(e) => {
                  e.preventDefault()
                  askCountry(c.iso)
                  setCountryQ('')
                }}
              >
                <span className="iata">{c.iso}</span>
                <span className="city">
                  {c.ko}
                  <small>{c.name}</small>
                </span>
                <span className="meta">공항 {c.n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ImpactBlock() {
  const net = useSim((s) => s.net)
  const analysis = useSim((s) => s.analysis)
  const analyzing = useSim((s) => s.analyzing)
  const closed = useSim((s) => s.closed)
  const domesticOnly = useSim((s) => s.domesticOnly)
  const select = useSim((s) => s.select)
  const flyTo = useSim((s) => s.flyTo)
  if (!net) return null
  const a = analysis
  const idle = closed.size === 0 && !domesticOnly
  return (
    <div className={`block ${analyzing ? 'is-busy' : ''}`}>
      <h3>
        3. 영향 분석 {a && <span className="elapsed">{a.elapsedMs.toFixed(0)}ms</span>}
      </h3>
      {!a ? (
        <p className="muted small">계산 중…</p>
      ) : idle ? (
        <p className="muted small">
          현재 네트워크는 하나로 이어져 있어요. 공항 {fmt.format(a.openCount)}개, 평균 환승{' '}
          {a.avgTransfersBefore.toFixed(2)}회.
        </p>
      ) : (
        <>
          <div className="stats">
            <StatTile label="고립된 공항" value={fmt.format(a.isolated.length)} sub="남은 노선이 0개" tone={a.isolated.length ? 'warn' : 'neutral'} />
            <StatTile
              label="주 네트워크와 분리"
              value={fmt.format(a.detached.length)}
              sub="노선은 있지만 끊긴 섬"
              tone={a.detached.length ? 'warn' : 'neutral'}
            />
            <StatTile label="연결 요소" value={<>1 → {fmt.format(a.components)}</>} sub="서로 못 가는 덩어리 수" />
            <StatTile
              label="도달 불가 공항 쌍"
              value={pct(a.unreachableFrac)}
              sub="열린 공항끼리도 못 감"
              tone={a.unreachableFrac > 0.05 ? 'danger' : 'neutral'}
            />
            <StatTile
              label="평균 환승"
              value={
                <>
                  {a.avgTransfersBefore.toFixed(2)} → {a.avgTransfersAfter.toFixed(2)}
                </>
              }
              sub="갈 수 있는 쌍 기준"
            />
            <StatTile label="끊긴 노선" value={fmt.format(a.cutRoutes)} sub={`전체 ${fmt.format(net.meta.routes)}개 중`} tone="danger" />
          </div>
          {a.loadShift.length > 0 && (
            <div className="load">
              <h4>부담이 늘어난 공항 (경유 경로 비율)</h4>
              <ul>
                {a.loadShift.slice(0, 8).map((s) => {
                  const ap = net.airports[s.i]
                  const inc = s.before > 0 ? (s.after - s.before) / s.before : Infinity
                  return (
                    <li key={s.i}>
                      <button
                        type="button"
                        onClick={() => {
                          select(s.i)
                          flyTo(ap.lat, ap.lon, 1.4)
                        }}
                      >
                        <span className="iata">{ap.iata}</span>
                        <span className="city">{ap.city}</span>
                        <span className="num">
                          {pct(s.before, 2)} → <b>{pct(s.after, 2)}</b>
                          <small>{Number.isFinite(inc) ? `+${(inc * 100).toFixed(0)}%` : '신규'}</small>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PathLine({ label, path, tone }: { label: string; path: PathResult | null; tone: 'before' | 'after' }) {
  const net = useSim((s) => s.net)
  if (!net) return null
  return (
    <div className={`path path-${tone}`}>
      <div className="path-head">
        <span className="path-label">{label}</span>
        {path ? (
          <span className="path-meta">
            환승 {path.transfers}회 · {fmt.format(path.km)} km
          </span>
        ) : (
          <span className="path-meta danger">연결 불가</span>
        )}
      </div>
      {path && (
        <div className="path-nodes">
          {path.nodes.map((i, idx) => (
            <span key={`${i}-${idx}`}>
              <b>{net.airports[i].iata}</b>
              {idx < path.nodes.length - 1 && <i aria-hidden="true">→</i>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function RouteBlock() {
  const net = useSim((s) => s.net)
  const routeFrom = useSim((s) => s.routeFrom)
  const routeTo = useSim((s) => s.routeTo)
  const setRouteFrom = useSim((s) => s.setRouteFrom)
  const setRouteTo = useSim((s) => s.setRouteTo)
  const swapRoute = useSim((s) => s.swapRoute)
  const route = useSim((s) => s.route)
  const routing = useSim((s) => s.routing)
  if (!net) return null
  const presets: [string, string][] = [
    ['ICN', 'JFK'],
    ['LHR', 'SYD'],
    ['GRU', 'NRT'],
  ]
  const same =
    route?.before.fewest &&
    route.after.fewest &&
    route.before.fewest.nodes.length === route.after.fewest.nodes.length &&
    route.before.fewest.nodes.every((v, i) => v === route.after.fewest!.nodes[i])
  const shortestDiffers =
    route?.after.shortest &&
    route.after.fewest &&
    route.after.shortest.nodes.join() !== route.after.fewest.nodes.join() &&
    route.after.shortest.km < route.after.fewest.km * 0.97

  return (
    <div className={`block ${routing ? 'is-busy' : ''}`}>
      <h3>4. 경로 비교</h3>
      <div className="route-inputs">
        <AirportSearch placeholder="출발지" value={routeFrom} onPick={setRouteFrom} onClear={() => setRouteFrom(null)} compact />
        <button type="button" className="btn btn-ghost btn-icon" onClick={swapRoute} title="출발·도착 바꾸기" aria-label="출발·도착 바꾸기">
          ⇅
        </button>
        <AirportSearch placeholder="도착지" value={routeTo} onPick={setRouteTo} onClear={() => setRouteTo(null)} compact />
      </div>
      <div className="presets">
        {presets.map(([f, t]) => (
          <button
            key={f + t}
            type="button"
            className="chip"
            onClick={() => {
              const fi = net.byIata.get(f)
              const ti = net.byIata.get(t)
              if (fi !== undefined && ti !== undefined) {
                setRouteFrom(fi)
                setRouteTo(ti)
              }
            }}
          >
            {f} → {t}
          </button>
        ))}
      </div>
      {route ? (
        <div className="paths">
          <PathLine label="폐쇄 전 · 최소 환승" path={route.before.fewest} tone="before" />
          {same ? (
            <p className="muted small">폐쇄 후에도 같은 경로로 갈 수 있어요.</p>
          ) : (
            <PathLine label="폐쇄 후 · 최소 환승" path={route.after.fewest} tone="after" />
          )}
          {route.after.fewest && route.before.fewest && !same && (
            <p className="delta">
              환승 {route.before.fewest.transfers} → {route.after.fewest.transfers}회, 거리{' '}
              {fmt.format(route.before.fewest.km)} → {fmt.format(route.after.fewest.km)} km (
              {route.after.fewest.km >= route.before.fewest.km ? '+' : ''}
              {fmt.format(route.after.fewest.km - route.before.fewest.km)} km)
            </p>
          )}
          {shortestDiffers && route.after.shortest && (
            <p className="muted small">
              거리만 따지면 {route.after.shortest.nodes.map((i) => net.airports[i].iata).join(' → ')} (
              {fmt.format(route.after.shortest.km)} km, 환승 {route.after.shortest.transfers}회)가 더 짧아요.
            </p>
          )}
        </div>
      ) : (
        <p className="muted small">출발지와 도착지를 고르면 폐쇄 전후의 최소 환승 경로를 비교합니다.</p>
      )}
    </div>
  )
}
