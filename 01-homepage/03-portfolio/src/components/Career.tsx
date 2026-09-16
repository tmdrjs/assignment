import { activities, education } from '../data/profile'
import type { CareerEntry } from '../types/portfolio'
import { placeholderClass } from '../utils/placeholder'
import { Section } from './Section'
import styles from './Section.module.css'

/** Career / Education (PRD 12절) - 경력보다 교육과 개발 경험 중심이다. */
export function Career() {
  return (
    <Section id="career" index="04" title="Career">
      <div className={styles.block}>
        <h3 className={styles.subheading}>Education</h3>
        <EntryList entries={education} />
      </div>

      <div className={styles.block}>
        <h3 className={styles.subheading}>Activities</h3>
        <EntryList entries={activities} />
      </div>
    </Section>
  )
}

function EntryList({ entries }: { entries: CareerEntry[] }) {
  return (
    <ul className={styles.list}>
      {entries.map((entry) => (
        <li key={`${entry.title}-${entry.period}`} className={styles.row}>
          <div>
            <p className={`${styles.rowMain} ${placeholderClass(entry.title) ?? ''}`}>
              {entry.title}
            </p>
            <p className={`${styles.rowDetail} ${placeholderClass(entry.detail) ?? ''}`}>
              {entry.detail}
            </p>
          </div>
          <p className={styles.rowPeriod}>{entry.period}</p>
        </li>
      ))}
    </ul>
  )
}
