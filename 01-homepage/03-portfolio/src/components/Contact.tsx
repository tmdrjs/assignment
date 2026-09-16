import { contactLinks } from '../data/profile'
import { placeholderClass } from '../utils/placeholder'
import { Section } from './Section'
import styles from './Section.module.css'

/** Contact (PRD 13절) */
export function Contact() {
  return (
    <Section
      id="contact"
      index="05"
      title="Contact"
      description="편하게 연락 주세요."
    >
      <ul className={styles.list}>
        {contactLinks.map((item) => (
          <li key={item.label} className={styles.row}>
            <span className={styles.rowLabel}>{item.label}</span>
            {item.href ? (
              <a className={styles.link} href={item.href}>
                {item.value}
              </a>
            ) : (
              <span className={placeholderClass(item.value)}>{item.value}</span>
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
