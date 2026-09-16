import { profile } from '../data/profile'
import { cx } from '../utils/cx'
import styles from './Hero.module.css'

/**
 * 첫 화면. 화면에 고정되어 있고, 스크롤하면 위로 올라오는 제목 필드에 덮인다.
 */
export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={cx('container', styles.inner)}>
        <p className={styles.eyebrow}>
          <span className={styles.dot} aria-hidden="true" />
          {profile.role}
        </p>

        <h1 id="hero-title" className={styles.heading}>
          {profile.heroHeading.map((line, index) => (
            <span key={`${index}-${line}`} className={styles.line}>
              {line}
            </span>
          ))}
        </h1>

        <p className={styles.subtext}>{profile.heroSubtext}</p>
      </div>

      <p className={styles.hint} aria-hidden="true">
        <span className={styles.hintLine} />
        Scroll
      </p>
    </section>
  )
}
