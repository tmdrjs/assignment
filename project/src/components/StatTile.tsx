import type { ReactNode } from 'react'

interface Props {
  label: string
  value: ReactNode
  /** 폐쇄 전 값 → 폐쇄 후 값처럼 보조 설명 */
  sub?: ReactNode
  tone?: 'neutral' | 'danger' | 'warn' | 'ok'
}

export function StatTile({ label, value, sub, tone = 'neutral' }: Props) {
  return (
    <div className={`stat tone-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}
