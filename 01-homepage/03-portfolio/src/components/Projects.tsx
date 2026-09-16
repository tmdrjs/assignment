import { projects } from '../data/profile'
import { placeholderClass } from '../utils/placeholder'
import { Section } from './Section'
import styles from './Section.module.css'

/** Projects (PRD 8절) - 포트폴리오에서 가장 중요한 섹션이다. */
export function Projects() {
  return (
    <Section
      id="projects"
      index="03"
      title="Projects"
      description="직접 구현한 부분과 해결한 문제를 중심으로 정리합니다."
    >
      <div className={styles.grid}>
        {projects.map((project) => (
          <article key={project.id} className={styles.card}>
            <h3 className={`${styles.cardTitle} ${placeholderClass(project.name) ?? ''}`}>
              {project.name}
            </h3>
            <p className={`${styles.cardSummary} ${placeholderClass(project.summary) ?? ''}`}>
              {project.summary}
            </p>

            <ul className={styles.tags}>
              {project.stack.map((tech) => (
                <li key={tech} className={styles.tag}>
                  {tech}
                </li>
              ))}
            </ul>

            <p className={styles.meta}>{project.period}</p>

            {(project.repoUrl || project.demoUrl) && (
              <p className={styles.links}>
                {project.repoUrl && (
                  <a
                    className={styles.link}
                    href={project.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                )}
                {project.demoUrl && (
                  <a
                    className={styles.link}
                    href={project.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Demo
                  </a>
                )}
              </p>
            )}
          </article>
        ))}
      </div>
    </Section>
  )
}
