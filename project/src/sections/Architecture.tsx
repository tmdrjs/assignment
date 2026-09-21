import { fmt } from '../sim/actions.ts'
import { useSim } from '../sim/store.ts'

export function Architecture() {
  const net = useSim((s) => s.net)
  const analysis = useSim((s) => s.analysis)
  return (
    <section id="tech" className="section-story">
      <div className="inner">
        <p className="eyebrow">기술 구조</p>
        <h2>백엔드 없이, 브라우저 안에서 전부</h2>
        <p className="lede">
          데이터 전처리와 무거운 사전 계산은 빌드 시점에 한 번 하고, 폐쇄에 따른 재계산은 Web Worker 에서 수십~수백
          밀리초 안에 끝낸다. 결과물은 정적 파일뿐이라 어디든 올릴 수 있다.
        </p>
        <div className="pipeline" aria-label="데이터 파이프라인">
          <div className="pipe-node">
            <strong>원본 데이터</strong>
            <span>OurAirports · OpenFlights routes · mledoze/countries · world-atlas</span>
          </div>
          <div className="pipe-arrow" aria-hidden="true" />
          <div className="pipe-node">
            <strong>전처리 (Node, 빌드 시 1회)</strong>
            <span>
              직항만 남김 → 항공사 중복 제거 → 무방향 엣지 통합 → 최대 연결 요소 → 대권거리 → Brandes 매개 중심성 →
              붕괴 곡선
            </span>
          </div>
          <div className="pipe-arrow" aria-hidden="true" />
          <div className="pipe-node">
            <strong>network.json (약 660 KB)</strong>
            <span>
              공항 {net ? fmt.format(net.meta.airports) : '—'} · 노선 {net ? fmt.format(net.meta.routes) : '—'} ·
              컬럼형 저장
            </span>
          </div>
          <div className="pipe-arrow" aria-hidden="true" />
          <div className="pipe-node split">
            <div>
              <strong>메인 스레드</strong>
              <span>globe.gl(Three.js) 렌더링, 자체 피킹, React 패널</span>
            </div>
            <div>
              <strong>Web Worker</strong>
              <span>연결 요소 · 다익스트라 · 샘플 Brandes</span>
            </div>
          </div>
        </div>

        <h3 className="sub">알고리즘</h3>
        <table className="table">
          <thead>
            <tr>
              <th>목적</th>
              <th>방법</th>
              <th>어디서</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>최소 환승 경로</td>
              <td>다익스트라, 비용 = 환승 × 10⁶ + km (환승 우선, 거리로 동률 해소)</td>
              <td>워커</td>
            </tr>
            <tr>
              <td>최단 거리 경로</td>
              <td>다익스트라 (대권거리 가중치)</td>
              <td>워커</td>
            </tr>
            <tr>
              <td>고립·분리 탐지</td>
              <td>BFS 연결 요소, 최대 요소 대비 크기</td>
              <td>워커</td>
            </tr>
            <tr>
              <td>공항 중요도</td>
              <td>Brandes 매개 중심성 정확 계산 (비가중, 무방향)</td>
              <td>빌드 시</td>
            </tr>
            <tr>
              <td>부담 증가 공항</td>
              <td>고정된 출발지 200개 샘플로 Brandes 의존도 누적, 폐쇄 전후 차이</td>
              <td>워커</td>
            </tr>
            <tr>
              <td>붕괴 곡선</td>
              <td>제거 순서를 뒤집어 Union-Find 로 노드를 추가하며 최대 요소 추적 (무작위 20회 평균)</td>
              <td>빌드 시</td>
            </tr>
          </tbody>
        </table>

        <h3 className="sub">성능 최적화</h3>
        <ul className="bullets">
          <li>
            <strong>단일 WebGL 인스턴스.</strong> 지구본 하나를 고정 레이어에 두고, 스크롤 위치에 따라 히어로·배경·시뮬레이터
            모드로 동작만 바꾼다.
          </li>
          <li>
            <strong>포인터 레이캐스트 비활성화.</strong> 3,000여 개 점을 개별 메시로 레이캐스트하는 대신 점을 하나의 지오메트리로
            합치고, 커서 아래 지표 좌표에서 가장 가까운 공항을 직접 계산한다.
          </li>
          <li>
            <strong>표시 노선 상한.</strong> 그래프 계산은 노선 전체로 하되 화면에는 취항 항공사 수가 많은 순으로 1,500개(가벼운 모드
            400개)만 그리고, 끊긴 노선은 별도 상한으로 강조한다.
          </li>
          <li>
            <strong>워커 분리 + 최신 응답만 반영.</strong> 클릭이 연달아 들어와도 마지막 요청의 결과만 화면에 쓴다.
            {analysis && <> 마지막 분석: {analysis.elapsedMs.toFixed(0)} ms.</>}
          </li>
          <li>
            <strong>가벼운 모드.</strong> 첫 2.5초 평균 프레임이 낮으면 자동으로 전환하고, 언제든 수동으로 켤 수 있다.
          </li>
        </ul>
      </div>
    </section>
  )
}
