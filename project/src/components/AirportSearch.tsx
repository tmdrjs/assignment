import { useEffect, useId, useRef, useState } from 'react'
import { searchAirports } from '../data/search.ts'
import { useSim } from '../sim/store.ts'
import type { Airport } from '../types.ts'

interface Props {
  placeholder: string
  /** 선택된 공항 (표시용) */
  value: number | null
  onPick(i: number): void
  onClear?(): void
  autoFocus?: boolean
  compact?: boolean
}

/** IATA·도시·공항명·국가 검색 자동완성 (F2) */
export function AirportSearch({ placeholder, value, onPick, onClear, compact }: Props) {
  const net = useSim((s) => s.net)
  const closed = useSim((s) => s.closed)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const listId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const results: Airport[] = net && q ? searchAirports(net, q, 8) : []

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (a: Airport) => {
    onPick(a.i)
    setQ('')
    setOpen(false)
  }

  const selectedAirport = value !== null && net ? net.airports[value] : null

  return (
    <div className={`search ${compact ? 'search-compact' : ''}`} ref={boxRef}>
      {selectedAirport && !open ? (
        <button type="button" className="search-value" onClick={() => setOpen(true)} title="다른 공항 선택">
          <span className="iata">{selectedAirport.iata}</span>
          <span className="city">
            {selectedAirport.city}
            <small>{net?.countries[selectedAirport.country]?.ko}</small>
          </span>
          {onClear && (
            <span
              role="button"
              tabIndex={0}
              className="clear"
              aria-label="선택 해제"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation()
                  onClear()
                }
              }}
            >
              ×
            </span>
          )}
        </button>
      ) : (
        <input
          type="search"
          value={q}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && results.length > 0}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
            setCursor(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor((c) => Math.min(c + 1, results.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor((c) => Math.max(c - 1, 0))
            } else if (e.key === 'Enter' && results[cursor]) {
              e.preventDefault()
              pick(results[cursor])
            } else if (e.key === 'Escape') setOpen(false)
          }}
        />
      )}
      {open && results.length > 0 && (
        <ul className="search-list" id={listId} role="listbox">
          {results.map((a, idx) => (
            <li
              key={a.i}
              role="option"
              aria-selected={idx === cursor}
              className={`${idx === cursor ? 'active' : ''} ${closed.has(a.i) ? 'is-closed' : ''}`}
              onMouseEnter={() => setCursor(idx)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(a)
              }}
            >
              <span className="iata">{a.iata}</span>
              <span className="city">
                {a.city}
                <small>
                  {a.name} · {net?.countries[a.country]?.ko}
                </small>
              </span>
              <span className="meta">{closed.has(a.i) ? '폐쇄' : `직항 ${a.deg}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
