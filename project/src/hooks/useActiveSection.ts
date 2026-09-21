import { useEffect } from 'react'
import { useSim } from '../sim/store.ts'

/** 스크롤 위치로 지구본 모드 결정: 시뮬레이터 섹션이 절반 이상 보이면 sim, 히어로가 보이면 hero, 그 외 story */
export function useActiveSection(): void {
  useEffect(() => {
    let timer = 0
    const visibleFrac = (el: HTMLElement | null) => {
      if (!el) return 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      return Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) / vh
    }
    const update = () => {
      timer = 0
      const sim = visibleFrac(document.getElementById('simulator'))
      const hero = visibleFrac(document.getElementById('hero'))
      const mode = sim >= 0.5 ? 'sim' : hero >= 0.45 ? 'hero' : 'story'
      useSim.getState().setMode(mode)
    }
    // 첫 스크롤 이벤트는 즉시 반영하고, 연속 이벤트는 타이머로 합친다 (rAF 미사용: 가려진 탭에서도 동작)
    let last = 0
    const onScroll = () => {
      const now = performance.now()
      if (now - last > 80) {
        last = now
        update()
      } else if (!timer) timer = window.setTimeout(update, 80)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.clearTimeout(timer)
    }
  }, [])
}
