import type { ReactNode } from 'react'
import styles from './Section.module.css'

interface SectionProps {
  /** 앵커 id. sections.ts 의 id와 같다. */
  id: string
  /** 순번 (예: 01) */
  index: string
  title: string
  /** 제목 아래 한 줄 설명 (선택) */
  description?: string
  children: ReactNode
}

/** 모든 섹션이 공유하는 껍데기. 제목 구조와 여백만 맡는다. */
export function Section({ id, index, title, description, children }: SectionProps) {
  const headingId = `${id}-title`

  return (
    <section id={id} className={styles.section} aria-labelledby={headingId}>
      <div className="container">
        <header className={styles.header}>
          <span className={styles.index} aria-hidden="true">
            {index}
          </span>
          <h2 id={headingId} className={styles.title}>
            {title}
          </h2>
          {description && <p className={styles.description}>{description}</p>}
        </header>

        {children}
      </div>
    </section>
  )
}
