import type { Network } from '../types.ts'

export type ScenarioKind = 'countries' | 'hubs' | 'random' | 'domestic'

export interface Scenario {
  id: string
  kind: ScenarioKind
  title: string
  when: string
  /** 카드에 보이는 한 줄 요약 */
  summary: string
  /** 실제 사건 설명 */
  detail: string
  /** 시뮬레이션이 실제와 다른 점 */
  approx: string
  countries?: string[]
  count?: number
  view: { lat: number; lng: number; altitude: number }
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'volcano-2010',
    kind: 'countries',
    title: '2010 아이슬란드 화산재',
    when: '2010년 4월 15–20일',
    summary: '에이야퍄들라이외퀴들 화산 폭발로 북·중부 유럽 영공이 6일간 닫혔다.',
    detail:
      '화산재가 제트엔진을 멈출 수 있어 유럽 20여 개국이 영공을 폐쇄했다. 약 10만 편이 결항하고 1천만 명 가까운 승객의 발이 묶였다. 2차 대전 이후 최대 규모의 항공 마비였다.',
    approx: '당시 폐쇄 범위를 국가 단위로 근사했다. 실제로는 일부 국가가 부분 폐쇄·단계적 재개를 했다.',
    countries: [
      'GB', 'IE', 'FR', 'BE', 'NL', 'LU', 'DE', 'DK', 'NO', 'SE', 'FI', 'PL', 'CZ', 'SK', 'AT', 'CH', 'HU',
      'EE', 'LV', 'LT', 'SI', 'HR',
    ],
    view: { lat: 52, lng: 10, altitude: 1.6 },
  },
  {
    id: 'sept11-2001',
    kind: 'countries',
    title: '2001 미국 영공 폐쇄',
    when: '2001년 9월 11–13일',
    summary: '9·11 테러 직후 미국 민간 영공이 사상 처음으로 전면 폐쇄됐다.',
    detail:
      '비행 중이던 항공기 4천여 대가 긴급 착륙 지시를 받았고, 미국행 국제선은 캐나다 등으로 회항했다. 이틀 뒤 단계적으로 재개될 때까지 세계 최대 항공 시장이 통째로 멈췄다.',
    approx: '미국의 모든 공항을 폐쇄한 것으로 근사했다. 영공 통과 금지와 회항은 모델에 없다.',
    countries: ['US'],
    view: { lat: 38, lng: -97, altitude: 1.7 },
  },
  {
    id: 'covid-2020',
    kind: 'domestic',
    title: '2020 코로나19 국경 폐쇄',
    when: '2020년 3월 ~',
    summary: '각국이 국경을 닫자 국제선이 끊기고 국내선만 남았다.',
    detail:
      '팬데믹 초기 대부분의 나라가 입국을 제한했다. ICAO 집계로 2020년 세계 항공 여객은 전년 대비 약 60% 줄었고, 국제선 감소 폭은 그보다 컸다. 공항은 열려 있었지만 하늘길은 나라 안에 갇혔다.',
    approx: '모든 국제선 노선을 끊고 국내선만 남기는 것으로 근사했다. 실제로는 화물·송환 항공편 등 일부가 유지됐다.',
    view: { lat: 25, lng: 60, altitude: 2.2 },
  },
  {
    id: 'russia-2022',
    kind: 'countries',
    title: '2022 러시아 영공 차단',
    when: '2022년 2월 ~',
    summary: '유럽과 러시아가 서로 영공을 닫자 유럽–동아시아 노선이 우회하기 시작했다.',
    detail:
      '유럽 항공사는 시베리아 상공을 지나지 못해 유럽–동아시아 노선의 비행시간이 1~4시간 늘었다. 이 사건은 공항이 아니라 "지나가는 하늘"이 막힌 사례다.',
    approx: '모델은 영공 통과를 다루지 않으므로 러시아의 모든 공항을 폐쇄해 네트워크 효과만 본다.',
    countries: ['RU'],
    view: { lat: 60, lng: 90, altitude: 1.9 },
  },
  {
    id: 'top10-hubs',
    kind: 'hubs',
    title: '허브 상위 10개 폐쇄',
    when: '가상 · 표적 공격',
    summary: '매개 중심성 1~10위 공항을 동시에 끈다.',
    detail:
      '전체 공항의 0.3%에 불과한 10개 공항을 골라서 끄면 어떤 일이 벌어질까. "허브 중심 네트워크는 표적 공격에 약하다"를 직접 확인하는 시나리오다.',
    approx: '가상 시나리오. 아래 무작위 10개 폐쇄와 비교해 보자.',
    count: 10,
    view: { lat: 35, lng: 0, altitude: 2.3 },
  },
  {
    id: 'random-10',
    kind: 'random',
    title: '무작위 10개 폐쇄',
    when: '가상 · 무작위 고장',
    summary: '아무 공항이나 10개를 골라 끈다. 누를 때마다 다시 뽑는다.',
    detail:
      '같은 수의 공항을 무작위로 끄면 네트워크는 대부분 멀쩡하다. 허브 중심 네트워크가 "무작위 고장에는 강하다"는 뜻이다.',
    approx: '가상 시나리오. 매번 다른 공항이 뽑힌다.',
    count: 10,
    view: { lat: 25, lng: 60, altitude: 2.3 },
  },
]

export const scenarioById = (id: string): Scenario | undefined => SCENARIOS.find((s) => s.id === id)

/** 시나리오를 현재 네트워크의 폐쇄 상태로 변환 */
export function resolveScenario(net: Network, s: Scenario): { closed: number[]; domesticOnly: boolean } {
  switch (s.kind) {
    case 'countries': {
      const closed: number[] = []
      for (const c of s.countries ?? []) closed.push(...(net.byCountry.get(c) ?? []))
      return { closed, domesticOnly: false }
    }
    case 'hubs':
      return { closed: net.ranked.slice(0, s.count ?? 10), domesticOnly: false }
    case 'random': {
      const n = net.airports.length
      const pick = new Set<number>()
      while (pick.size < (s.count ?? 10)) pick.add(Math.floor(Math.random() * n))
      return { closed: [...pick], domesticOnly: false }
    }
    case 'domestic':
      return { closed: [], domesticOnly: true }
  }
}
