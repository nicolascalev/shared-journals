'use client'

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  rotation: number
  rotationSpeed: number
  color: string
  life: number
}

const COLORS = ['#22c55e', '#eab308', '#f97316', '#38bdf8', '#a78bfa', '#f43f5e', '#f8fafc']

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function celebrateEntry() {
  if (typeof window === 'undefined' || prefersReducedMotion()) return

  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:80'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const resize = () => {
    canvas.width = Math.floor(window.innerWidth * dpr)
    canvas.height = Math.floor(window.innerHeight * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const particles: Particle[] = []
  const spawn = (originX: number, originY: number, count: number, angleSpread: number, baseAngle: number) => {
    for (let i = 0; i < count; i++) {
      const angle = ((baseAngle + (Math.random() - 0.5) * angleSpread) * Math.PI) / 180
      const speed = 8 + Math.random() * 12
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (4 + Math.random() * 6),
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
        life: 1,
      })
    }
  }

  const width = window.innerWidth
  const height = window.innerHeight
  spawn(width * 0.5, height * 0.72, 55, 70, -90)
  window.setTimeout(() => spawn(width * 0.08, height * 0.78, 35, 55, -50), 120)
  window.setTimeout(() => spawn(width * 0.92, height * 0.78, 35, 55, -130), 120)

  const gravity = 0.28
  const drag = 0.99
  let frame = 0

  const tick = () => {
    frame += 1
    ctx.clearRect(0, 0, width, height)

    for (const p of particles) {
      p.vx *= drag
      p.vy = p.vy * drag + gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.life -= 0.012

      if (p.life <= 0) continue

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.globalAlpha = Math.max(p.life, 0)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    const alive = particles.some((p) => p.life > 0)
    if (alive && frame < 180) {
      requestAnimationFrame(tick)
      return
    }

    canvas.remove()
  }

  requestAnimationFrame(tick)
}
