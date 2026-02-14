import { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react'

// ── Seeded PRNG (mulberry32) — deterministic per flower ID ──
function createRng(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Turn a UUID string into a 32-bit integer seed
function uuidToSeed(uuid) {
  let h = 0
  for (let i = 0; i < uuid.length; i++) {
    h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0
  }
  return h
}

// Generates deterministic positions seeded by flower IDs
function generatePositions(flowers, containerWidth, containerHeight, flowerSize) {
  const positions = []
  const padding = flowerSize / 2
  const minDist = flowerSize * 0.8

  for (const flower of flowers) {
    const rng = createRng(uuidToSeed(flower.id))
    let attempts = 0
    let placed = false

    while (attempts < 60 && !placed) {
      const x = padding + rng() * (containerWidth - flowerSize - padding)
      const y = padding + rng() * (containerHeight - flowerSize - padding)

      const tooClose = positions.some(
        (p) => Math.hypot(p.x - x, p.y - y) < minDist
      )

      if (!tooClose) {
        const rotation = (rng() - 0.5) * 20 // -10 to +10 degrees
        const scale = 0.85 + rng() * 0.3 // 0.85 to 1.15
        positions.push({ x, y, rotation, scale })
        placed = true
      }
      attempts++
    }

    // If we can't find a non-overlapping spot, place it anyway
    if (!placed) {
      const x = padding + rng() * (containerWidth - flowerSize - padding)
      const y = padding + rng() * (containerHeight - flowerSize - padding)
      positions.push({ x, y, rotation: (rng() - 0.5) * 20, scale: 0.9 + rng() * 0.2 })
    }
  }

  return positions
}

// ── Memoized individual flower — only re-renders when its own props change ──
const GardenFlower = memo(function GardenFlower({
  flower, pos, size, index, isTooltipVisible, onShowTooltip, onHideTooltip, onToggleTooltip,
}) {
  // Random bloom delay within 0–1s, seeded by flower ID for consistency
  const rng = createRng(uuidToSeed(flower.id))
  const bloomDelay = rng() * 1
  const bloomDuration = 0.45

  return (
    <div
      className="garden-flower"
      style={{
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        '--flower-scale': pos.scale,
        '--flower-rot': `${pos.rotation}deg`,
        animationDelay: `${bloomDelay}s`,
        animationDuration: `${bloomDuration}s`,
      }}
      onMouseEnter={() => {
        if ('ontouchstart' in window) return
        flower.message && onShowTooltip(flower.id)
      }}
      onMouseLeave={() => {
        if ('ontouchstart' in window) return
        onHideTooltip()
      }}
      onClick={(e) => {
        if (!flower.message) return
        e.stopPropagation()
        onToggleTooltip(flower.id)
      }}
    >
      <img
        src={flower.image_url}
        alt={flower.message ? `Flower: ${flower.message}` : 'A hand-drawn flower'}
        draggable={false}
        loading="lazy"
      />
      {isTooltipVisible && (
        <div className="flower-tooltip">{flower.message}</div>
      )}
    </div>
  )
})

export default function Garden({ flowers }) {
  const containerRef = useRef(null)
  const [containerSize, setContainerSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [tooltipId, setTooltipId] = useState(null)

  useEffect(() => {
    const updateSize = () => {
      setContainerSize({ w: window.innerWidth, h: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  const positions = useMemo(() => {
    if (flowers.length === 0) return []
    const sorted = [...flowers].sort((a, b) => a.id.localeCompare(b.id))
    const flowerSz = Math.max(50, Math.min(90, containerSize.w / 12))
    // Keep flowers away from header (top 14%) and bottom button (bottom 10%)
    const usableHeight = containerSize.h * 0.76
    const topOffset = containerSize.h * 0.14
    const pos = generatePositions(sorted, containerSize.w, usableHeight, flowerSz)
    return pos.map((p) => ({ ...p, y: p.y + topOffset }))
  }, [flowers, containerSize])

  const flowerSize = Math.max(50, Math.min(90, containerSize.w / 12))

  // Stable callbacks so memoized children don't re-render on every tooltip change
  const handleShow = useCallback((id) => setTooltipId(id), [])
  const handleHide = useCallback(() => setTooltipId(null), [])
  const handleToggle = useCallback(
    (id) => setTooltipId((prev) => (prev === id ? null : id)),
    []
  )

  return (
    <div className="garden-container" ref={containerRef} onClick={() => setTooltipId(null)}>
      {flowers.length === 0 && (
        <p className="garden-empty">
          No flowers blooming yet — draw the first one below!
        </p>
      )}
      {flowers.map((flower, i) => {
        const pos = positions[i]
        if (!pos) return null
        return (
          <GardenFlower
            key={flower.id}
            flower={flower}
            pos={pos}
            size={flowerSize}
            index={i}
            isTooltipVisible={tooltipId === flower.id}
            onShowTooltip={handleShow}
            onHideTooltip={handleHide}
            onToggleTooltip={handleToggle}
          />
        )
      })}
    </div>
  )
}
