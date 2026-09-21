import { applyScenario } from '../sim/actions.ts'
import { SCENARIOS } from '../sim/scenarios.ts'
import { useSim } from '../sim/store.ts'

export function Scenarios() {
  const active = useSim((s) => s.scenarioId)
  return (
    <section id="scenarios" className="section-story">
      <div className="inner">
        <p className="eyebrow">시나리오 재현</p>
        <h2>버튼 하나로 실제 사건을 다시 일으켜 보기</h2>
        <p className="lede">
          네 개의 실제 사건과 두 개의 가상 실험. 각 시나리오는 폐쇄할 공항 집합(또는 국제선 차단)으로 변환되어
          시뮬레이터에 적용된다. 실제와 다른 점은 카드 아래 적어 두었다.
        </p>
        <div className="cards cards-3">
          {SCENARIOS.map((s) => (
            <article key={s.id} className={`card scenario ${active === s.id ? 'active' : ''}`}>
              <p className="card-when">{s.when}</p>
              <h3>{s.title}</h3>
              <p>{s.summary}</p>
              <p className="approx">근사: {s.approx}</p>
              <button
                type="button"
                className={`btn btn-sm ${active === s.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => applyScenario(s.id)}
              >
                {active === s.id ? '적용됨 · 다시 실행' : '재현하기'}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
