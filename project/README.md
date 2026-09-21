# SkyCut — 공항이 멈추면?

세계 공항 3,391개와 직항 노선 19,213개로 만든 항공 네트워크 그래프에서 공항·국가를 "폐쇄"하고,
어디가 고립되고 어디로 우회하며 어느 공항에 부담이 몰리는지 3D 지구본 위에서 확인하는 인터랙티브 소개사이트.
`prd.md` 의 요구사항을 구현한 결과물이며, 백엔드 없이 정적 파일만으로 동작한다.

## 빠른 시작

```bash
npm install
npm run build:data   # 원본 데이터 다운로드(.cache/) → public/data/network.json 생성 (이미 포함되어 있음)
npm run dev          # http://localhost:5173
npm run build        # 타입체크 + dist/ 정적 빌드
npm run preview      # 빌드 결과 미리보기
npm run test:graph   # 그래프 엔진 자체 검증 (브루트포스 비교)
```

Node 22.18+ / 24 권장 (데이터 스크립트와 셀프테스트가 Node 의 내장 TypeScript 스트리핑을 사용).

## 구성

```
scripts/build-data.mjs      데이터 파이프라인 (전처리, Brandes 매개 중심성, 붕괴 곡선)
scripts/selftest-graph.mjs  엔진 검증
public/data/network.json    공항·노선·국가·붕괴 곡선 (컬럼형, 약 660 KB)
public/data/countries-110m.json  지구본 국가 폴리곤 (TopoJSON, ISO alpha-2 주입)
src/
  graph/    CSR 그래프, 엔진(BFS·다익스트라·샘플 Brandes), Web Worker, RPC 클라이언트
  sim/      zustand 상태, 시나리오, 공유 링크, 워커 연동, 공용 동작
  globe/    globe.gl 지구본, 레이어 데이터 생성, 자체 피킹
  sections/ 히어로 · 문제 · 허브 순위 · 시나리오 · 직접 해보기 · 인사이트 · 기술 · 한계 · 출처
  components/ 공항 검색, 통계 타일, 붕괴 곡선 차트, 토스트
```

## PRD 대응

| ID | 기능 | 상태 |
|---|---|---|
| F1 | 지구본 네트워크 표시 (노선 1,500개 흐름 애니메이션, 가벼운 모드 400개) | 완료 |
| F2 | 공항 검색·선택 (IATA/도시/공항명/국가, 한글 도시명 별칭) | 완료 |
| F3 | 공항 폐쇄/복구, 다중 선택, 국가·대륙 단위 폐쇄 | 완료 |
| F4 | 영향 분석 (고립·분리 공항, 연결 요소, 도달 불가 쌍, 평균 환승, 부담 증가 공항) | 완료 |
| F5 | 경로 비교 (폐쇄 전후 최소 환승 경로 + 최단 거리 대안) | 완료 |
| F6 | 허브 순위 Top 20, 클릭 시 지구본 이동 | 완료 |
| E1 | 시나리오 (2010 화산, 2001 미국, 2020 코로나 국경 폐쇄, 2022 러시아, 허브 10개, 무작위 10개) | 완료 |
| E2 | 붕괴 곡선 (무작위 vs 매개 중심성 순 vs 연결 수 재계산) + 현재 상태 표시 | 완료 |
| E3 | 지역 단위 폐쇄 (국가 클릭, 국가 검색, 대륙 선택) | 완료 (지도에 영역 그리기는 미구현) |
| E4 | OpenSky 실시간 항공기 | 미구현 (서버 필요) |
| E5 | OpenSky 기반 최신 노선망 | 미구현 |
| E6 | 공유 링크 (`#c=ICN,JFK&i=1&r=ICN-LAX&s=volcano-2010`) | 완료 |

## 설계 결정 (PRD §15 미정 사항)

- **프론트엔드**: Vite + React 19 + TypeScript, globe.gl(Three.js). 정적 호스팅 전제.
- **그래프**: 무방향. 노선 대부분이 양방향이고 연결 요소·중심성 해석이 단순해진다. 항공사 수는 표시 우선순위에만 쓴다.
- **공항 수**: 직항 노선이 있고 최대 연결 요소에 속한 3,391개 전부. 작은 공항을 빼면 "허브가 닫히면 고립되는 지역"이
  사라지므로 일부러 남겼다. 성능은 병합 지오메트리·표시 상한·워커 분리로 확보했다.
- **데이터 처리 언어**: PRD 는 Python/NetworkX 를 적었지만 툴체인을 하나로 유지하려고 Node 로 구현했다.
  Brandes 매개 중심성은 정확 계산(3,391 노드, 약 1초)이며 `test:graph` 가 브루트포스와 대조한다.
- **이름**: SkyCut (가칭 그대로).

## 알고리즘

| 목적 | 방법 | 위치 |
|---|---|---|
| 최소 환승 경로 | 다익스트라, 비용 = 환승 × 10⁶ + km | 워커 |
| 최단 거리 경로 | 다익스트라 (haversine km) | 워커 |
| 고립·분리 탐지 | BFS 연결 요소 | 워커 |
| 공항 중요도 | Brandes 매개 중심성 (비가중, 정규화) | 빌드 시 |
| 부담 증가 공항 | 고정 샘플 출발지 200개 Brandes 의존도, 폐쇄 전후 차이 (기준선 캐시) | 워커 |
| 붕괴 곡선 | 제거 순서를 뒤집어 Union-Find 로 최대 요소 추적, 무작위 20회 평균 | 빌드 시 |

## 성능

- 단일 WebGL 인스턴스를 고정 레이어에 두고 스크롤 위치에 따라 hero/story/sim 모드만 바꾼다.
- 점 3,391개는 하나의 지오메트리로 병합하고, 포인터 레이캐스트 대신 지표 좌표 기반 자체 피킹을 쓴다.
- 폐쇄 후 분석은 Web Worker 에서 약 80~200 ms (M 시리즈 맥 기준), 국경 폐쇄 시나리오는 수 ms.
- 첫 2.5초 평균 프레임이 26fps 미만이면 가벼운 모드로 자동 전환, 수동 토글도 제공.
- three.js/globe.gl 은 별도 청크로 지연 로딩되어 스토리 섹션이 먼저 그려진다.

## 배포

`npm run build` 결과인 `dist/` 를 GitHub Pages, Vercel, Netlify 등 정적 호스팅에 올리면 된다
(`base: './'` 로 하위 경로에서도 동작).

## 데이터 출처

| 데이터 | 출처 | 라이선스 | 기준 |
|---|---|---|---|
| 공항 | [OurAirports](https://ourairports.com/data/) | Public domain | 빌드 시점 |
| 직항 노선 | [OpenFlights routes.dat](https://openflights.org/data) | ODbL | 2014-06 (갱신 중단) |
| 국가명·코드 | [mledoze/countries](https://github.com/mledoze/countries) | ODbL | — |
| 국가 폴리곤 | [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth 110m) | Public domain | — |

## 한계

노선 데이터가 2014년 기준이고, 좌석·운항 빈도 같은 수요는 반영하지 않는다. 모델은 공항(노드) 폐쇄만 다루며
영공 통과 금지는 국가 단위 공항 폐쇄로 근사한다. 부담 증가 공항은 샘플 추정치다. 자세한 내용은 사이트의 "한계와 향후 계획" 섹션 참고.
