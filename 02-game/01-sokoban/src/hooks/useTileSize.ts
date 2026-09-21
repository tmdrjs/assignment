import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

const MIN_TILE = 18
const MAX_TILE = 64

/**
 * 보드가 항상 화면 안에 들어오도록 타일 크기를 계산한다.
 * 컨테이너 크기와 맵의 행 / 열 수를 기준으로 한다.
 */
export function useTileSize(
  ref: RefObject<HTMLElement | null>,
  rows: number,
  cols: number,
): number {
  const [tileSize, setTileSize] = useState(MIN_TILE)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    function update(width: number, height: number) {
      if (width <= 0 || height <= 0) return
      const size = Math.floor(Math.min(width / cols, height / rows))
      setTileSize(Math.max(MIN_TILE, Math.min(MAX_TILE, size)))
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      update(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(element)
    update(element.clientWidth, element.clientHeight)

    return () => observer.disconnect()
  }, [ref, rows, cols])

  return tileSize
}
