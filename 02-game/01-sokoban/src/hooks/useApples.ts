import { useEffect, useRef, useState } from 'react'
import { saveEatenApple } from '../game/appleStore'
import { APPLE_SPAWN_INTERVAL_MS, MAX_APPLES, appleAt, pickAppleCell } from '../game/apples'
import type { Apple, BoardState, StaticMap } from '../game/types'
import { createUuid } from '../lib/uuid'

interface UseApplesOptions {
  staticMap: StaticMap
  board: BoardState
  /** false 면 새 사과를 만들지 않는다. (클리어 후 등) */
  active: boolean
}

export interface ApplesState {
  apples: Apple[]
  /** 이 화면에서 먹은 사과 수 */
  eaten: number
}

/**
 * 일정 간격으로 빈 칸에 사과를 만들고, 플레이어가 밟으면 먹는다.
 * 퍼즐 상태와는 따로 관리해서 되돌리기나 다시 시작으로 사과가 돌아오지 않는다.
 */
export function useApples({ staticMap, board, active }: UseApplesOptions): ApplesState {
  const [apples, setApples] = useState<Apple[]>([])
  const [eaten, setEaten] = useState(0)

  // 타이머 콜백에서 최신 보드와 사과를 읽기 위해 둔다.
  const latestRef = useRef({ board, apples })
  useEffect(() => {
    latestRef.current = { board, apples }
  })

  useEffect(() => {
    if (!active) return

    const timer = window.setInterval(() => {
      const { board: currentBoard, apples: currentApples } = latestRef.current
      if (currentApples.length >= MAX_APPLES) return

      const cell = pickAppleCell(staticMap, currentBoard, currentApples)
      if (!cell) return

      const apple: Apple = { id: createUuid(), ...cell, spawnedAt: Date.now() }
      setApples((current) => [...current, apple])
    }, APPLE_SPAWN_INTERVAL_MS)

    return () => window.clearInterval(timer)
  }, [active, staticMap])

  useEffect(() => {
    const apple = appleAt(apples, board.player)
    if (!apple) return

    setApples((current) => current.filter((item) => item.id !== apple.id))
    setEaten((count) => count + 1)
    void saveEatenApple(apple.id, Date.now())
  }, [apples, board.player])

  return { apples, eaten }
}
