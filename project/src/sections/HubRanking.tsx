import { useMemo } from 'react'
import { fmt, goToSimulator, pct, scrollToSection } from '../sim/actions.ts'
import { useSim } from '../sim/store.ts'

const TOP = 20

export function HubRanking() {
  const net = useSim((s) => s.net)
  const closed = useSim((s) => s.closed)

  const stats = useMemo(() => {
    if (!net) return null
    const top = net.ranked.slice(0, TOP)
    const topSet = new Set(top)
    let touched = 0
    for (const [a, b] of net.routes) if (topSet.has(a) || topSet.has(b)) touched++
    const gateway = [...top.slice(0, 10)].sort((a, b) => net.airports[a].deg - net.airports[b].deg)[0]
    const mega = [...top.slice(0, 10)].sort((a, b) => net.airports[b].deg - net.airports[a].deg)[0]
    return { top, touchedFrac: touched / net.routes.length, gateway, mega }
  }, [net])

  if (!net || !stats) return null
  const maxBc = net.airports[stats.top[0]].bc
  const g = net.airports[stats.gateway]
  const m = net.airports[stats.mega]

  return (
    <section id="hubs" className="section-story">
      <div className="inner">
        <p className="eyebrow">허브 순위</p>
        <h2>가장 중요한 공항은 가장 붐비는 공항이 아니다</h2>
        <p className="lede">
          <strong>매개 중심성</strong>은 "모든 공항 쌍의 최소 환승 경로 중 이 공항을 지나는 비율"이다. 직항이 많은
          공항이 아니라, 지나가지 않을 수 없는 길목에 있는 공항이 높다. 상위 {TOP}개 공항은 전체의{' '}
          {pct(TOP / net.meta.airports)}에 불과하지만 전체 노선의 <strong>{pct(stats.touchedFrac, 0)}</strong>가 이
          공항들에 닿아 있다.
        </p>
        <div className="hub-layout">
          <ol className="hub-table" aria-label="매개 중심성 상위 공항">
            {stats.top.map((i) => {
              const a = net.airports[i]
              return (
                <li key={i} className={closed.has(i) ? 'is-closed' : ''}>
                  <button type="button" onClick={() => goToSimulator(i)} title="지구본에서 보기">
                    <span className="rank">{a.rank}</span>
                    <span className="iata">{a.iata}</span>
                    <span className="city">
                      {a.city}
                      <small>{net.countries[a.country]?.ko}</small>
                    </span>
                    <span className="bar" aria-hidden="true">
                      <i style={{ width: `${(a.bc / maxBc) * 100}%` }} />
                    </span>
                    <span className="num">
                      {a.bc.toFixed(3)}
                      <small>직항 {fmt.format(a.deg)}</small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
          <aside className="hub-notes">
            <div className="note">
              <h4>
                관문형 허브 — {g.iata} {g.city}
              </h4>
              <p>
                직항이 {fmt.format(g.deg)}개뿐인데 {g.rank}위다. 이 공항을 거치지 않으면 본토로 나갈 수 없는 소규모 공항이 많기
                때문이다. 연결 수와 중심성이 다르다는 걸 가장 잘 보여 주는 예다.
              </p>
            </div>
            <div className="note">
              <h4>
                메가 허브 — {m.iata} {m.city}
              </h4>
              <p>
                직항 {fmt.format(m.deg)}개, {m.rank}위. 대륙을 잇는 장거리 노선의 길목이라 대륙 간 이동의 상당수가 이곳을
                지난다. 이런 공항이 닫히면 경로가 길어질 뿐 아니라 다른 허브의 부담이 급증한다.
              </p>
            </div>
            <div className="note">
              <h4>직접 확인하기</h4>
              <p>순위를 클릭하면 지구본이 그 공항으로 이동한다. 상위 공항을 하나씩 꺼 보며 고립되는 지역을 확인해 보자.</p>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => {
                  useSim.getState().closeMany(stats.top.slice(0, 10))
                  useSim.getState().select(null)
                  scrollToSection('simulator')
                }}
              >
                상위 10개 한꺼번에 폐쇄
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
