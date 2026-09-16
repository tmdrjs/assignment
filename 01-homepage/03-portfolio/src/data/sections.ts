import type { SectionTitle } from '../types/portfolio'

/**
 * 페이지에 놓이는 섹션 목록.
 * `id` 는 각 섹션 엘리먼트의 id 이자 앵커 주소다.
 */
export const sectionTitles: SectionTitle[] = [
  { index: '01', label: 'About', id: 'about' },
  { index: '02', label: 'Skills', id: 'skills' },
  { index: '03', label: 'Projects', id: 'projects' },
  { index: '04', label: 'Career', id: 'career' },
  { index: '05', label: 'Contact', id: 'contact' },
]
