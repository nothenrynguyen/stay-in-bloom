import { useEffect, useState, useRef } from 'react'

// Generates semi-random positions with natural spacing
function generatePositions(count, containerWidth, containerHeight, flowerSize) {
  const positions = []
  const padding = flowerSize / 2
  const minDist = flowerSize * 0.8

  for (let i = 0; i < count; i++) {
    let attempts = 0
    let placed = false

    while (attempts < 60 && !placed) {
      const x = padding + Math.random() * (containerWidth - flowerSize - padding)
      const y = padding + Math.random() * (containerHeight - flowerSize - padding)

      const tooClose = positions.some(
        (p) => Math.hypot(p.x - x, p.y - y) < minDist
      )

      if (!tooClose) {
        // Add slight rotation and scale variation for natural feel
        const rotation = (Math.random() - 0.5) * 20 // -10 to +10 degrees
        const scale = 0.85 + Math.random() * 0.3 // 0.85 to 1.15
        positions.push({ x, y, rotation, scale })
        placed = true
      }
      attempts++
    }

    // If we can't find a non-overlapping spot, place it anyway
    if (!placed) {
      const x = padding + Math.random() * (containerWidth - flowerSize - padding)
      const y = padding + Math.random() * (containerHeight - flowerSize - padding)
      positions.push({ x, y, rotation: (Math.random() - 0.5) * 20, scale: 0.9 + Math.random() * 0.2 })
    }
  }

  return positions
}

export default function Garden({ flowers }) {
  const containerRef = useRef(null)
  const [positions, setPositions] = useState([])
  const [containerSize, setContainerSize] = useState({ w: window.innerWidth, h: window.innerHeight })
  const [tooltip, setTooltip] = useState(null)

  useEffect(() => {
    const updateSize = () => {
      setContainerSize({ w: window.innerWidth, h: window.innerHeight })
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (flowers.length > 0) {
      const sorted = [...flowers].sort((a, b) => a.id.localeCompare(b.id))
      const flowerSize = Math.max(50, Math.min(90, containerSize.w / 12))
      // Keep flowers away from header (top 12%) and bottom button (bottom 12%)
      const usableHeight = containerSize.h * 0.76
      const topOffset = containerSize.h * 0.14
      const pos = generatePositions(sorted.length, containerSize.w, usableHeight, flowerSize)
      // Shift all positions down by topOffset
      const shifted = pos.map(p => ({ ...p, y: p.y + topOffset }))
      setPositions(shifted)
    }
  }, [flowers, containerSize])

  const flowerSize = Math.max(50, Math.min(90, containerSize.w / 12))

  return (
    <div className="garden-container" ref={containerRef}>
      {flowers.length === 0 && (
        <p className="garden-empty">
          No flowers blooming yet — draw the first one below!
        </p>
      )}
      {flowers.map((flower, i) => {
        const pos = positions[i]
        if (!pos) return null
        // Pseudo-random bloom timing per flower
        const bloomDelay = 0.5 // all start at 0.5s
        const bloomDuration = 1 + ((i * 6271 + 3) % 673) / 673 // 1 to 2s
        return (
          <div
            key={flower.id}
            className="garden-flower"
            style={{
              left: pos.x,
              top: pos.y,
              width: flowerSize,
              height: flowerSize,
              transform: `rotate(${pos.rotation}deg) scale(${pos.scale})`,
              '--flower-scale': pos.scale,
              '--flower-rot': `${pos.rotation}deg`,
              animationDelay: `${bloomDelay}s`,
              animationDuration: `${bloomDuration}s`,
            }}
            onMouseEnter={() =>
              flower.message && setTooltip({ id: flower.id, text: flower.message })
            }
            onMouseLeave={() => setTooltip(null)}
            onTouchStart={(e) => {
              if (!flower.message) return
              e.stopPropagation()
              setTooltip((prev) =>
                prev?.id === flower.id ? null : { id: flower.id, text: flower.message }
              )
            }}
          >
            <img
              src={flower.image_url}
              alt="A hand-drawn flower"
              draggable={false}
            />
            {tooltip?.id === flower.id && (
              <div className="flower-tooltip">{tooltip.text}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
