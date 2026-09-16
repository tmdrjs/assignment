/**
 * 대괄호로 감싼 값은 아직 채워지지 않은 자리다. (PRD 22절)
 * 실제 내용으로 바꾸면 자동으로 일반 텍스트처럼 보인다.
 */
export const isPlaceholder = (value: string) => /^\[.*\]$/.test(value.trim())

/** placeholder면 global.css 의 표시용 클래스를 붙인다. */
export const placeholderClass = (value: string) =>
  isPlaceholder(value) ? 'is-placeholder' : undefined
