/** 포트폴리오 콘텐츠 타입 정의 */

export interface Profile {
  /** 이름 또는 닉네임 */
  name: string
  /** 직무 (예: Frontend Developer) */
  role: string
  /** Hero 제목 - 줄 단위로 나눠서 작성한다. */
  heroHeading: string[]
  /** Hero 보조 설명 */
  heroSubtext: string
}

/** 네비게이션 · 섹션 목록 */
export interface SectionTitle {
  /** 순번 (예: 01) */
  index: string
  /** 화면에 보이는 제목 */
  label: string
  /** 앵커 id. 섹션 엘리먼트의 id와 같다. */
  id: string
}

/** About - 문단 하나 */
export type AboutParagraph = string

/** Skills - 그룹 하나 (PRD 7절) */
export interface SkillGroup {
  /** 예: Frontend / Backend / Tools */
  category: string
  items: SkillItem[]
}

export interface SkillItem {
  name: string
  /** 실제 사용 경험에 대한 짧은 설명 (없으면 생략) */
  note?: string
}

/** Projects - 카드 하나 (PRD 8절) */
export interface Project {
  id: string
  /** 프로젝트 이름 */
  name: string
  /** 한 줄 설명 */
  summary: string
  /** 사용 기술 */
  stack: string[]
  /** 프로젝트 기간 */
  period: string
  /** GitHub 링크 (없으면 생략) */
  repoUrl?: string
  /** Demo 링크 (없으면 생략) */
  demoUrl?: string
}

/** Career - 학력 · 활동 (PRD 12절) */
export interface CareerEntry {
  /** 예: 학교명 / 활동명 */
  title: string
  /** 예: 전공 / 역할 */
  detail: string
  /** 기간 */
  period: string
}

/** Contact - 연락 수단 하나 (PRD 13절) */
export interface ContactLink {
  label: string
  /** 화면에 보이는 값 */
  value: string
  /** 링크 주소. 없으면 텍스트로만 보여준다. */
  href?: string
}
