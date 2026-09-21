import { applyScenario } from '../sim/actions.ts'
import { SCENARIOS } from '../sim/scenarios.ts'

const REAL = ['volcano-2010', 'covid-2020', 'sept11-2001', 'russia-2022']

export function Problem() {
  const events = REAL.map((id) => SCENARIOS.find((s) => s.id === id)!).filter(Boolean)
  return (
    <section id="problem" className="section-story">
      <div className="inner">
        <p className="eyebrow">문제</p>
        <h2>하늘길은 생각보다 자주, 크게 끊긴다</h2>
        <p className="lede">
          세계 항공망은 소수의 허브 공항에 크게 기대고 있지만, 우리는 그 의존도를 체감할 기회가 거의 없다. 항공편
          추적 서비스는 "지금 어디 있나"를 보여줄 뿐, "무엇이 끊기면 어떻게 되나"를 실험하게 해 주지 않는다. 그런데
          공항과 영공 폐쇄는 실제로 반복해서 일어난다.
        </p>
        <div className="cards">
          {events.map((e) => (
            <article key={e.id} className="card">
              <p className="card-when">{e.when}</p>
              <h3>{e.title}</h3>
              <p>{e.detail}</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => applyScenario(e.id)}>
                시뮬레이터에서 재현 →
              </button>
            </article>
          ))}
        </div>
        <div className="callout">
          <strong>이 사이트가 하는 일</strong>
          <p>
            공항을 노드, 직항 노선을 엣지로 하는 그래프를 만들고, 사용자가 공항이나 국가를 "폐쇄"하면 네트워크가 어떻게
            무너지고 우회되는지를 3D 지구본 위에서 3초 안에 보여준다. 계산은 전부 브라우저 안에서 끝난다.
          </p>
        </div>
      </div>
    </section>
  )
}
