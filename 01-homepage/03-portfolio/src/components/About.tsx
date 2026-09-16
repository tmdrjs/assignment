import { about } from '../data/profile'
import { placeholderClass } from '../utils/placeholder'
import { Section } from './Section'
import styles from './Section.module.css'

/** About Me (PRD 6절) */
export function About() {
  return (
    <Section id="about" index="01" title="About Me">
      <div className={styles.prose}>
        {about.map((paragraph) => (
          <p key={paragraph} className={placeholderClass(paragraph)}>
            {paragraph}
          </p>
        ))}
      </div>
    </Section>
  )
}
