/** 그래프 계산 전용 Web Worker — 메인 스레드(렌더링)를 막지 않도록 분리 */
import type { WorkerRequest, WorkerResponse } from '../types.ts'
import { GraphEngine } from './engine.ts'

let engine: GraphEngine | null = null

const reply = (msg: WorkerResponse) => self.postMessage(msg)

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    switch (msg.type) {
      case 'init':
        engine = new GraphEngine(msg.n, msg.routes, msg.country)
        reply({ type: 'ready', id: msg.id })
        break
      case 'analyze':
        if (!engine) throw new Error('engine not initialized')
        reply({ type: 'analysis', id: msg.id, result: engine.analyze(msg.closed, msg.domesticOnly) })
        break
      case 'route':
        if (!engine) throw new Error('engine not initialized')
        reply({
          type: 'route',
          id: msg.id,
          result: engine.routeCompare(msg.from, msg.to, msg.closed, msg.domesticOnly),
        })
        break
    }
  } catch (err) {
    reply({ type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) })
  }
}
