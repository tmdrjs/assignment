import { fmt, scrollToSection } from '../sim/actions.ts'
import { useSim } from '../sim/store.ts'

export function Hero() {
  const net = useSim((s) => s.net)
  return (
    <section id="hero" className="hero" aria-label="소개">
      <div className="hero-content">
        <p className="eyebrow">세계 항공 네트워크 폐쇄 시뮬레이터</p>
        <h1>
          세계 하늘길은
          <br />몇 개의 공항에 기대고 있을까?
        </h1>
        <p className="lede">
          공항 {net ? fmt.format(net.meta.airports) : '3,000여'}개와 직항 노선{' '}
          {net ? fmt.format(net.meta.routes) : '19,000여'}개로 이루어진 그래프에서 공항을 하나씩 꺼 보세요. 어디가
          고립되고, 어디로 우회하고, 어느 공항에 부담이 몰리는지 지구본 위에서 바로 보입니다.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => scrollToSection('simulator')}>
            직접 꺼보기
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => scrollToSection('scenarios')}>
            실제 사건 재현
          </button>
        </div>
        {net && (
          <dl className="hero-stats">
            <div>
              <dt>공항</dt>
              <dd>{fmt.format(net.meta.airports)}</dd>
            </div>
            <div>
              <dt>직항 노선</dt>
              <dd>{fmt.format(net.meta.routes)}</dd>
            </div>
            <div>
              <dt>국가·지역</dt>
              <dd>{fmt.format(net.meta.countries)}</dd>
            </div>
            <div>
              <dt>노선 기준</dt>
              <dd>{net.meta.sources.routes.asOf?.replace('-', '.') ?? '—'}</dd>
            </div>
          </dl>
        )}
        <p className="hint">지구본을 드래그해 돌리고, 공항 점을 클릭하면 시뮬레이터로 이동합니다.</p>
      </div>
    </section>
  )
}
