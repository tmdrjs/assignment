/**
 * 붕괴 곡선 (E2): 제거한 공항 비율(x) 대 최대 연결 요소 비율(y).
 * 세 시리즈 고정 색 (검증 완료: 파랑/주황/보라, 어두운 배경).
 * 호버 시 십자선 + 툴팁, 표 보기 제공.
 */
import { useMemo, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { line as d3line } from 'd3-shape'
import type { Collapse } from '../types.ts'

const SERIES = [
  { key: 'random', label: '무작위 제거', color: '#3987e5' },
  { key: 'betweenness', label: '허브부터 제거 (매개 중심성 순)', color: '#d95926' },
  { key: 'degree', label: '연결 수 순 (제거 후 재계산)', color: '#9085e9' },
] as const
type SeriesKey = (typeof SERIES)[number]['key']

interface Props {
  collapse: Collapse
  /** 현재 시뮬레이션 상태 점 (제거 비율, LCC 비율) */
  current?: { x: number; y: number; label: string } | null
  xMax?: number
}

const W = 720
const H = 360
const M = { top: 20, right: 150, bottom: 44, left: 52 }

export function CollapseChart({ collapse, current, xMax = 0.5 }: Props) {
  const [hoverX, setHoverX] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const x = useMemo(() => scaleLinear().domain([0, xMax]).range([M.left, W - M.right]), [xMax])
  const y = useMemo(() => scaleLinear().domain([0, 1]).range([H - M.bottom, M.top]), [])
  const nPts = Math.min(collapse.random.length, Math.round(xMax / collapse.step) + 1)
  const xs = useMemo(() => Array.from({ length: nPts }, (_, i) => i * collapse.step), [nPts, collapse.step])

  const paths = useMemo(() => {
    const gen = d3line<number>()
      .x((_, i) => x(xs[i]))
      .y((v) => y(v))
    return SERIES.map((s) => ({ ...s, d: gen(collapse[s.key].slice(0, nPts)) ?? '' }))
  }, [collapse, nPts, x, y, xs])

  const idxAt = (fx: number) => Math.max(0, Math.min(nPts - 1, Math.round(fx / collapse.step)))

  // 선 끝 직접 라벨: 14px 이내로 겹치면 위로 밀어 올린다
  const endLabels = useMemo(() => {
    const items = SERIES.map((s) => {
      const last = collapse[s.key][nPts - 1]
      const name = s.key === 'random' ? '무작위' : s.key === 'betweenness' ? '허브 우선' : '연결 수 순'
      return { key: s.key, y: y(last), text: `${name} ${(last * 100).toFixed(0)}%` }
    }).sort((a, b) => a.y - b.y)
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 14) items[i].y = items[i - 1].y + 14
    const overflow = items[items.length - 1].y - (H - M.bottom - 2)
    if (overflow > 0) for (const it of items) it.y -= overflow
    return items
  }, [collapse, nPts, y])
  const hoverIdx = hoverX === null ? null : idxAt(hoverX)

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const fx = x.invert(px)
    if (fx < 0 || fx > xMax) setHoverX(null)
    else setHoverX(fx)
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1]
  const xTicks = x.ticks(5)
  const tableRows = [0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5].filter((v) => v <= xMax)

  return (
    <figure className="chart">
      <div className="chart-head">
        <div className="chart-legend" aria-label="범례">
          {SERIES.map((s) => (
            <span key={s.key} className="legend-item">
              <i style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTable((t) => !t)}>
          {table ? '그래프로 보기' : '표로 보기'}
        </button>
      </div>
      {table ? (
        <table className="table chart-table">
          <thead>
            <tr>
              <th>제거 비율</th>
              {SERIES.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((v) => {
              const i = idxAt(v)
              return (
                <tr key={v}>
                  <td>{(v * 100).toFixed(0)}%</td>
                  {SERIES.map((s) => (
                    <td key={s.key}>{(collapse[s.key][i] * 100).toFixed(1)}%</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="chart-svg"
          role="img"
          aria-label="공항 제거 비율에 따른 최대 연결 요소 비율. 무작위 제거는 완만하게, 허브 우선 제거는 급격하게 떨어진다."
          onMouseMove={onMove}
          onMouseLeave={() => setHoverX(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} className="grid" />
              <text x={M.left - 8} y={y(t)} dy="0.35em" textAnchor="end" className="tick">
                {(t * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t} x={x(t)} y={H - M.bottom + 18} textAnchor="middle" className="tick">
              {(t * 100).toFixed(0)}%
            </text>
          ))}
          <text x={(M.left + W - M.right) / 2} y={H - 6} textAnchor="middle" className="axis-label">
            제거한 공항 비율
          </text>
          <text
            transform={`translate(14 ${(M.top + H - M.bottom) / 2}) rotate(-90)`}
            textAnchor="middle"
            className="axis-label"
          >
            최대 연결 요소 크기 (원래 대비)
          </text>
          <line x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} className="axis" />

          {paths.map((p) => (
            <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {endLabels.map((l) => (
            <text key={l.key} x={W - M.right + 8} y={l.y} dy="0.35em" className="direct-label">
              {l.text}
            </text>
          ))}

          {current && current.x > 0 && current.x <= xMax && (
            <g>
              <circle cx={x(current.x)} cy={y(current.y)} r={6} fill="#ffffff" stroke="#0b1226" strokeWidth={2} />
              <text x={x(current.x) + 10} y={y(current.y) - 10} className="direct-label strong">
                {current.label}
              </text>
            </g>
          )}

          {hoverIdx !== null && (
            <g>
              <line x1={x(xs[hoverIdx])} x2={x(xs[hoverIdx])} y1={M.top} y2={H - M.bottom} className="crosshair" />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={x(xs[hoverIdx])}
                  cy={y(collapse[s.key][hoverIdx])}
                  r={4.5}
                  fill={s.color}
                  stroke="#0b1226"
                  strokeWidth={2}
                />
              ))}
              <foreignObject
                x={Math.min(x(xs[hoverIdx]) + 12, W - M.right - 190)}
                y={M.top}
                width={190}
                height={110}
              >
                <div className="chart-tip">
                  <div className="tip-title">공항 {(xs[hoverIdx] * 100).toFixed(1)}% 제거</div>
                  {SERIES.map((s) => (
                    <div key={s.key} className="tip-row">
                      <i style={{ background: s.color }} />
                      <span>{s.key === 'random' ? '무작위' : s.key === 'betweenness' ? '허브 우선' : '연결 수 순'}</span>
                      <b>{(collapse[s.key as SeriesKey][hoverIdx] * 100).toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
              </foreignObject>
            </g>
          )}
        </svg>
      )}
    </figure>
  )
}
