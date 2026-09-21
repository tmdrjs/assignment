import { useSim } from '../sim/store.ts'

export function Sources() {
  const net = useSim((s) => s.net)
  const src = net?.meta.sources
  return (
    <footer id="sources" className="section-story sources">
      <div className="inner">
        <p className="eyebrow">데이터 출처</p>
        <h2>출처와 라이선스</h2>
        <table className="table">
          <thead>
            <tr>
              <th>데이터</th>
              <th>출처</th>
              <th>라이선스</th>
              <th>기준 시점</th>
            </tr>
          </thead>
          <tbody>
            {src &&
              (
                [
                  ['공항 위치·규모·국가', src.airports],
                  ['직항 노선', src.routes],
                  ['국가명·코드', src.countries],
                  ['국가 폴리곤', src.polygons],
                ] as const
              ).map(([label, s]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  </td>
                  <td>{s.license}</td>
                  <td>{s.asOf ?? net?.meta.builtAt}</td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="muted small">
          그래프: {net?.meta.graph}. 매개 중심성: {net?.meta.betweenness}. 데이터 빌드 {net?.meta.builtAt}.
          <br />
          SkyCut 은 교육·시연 목적의 프로젝트이며 실제 운항 계획에 사용할 수 없습니다.
        </p>
      </div>
    </footer>
  )
}
