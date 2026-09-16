import { profile } from '../data/profile'
import { sectionTitles } from '../data/sections'
import { cx } from '../utils/cx'
import styles from './Header.module.css'

/** 각 섹션으로 이동하는 상단 바 (PRD 4절) */
export function Header() {
  return (
    <header className={styles.header}>
      <div className={cx('container', styles.inner)}>
        <a className={styles.name} href="#top">
          {profile.name}
        </a>

        <nav aria-label="섹션 이동">
          <ul className={styles.nav}>
            {sectionTitles.map((section) => (
              <li key={section.id}>
                <a className={styles.link} href={`#${section.id}`}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
