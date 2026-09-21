export function Limits() {
  return (
    <section id="limits" className="section-story">
      <div className="inner">
        <p className="eyebrow">한계와 향후 계획</p>
        <h2>이 시뮬레이터가 말하지 않는 것</h2>
        <div className="cards cards-2">
          <div className="card">
            <h3>노선 데이터의 시점</h3>
            <p>
              OpenFlights 노선 데이터는 2014년 6월 이후 갱신되지 않았다. 그래서 이 사이트의 네트워크는 "과거 기준"이며,
              최근 개항·폐항한 공항과 노선은 반영되지 않는다. 향후 OpenSky 운항 기록으로 최신 노선망을 다시 만드는 것이
              첫 번째 과제다.
            </p>
          </div>
          <div className="card">
            <h3>수요를 모른다</h3>
            <p>
              좌석 수·운항 횟수·승객 수는 없다. 하루 30편 노선과 주 1편 노선이 같은 엣지 하나다. 취항 항공사 수를 보조
              가중치로 두어 표시 우선순위에만 쓴다. 따라서 "부담 증가"는 경로 구조상의 부담이지 실제 승객 수가 아니다.
            </p>
          </div>
          <div className="card">
            <h3>공항 폐쇄 ≠ 영공 폐쇄</h3>
            <p>
              모델은 공항(노드)을 끄는 것만 다룬다. 실제 사건에서는 영공 통과 금지처럼 "지나가는 길"이 막히는 경우가 많고,
              항공사는 회항·우회·기재 변경으로 대응한다. 시나리오는 이를 국가 단위 공항 폐쇄로 근사했다.
            </p>
          </div>
          <div className="card">
            <h3>근사와 샘플링</h3>
            <p>
              부담 증가 공항은 출발지 200개 샘플로 추정한다. 순위 상위는 안정적이지만 하위 순위는 흔들릴 수 있다. 무방향
              그래프를 썼으므로 편도 노선의 방향성도 무시된다.
            </p>
          </div>
        </div>
        <div className="callout">
          <strong>다음 단계</strong>
          <p>
            OpenSky 실시간 위치를 배경에 얹기(E4) · 최신 노선망 재구축(E5) · 지도에 그린 영역 단위 폐쇄(E3 확장) ·
            방향 그래프와 운항 빈도 가중치 도입.
          </p>
        </div>
      </div>
    </section>
  )
}
