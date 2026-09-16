import { Hero } from './components/Hero'
import { ParticleField } from './components/ParticleField'
import { SectionsPanel } from './components/SectionsPanel'
import { useRisingPanel } from './hooks/useRisingPanel'

/**
 * 두 화면으로 이루어진다.
 *
 * 1. 첫 화면 — 배경 입자 + Hero (화면에 고정)
 * 2. 섹션 패널 — 굴리면 아래에서 한 번에 올라와 화면을 채운다.
 *    그 안에서는 01~05 섹션이 평범하게 스크롤되고,
 *    맨 위에서 한 번 더 올리면 다시 내려간다.
 */
export default function App() {
  const { open, closePanel } = useRisingPanel()

  return (
    <>
      {/* 패널이 올라와 있는 동안에는 가려지므로 입자를 멈춘다. */}
      <ParticleField paused={open} />
      <Hero />
      <SectionsPanel open={open} onClose={closePanel} />
    </>
  )
}
