/** 워커 RPC 클라이언트 — 요청 id 로 응답을 매칭하는 Promise 래퍼 */
import type { Analysis, Network, RouteCompare, WorkerRequest, WorkerResponse } from '../types.ts'

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void }

export class GraphClient {
  private readonly worker: Worker
  private seq = 0
  private readonly pending = new Map<number, Pending>()

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
    this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data
      const p = this.pending.get(msg.id)
      if (!p) return
      this.pending.delete(msg.id)
      if (msg.type === 'error') p.reject(new Error(msg.message))
      else if (msg.type === 'ready') p.resolve(undefined)
      else p.resolve(msg.result)
    }
    this.worker.onerror = (e) => {
      for (const p of this.pending.values()) p.reject(new Error(e.message))
      this.pending.clear()
    }
  }

  private call<T>(build: (id: number) => WorkerRequest): Promise<T> {
    const id = ++this.seq
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject })
      this.worker.postMessage(build(id))
    })
  }

  init(net: Network): Promise<void> {
    return this.call<void>((id) => ({
      type: 'init',
      id,
      n: net.airports.length,
      routes: net.routes,
      country: net.airports.map((a) => a.country),
    }))
  }

  analyze(closed: number[], domesticOnly: boolean): Promise<Analysis> {
    return this.call<Analysis>((id) => ({ type: 'analyze', id, closed, domesticOnly }))
  }

  route(from: number, to: number, closed: number[], domesticOnly: boolean): Promise<RouteCompare> {
    return this.call<RouteCompare>((id) => ({ type: 'route', id, from, to, closed, domesticOnly }))
  }

  dispose(): void {
    this.worker.terminate()
  }
}
