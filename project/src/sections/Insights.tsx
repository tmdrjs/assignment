import { CollapseChart } from '../components/CollapseChart.tsx'
import { pct } from '../sim/actions.ts'
import { useSim } from '../sim/store.ts'

export function Insights() {
  const net = useSim((s) => s.net)
  const analysis = useSim((s) => s.analysis)
  const closed = useSim((s) => s.closed)
  if (!net) return null
  const c = net.collapse
  const at = (arr: number[], f: number) => arr[Math.round(f / c.step)]
  const current =
    analysis && closed.size > 0
      ? {
          x: closed.size / net.meta.airports,
          y: analysis.lcc / net.meta.airports,
          label: `지금: ${closed.size}개 폐쇄 → ${pct(analysis.lcc / net.meta.airports, 0)}`,
        }
      : null
  return (
    <section id="insights" className="section-story">
      <div className="inner">
        <p className="eyebrow">인사이트</p>
        <h2>무작위 고장에는 강하고, 표적 공격에는 약하다</h2>
        <p className="lede">
          공항을 하나씩 제거하며 "가장 큰 연결 덩어리"가 얼마나 남는지 재면 허브 중심 네트워크의 성격이 드러난다.
          아무 공항이나 <strong>{pct(0.05, 0)}</strong>를 꺼도 네트워크의 <strong>{pct(at(c.random, 0.05), 0)}</strong>
          가 한 덩어리로 남지만, 허브부터 {pct(0.05, 0)}를 끄면 <strong>{pct(at(c.betweenness, 0.05), 0)}</strong>만
          남는다. {pct(0.2, 0)}를 끄면 무작위는 {pct(at(c.random, 0.2), 0)}, 허브 우선은{' '}
          {pct(at(c.betweenness, 0.2), 0)}다.
        </p>
        <CollapseChart collapse={c} current={current} />
        <div className="cards cards-3 compact">
          <div className="card">
            <h3>왜 이런 모양일까</h3>
            <p>
              대부분의 공항은 노선이 몇 개 없고, 소수의 허브가 수백 개를 갖는다. 무작위로 고르면 거의 항상 작은 공항이
              뽑혀 네트워크에 흠집만 낸다. 허브를 고르면 그 허브에 매달린 지역이 통째로 떨어져 나간다.
            </p>
          </div>
          <div className="card">
            <h3>두 종류의 표적 공격</h3>
            <p>
              주황 선은 처음 계산한 매개 중심성 순서로 끈 것이고, 보라 선은 끌 때마다 남은 네트워크에서 연결 수가 가장 많은
              공항을 다시 고른 것이다. 재계산하는 쪽이 더 빨리 무너뜨린다.
            </p>
          </div>
          <div className="card">
            <h3>시뮬레이터와 연결</h3>
            <p>
              지금 시뮬레이터에서 공항을 끄면 흰 점으로 현재 상태가 그래프에 찍힌다. 무작위 10개와 허브 10개 시나리오를
              번갈아 실행해 두 곡선의 차이를 직접 만들어 보자.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
