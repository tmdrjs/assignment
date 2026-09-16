import { skillGroups } from '../data/profile'
import { Section } from './Section'
import styles from './Section.module.css'

/** Skills (PRD 7절) - 실제로 사용한 기술만 그룹으로 보여준다. */
export function Skills() {
  return (
    <Section
      id="skills"
      index="02"
      title="Skills"
      description="실제 프로젝트에서 사용한 기술만 적었습니다."
    >
      <div className={styles.grid}>
        {skillGroups.map((group) => (
          <article key={group.category} className={styles.card}>
            <h3 className={styles.cardTitle}>{group.category}</h3>
            <ul className={styles.tags}>
              {group.items.map((item) => (
                <li key={item.name} className={styles.tag}>
                  {item.name}
                </li>
              ))}
            </ul>
            {group.items.some((item) => item.note) && (
              <ul>
                {group.items
                  .filter((item) => item.note)
                  .map((item) => (
                    <li key={item.name} className={styles.note}>
                      {item.name} — {item.note}
                    </li>
                  ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </Section>
  )
}
