/** 좌표는 항상 (행, 열) 순서로 다룬다. */
export interface Position {
  row: number
  col: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Difficulty = 'easy' | 'normal' | 'hard'

/** 레벨 원본 정의. map 은 표준 소코반 표기법(XSB) 문자열 배열이다. */
export interface Level {
  id: number
  name: string
  difficulty: Difficulty
  map: string[]
  /** 최소 이동 수. 검증된 값이 있을 때만 채운다. */
  minMoves?: number
}

/**
 * 플레이 중 변하지 않는 정보.
 * 벽과 목표 지점은 한 번만 계산해서 재사용한다.
 */
export interface StaticMap {
  rows: number
  cols: number
  /** [row][col] 이 벽이면 true */
  walls: boolean[][]
  /** [row][col] 이 목표 지점이면 true */
  goals: boolean[][]
  goalCount: number
}

export interface Box {
  /** 렌더링 시 상자를 추적하기 위한 고정 식별자 */
  id: number
  row: number
  col: number
}

/** 일정 시간마다 빈 칸에 생기는 아이템. 플레이어가 밟으면 먹는다. */
export interface Apple {
  /** 저장소에서도 그대로 쓰는 고유 id (uuid) */
  id: string
  row: number
  col: number
  /** 생성 시각 (ms) */
  spawnedAt: number
}

/** 플레이 중 변하는 정보. */
export interface BoardState {
  player: Position
  boxes: Box[]
  /** 셀 인덱스(row * cols + col) -> boxes 배열의 인덱스 */
  boxAt: Map<number, number>
}

/** 되돌리기에 필요한 최소 정보. */
export interface MoveRecord {
  direction: Direction
  /** 이 이동에서 상자를 밀었는지 여부 */
  pushed: boolean
}

export interface MoveResult {
  board: BoardState
  record: MoveRecord
}
