import { useEffect, useState } from 'react'
import { scrollToSection } from '../sim/actions.ts'

const LINKS: [string, string][] = [
  ['problem', '문제'],
  ['hubs', '허브 순위'],
  ['scenarios', '시나리오'],
  ['simulator', '직접 해보기'],
  ['insights', '인사이트'],
  ['tech', '기술'],
  ['limits', '한계'],
  ['sources', '출처'],
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`} aria-label="섹션 이동">
      <button type="button" className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <span className="brand-mark" aria-hidden="true" />
        SkyCut
      </button>
      <div className="nav-links">
        {LINKS.map(([id, label]) => (
          <button key={id} type="button" onClick={() => scrollToSection(id)} className={id === 'simulator' ? 'cta' : ''}>
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
