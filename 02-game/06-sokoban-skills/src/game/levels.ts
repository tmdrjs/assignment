import type { Level } from './types'

/**
 * 스테이지 데이터.
 *
 * 모든 레벨은 BFS 탐색으로 클리어 가능 여부를 확인했고,
 * minMoves 는 그때 구한 최소 이동 수다.
 */
export const LEVELS: Level[] = [
  {
    id: 1,
    name: '첫 걸음',
    difficulty: 'easy',
    minMoves: 1,
    map: [
      '#######',
      '#     #',
      '# .$@ #',
      '#     #',
      '#######',
    ],
  },
  {
    id: 2,
    name: '나란히',
    difficulty: 'easy',
    minMoves: 10,
    map: [
      '#########',
      '#       #',
      '#  $ .  #',
      '#  @    #',
      '#  $ .  #',
      '#       #',
      '#########',
    ],
  },
  {
    id: 3,
    name: '순서',
    difficulty: 'easy',
    minMoves: 9,
    map: [
      '########',
      '#      #',
      '#  ##  #',
      '#  $.  #',
      '#  @$  #',
      '#   .  #',
      '#      #',
      '########',
    ],
  },
  {
    id: 4,
    name: '세 칸',
    difficulty: 'normal',
    minMoves: 8,
    map: [
      '#########',
      '#       #',
      '#  ...  #',
      '#  $$$  #',
      '#   @   #',
      '#       #',
      '#########',
    ],
  },
  {
    id: 5,
    name: '막다른 길',
    difficulty: 'normal',
    minMoves: 18,
    map: [
      '########',
      '#      #',
      '# .##  #',
      '# $ $  #',
      '#  @$  #',
      '# .  . #',
      '#      #',
      '########',
    ],
  },
  {
    id: 6,
    name: '돌아가기',
    difficulty: 'normal',
    minMoves: 22,
    map: [
      '##########',
      '#        #',
      '#  ####  #',
      '#  $  .  #',
      '#  $@ .  #',
      '#  $  .  #',
      '#        #',
      '##########',
    ],
  },
  {
    id: 7,
    name: '네 모퉁이',
    difficulty: 'normal',
    minMoves: 36,
    map: [
      '##########',
      '#        #',
      '#  $  $  #',
      '# .####. #',
      '#  $@ $  #',
      '# .    . #',
      '#        #',
      '##########',
    ],
  },
  {
    id: 8,
    name: '기둥 사이',
    difficulty: 'hard',
    minMoves: 23,
    map: [
      '########',
      '#      #',
      '# .##$ #',
      '#      #',
      '#  ##+ #',
      '#   $$ #',
      '#  .   #',
      '########',
    ],
  },
  {
    id: 9,
    name: '안쪽 방',
    difficulty: 'hard',
    minMoves: 30,
    map: [
      '########',
      '#      #',
      '# #..# #',
      '# #  # #',
      '# $.*  #',
      '# #$$# #',
      '#  @   #',
      '########',
    ],
  },
  {
    id: 10,
    name: '지그재그',
    difficulty: 'hard',
    minMoves: 45,
    map: [
      '#########',
      '#   @   #',
      '# ##$## #',
      '# .$ $. #',
      '# ## ## #',
      '# . $ . #',
      '#       #',
      '#########',
    ],
  },
]

export const FIRST_STAGE_ID = LEVELS[0].id
export const LAST_STAGE_ID = LEVELS[LEVELS.length - 1].id

export function findLevel(id: number): Level | undefined {
  return LEVELS.find((level) => level.id === id)
}

export function nextLevelId(id: number): number | null {
  const index = LEVELS.findIndex((level) => level.id === id)
  if (index < 0 || index + 1 >= LEVELS.length) return null
  return LEVELS[index + 1].id
}

export const DIFFICULTY_LABEL: Record<Level['difficulty'], string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
}
