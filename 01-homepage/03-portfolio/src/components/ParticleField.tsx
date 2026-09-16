import { useEffect, useRef } from 'react'
import styles from './ParticleField.module.css'

interface Particle {
  x: number
  y: number
  /** 한 변의 길이 (px). 앞쪽 입자일수록 크다. */
  size: number
  /** 앞쪽 입자일수록 진하다. */
  alpha: number
  /** 왼쪽으로 흐르는 속도 (px/초). 앞쪽 입자일수록 빠르다. */
  speed: number
  /** 커서를 따라가는 비율. 앞쪽 입자일수록 많이 따라간다. */
  follow: number
}

/** 화면 넓이 12,000px²당 입자 1개. */
const PARTICLE_DENSITY = 1 / 12000
const MAX_PARTICLES = 360

/**
 * 깊이(depth)는 0(가장 뒤) ~ 1(가장 앞) 이다.
 * 크기 · 농도 · 속도 · 이동폭을 모두 이 값에 연동해서
 * 작고 옅은 점은 멀리, 크고 진한 점은 가까이 있는 것처럼 보이게 한다.
 */
const MIN_ALPHA = 0.28
const MAX_ALPHA = 0.85

/** 커서가 없을 때 모든 입자가 왼쪽으로 흐르는 속도 (px/초) */
const MIN_DRIFT_SPEED = 4
const MAX_DRIFT_SPEED = 20

/** 커서를 따라 이동하는 비율. 화면 절반만큼 커서가 움직이면 이 비율만큼 따라간다. */
const FOLLOW_STRENGTH = 0.22
/** 따라오는 데 걸리는 시간 상수(초). 작을수록 민첩하게 붙는다. */
const FOLLOW_EASE_TIME = 0.45

/** 깊이에 따른 이동폭 배율. 뒤쪽 입자는 거의 움직이지 않는다. */
const MIN_FOLLOW_RATIO = 0.25
const MAX_FOLLOW_RATIO = 1

/** 커서가 멈춰 있을 때의 그리기 간격(ms). 흐름이 끊겨 보이지 않을 정도. */
const IDLE_FRAME_INTERVAL = 33

/** 화면 밖으로 이만큼 나가면 반대편에서 다시 들어온다. */
const WRAP_MARGIN = 4

/** 이 값보다 남은 이동량이 작으면 다 따라온 것으로 보고 절전 모드로 돌아간다. */
const SETTLED_THRESHOLD = 0.3

const lerp = (from: number, to: number, t: number) => from + (to - from) * t

interface ParticleFieldProps {
  /** 다른 화면에 가려져 보이지 않는 동안 true. 그리기를 멈춘다. */
  paused?: boolean
}

/**
 * 배경에 떠다니는 작은 사각형 입자.
 *
 * - 커서가 없으면 모든 입자가 다 같이 왼쪽으로 흐른다.
 * - 커서가 움직이면 입자들이 커서 쪽으로 따라 이동한다.
 * - 앞쪽(크고 진한) 입자일수록 빠르게 흐르고 많이 따라가서 깊이감이 생긴다.
 * - 콘텐츠 뒤(z-index 0)에 고정으로 깔리고 포인터 이벤트를 가로채지 않는다.
 * - prefers-reduced-motion 이면 움직임 없이 한 번만 그린다.
 * - 탭이 백그라운드로 가거나 `paused` 면 그리기를 멈춘다.
 *   (섹션 패널이 올라와 있는 동안은 가려져 있으므로 그릴 이유가 없다.)
 */
export function ParticleField({ paused = false }: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /** 멈춤 여부는 ref 로 본다. 값이 바뀔 때마다 입자를 다시 만들지 않기 위해서다. */
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  /** 바깥에서 멈추고 다시 돌리기 위한 손잡이 */
  const controlsRef = useRef<{ start: () => void; stop: () => void } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    let particles: Particle[] = []
    let width = 0
    let height = 0
    /** 크게 따라 이동해도 가장자리가 비지 않도록 화면 밖까지 입자를 깔아둔다. */
    let paddingX = 0
    let paddingY = 0

    let frameId = 0
    let lastFrameTime = 0
    let forceFrame = false

    const pointer = { x: 0, y: 0, active: false }
    /** 현재 적용 중인 이동량. 목표값을 향해 따라간다. */
    let followX = 0
    let followY = 0
    /** 목표까지 남은 거리. 0에 가까우면 절전 모드로 돌아간다. */
    let remaining = 0

    const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

    const createParticles = () => {
      const fieldWidth = width + paddingX * 2
      const fieldHeight = height + paddingY * 2
      const count = Math.min(
        MAX_PARTICLES,
        Math.round(fieldWidth * fieldHeight * PARTICLE_DENSITY),
      )

      particles = Array.from({ length: count }, () => {
        // 0 = 가장 뒤, 1 = 가장 앞. 대부분은 뒤쪽 작은 점이다.
        const depth = Math.random()
        const size = depth < 0.68 ? 1 : depth < 0.94 ? 2 : 3

        return {
          x: randomBetween(-paddingX, width + paddingX),
          y: randomBetween(-paddingY, height + paddingY),
          size,
          alpha: lerp(MIN_ALPHA, MAX_ALPHA, depth),
          speed: lerp(MIN_DRIFT_SPEED, MAX_DRIFT_SPEED, depth),
          follow: lerp(MIN_FOLLOW_RATIO, MAX_FOLLOW_RATIO, depth),
        }
      })
    }

    const update = (delta: number) => {
      // 프레임 간격이 달라져도 같은 속도로 따라오도록 지수 감쇠를 쓴다.
      const smoothing = 1 - Math.exp(-delta / FOLLOW_EASE_TIME)

      // 화면 중앙을 기준으로 커서 쪽으로 이동한다. (같은 방향 = 따라감)
      const targetX = pointer.active ? (pointer.x - width / 2) * FOLLOW_STRENGTH : 0
      const targetY = pointer.active ? (pointer.y - height / 2) * FOLLOW_STRENGTH : 0

      followX += (targetX - followX) * smoothing
      followY += (targetY - followY) * smoothing

      remaining = Math.abs(targetX - followX) + Math.abs(targetY - followY)

      const leftEdge = -paddingX - WRAP_MARGIN
      const rightEdge = width + paddingX + WRAP_MARGIN

      for (const particle of particles) {
        // 커서가 없어도 모두 왼쪽으로 흐른다.
        particle.x -= particle.speed * delta
        if (particle.x < leftEdge) particle.x = rightEdge
      }
    }

    const draw = () => {
      context.clearRect(0, 0, width, height)
      for (const particle of particles) {
        context.fillStyle = `rgba(28, 28, 24, ${particle.alpha})`
        // 정수 좌표에 그려야 1px 사각형이 흐려지지 않는다.
        context.fillRect(
          Math.round(particle.x + followX * particle.follow),
          Math.round(particle.y + followY * particle.follow),
          particle.size,
          particle.size,
        )
      }
    }

    const resize = () => {
      const nextWidth = window.innerWidth
      const nextHeight = window.innerHeight

      // 모바일 주소창이 접히는 정도의 높이 변화로는 입자를 다시 만들지 않는다.
      const shouldRebuild =
        particles.length === 0 || nextWidth !== width || Math.abs(nextHeight - height) > 120

      width = nextWidth
      height = nextHeight
      // 가장 앞쪽 입자가 움직이는 최대 거리만큼은 화면 밖에도 입자가 있어야 한다.
      paddingX = (width / 2) * FOLLOW_STRENGTH * MAX_FOLLOW_RATIO + WRAP_MARGIN
      paddingY = (height / 2) * FOLLOW_STRENGTH * MAX_FOLLOW_RATIO + WRAP_MARGIN

      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)

      if (shouldRebuild) createParticles()
      draw()
    }

    const step = (time: number) => {
      frameId = window.requestAnimationFrame(step)

      // 커서를 따라가는 동안에는 매 프레임 그리고, 다 따라오면 간격을 벌린다.
      const busy = forceFrame || remaining > SETTLED_THRESHOLD
      const elapsed = time - lastFrameTime
      if (!busy && elapsed < IDLE_FRAME_INTERVAL) return

      forceFrame = false
      lastFrameTime = time

      // 탭을 다시 열었을 때 한 번에 튀지 않도록 상한을 둔다.
      const delta = Math.min(elapsed / 1000, 0.1)

      update(delta)
      draw()
    }

    const stop = () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
        frameId = 0
      }
    }

    const start = () => {
      // 움직임을 원하지 않는 사용자에게는 멈춰 있는 배경만 보여준다. (PRD 16절)
      if (motionQuery.matches || document.hidden || pausedRef.current || frameId !== 0) return
      lastFrameTime = performance.now()
      frameId = window.requestAnimationFrame(step)
    }

    const handlePointerMove = (event: PointerEvent) => {
      // 터치는 hover 개념이 없어 반응시키지 않는다.
      if (motionQuery.matches || event.pointerType === 'touch') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
      forceFrame = true
      start()
    }

    // 커서가 창을 벗어나면 원래 자리로 돌아온다.
    const handlePointerLeave = () => {
      pointer.active = false
      forceFrame = true
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stop()
      else start()
    }

    const handleMotionChange = () => {
      stop()

      if (motionQuery.matches) {
        pointer.active = false
        followX = 0
        followY = 0
        remaining = 0
        draw()
        return
      }

      start()
    }

    controlsRef.current = { start, stop }

    resize()
    start()

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('blur', handlePointerLeave)
    document.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    motionQuery.addEventListener('change', handleMotionChange)

    return () => {
      controlsRef.current = null
      stop()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('blur', handlePointerLeave)
      document.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      motionQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  // 가려져 있는 동안에는 프레임을 아예 돌리지 않는다.
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    if (paused) controls.stop()
    else controls.start()
  }, [paused])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
