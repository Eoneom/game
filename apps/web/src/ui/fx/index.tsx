import React, { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
}

export const FxLayer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let particles: Particle[] = []
    let visible = !document.hidden

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const spawnAmbient = () => {
      if (particles.length > 40) return
      particles.push({
        x: Math.random() * canvas.width,
        y: canvas.height * (0.4 + Math.random() * 0.6),
        vx: (Math.random() - 0.3) * 0.15,
        vy: -0.05 - Math.random() * 0.12,
        life: 0,
        max: 200 + Math.random() * 200,
        size: 1 + Math.random() * 1.5,
      })
    }

    const onBurst = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: number; y?: number }>).detail ?? {}
      const x = detail.x ?? canvas.width * 0.5
      const y = detail.y ?? canvas.height * 0.5
      for (let i = 0; i < 18; i++) {
        const a = Math.random() * Math.PI * 2
        const s = 0.8 + Math.random() * 2
        particles.push({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: 0,
          max: 40 + Math.random() * 30,
          size: 1.5 + Math.random() * 2,
        })
      }
    }
    window.addEventListener('eoneom:fx-burst', onBurst)

    const onVisibility = () => {
      visible = !document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)

    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      if (Math.random() < 0.08) spawnAmbient()
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles = particles.filter(p => p.life < p.max)
      for (const p of particles) {
        p.life += 1
        p.x += p.vx
        p.y += p.vy
        const alpha = 1 - p.life / p.max
        ctx.fillStyle = `rgba(232, 197, 71, ${alpha * 0.5})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('eoneom:fx-burst', onBurst)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fx-layer pointer-events-none fixed inset-0 z-[60] opacity-70 motion-reduce:hidden"
      aria-hidden
    />
  )
}

export const triggerFxBurst = (x?: number, y?: number) => {
  window.dispatchEvent(
    new CustomEvent('eoneom:fx-burst', { detail: { x, y } })
  )
}
