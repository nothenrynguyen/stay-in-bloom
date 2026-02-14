import { useRef, useState, useEffect, useCallback } from 'react'

const COLORS = [
  { hex: '#e74c3c', name: 'Red' },
  { hex: '#f06292', name: 'Pink' },
  { hex: '#e91e8a', name: 'Hot pink' },
  { hex: '#e67e22', name: 'Orange' },
  { hex: '#f1c40f', name: 'Yellow' },
  { hex: '#a0d468', name: 'Lime' },
  { hex: '#9b59b6', name: 'Purple' },
  { hex: '#7c4dff', name: 'Violet' },
  { hex: '#3498db', name: 'Blue' },
  { hex: '#00bcd4', name: 'Cyan' },
  { hex: '#1abc9c', name: 'Teal' },
  { hex: '#2ecc71', name: 'Green' },
  { hex: '#2c3e50', name: 'Dark' },
  { hex: '#bdc3c7', name: 'Light gray' },
]

const CANVAS_SIZE = 400

// ── Shared drawing helpers (no duplication) ──

function drawBrushStroke(ctx, from, to, size, strokeColor) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(Math.floor(dist / 2), 1)

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = from.x + (to.x - from.x) * t
    const y = from.y + (to.y - from.y) * t

    ctx.globalAlpha = 0.7
    ctx.fillStyle = strokeColor
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()

    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.arc(x, y, size / 1.4, 0, Math.PI * 2)
    ctx.fill()

    for (let j = 0; j < 3; j++) {
      const ox = (Math.random() - 0.5) * size * 0.8
      const oy = (Math.random() - 0.5) * size * 0.8
      ctx.globalAlpha = 0.15
      ctx.beginPath()
      ctx.arc(x + ox, y + oy, size * 0.15, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1.0
}

function eraseStroke(ctx, from, to, size) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y)
  const steps = Math.max(Math.floor(dist / 2), 1)
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = from.x + (to.x - from.x) * t
    const y = from.y + (to.y - from.y) * t
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

export default function DrawingCanvas({ onSubmit, submitting }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [brushSize, setBrushSize] = useState(8)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [erasing, setErasing] = useState(false)
  const lastPoint = useRef(null)

  // Keep frequently-changing values in refs so useCallback deps stay stable
  const colorRef = useRef(color.hex)
  const brushSizeRef = useRef(brushSize)
  const erasingRef = useRef(erasing)
  const isDrawingRef = useRef(isDrawing)

  useEffect(() => { colorRef.current = color.hex }, [color])
  useEffect(() => { brushSizeRef.current = brushSize }, [brushSize])
  useEffect(() => { erasingRef.current = erasing }, [erasing])
  useEffect(() => { isDrawingRef.current = isDrawing }, [isDrawing])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  }, [])

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = CANVAS_SIZE / rect.width
    const scaleY = CANVAS_SIZE / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    lastPoint.current = pos
    const ctx = canvasRef.current.getContext('2d')
    if (erasingRef.current) {
      eraseStroke(ctx, pos, pos, brushSizeRef.current)
    } else {
      drawBrushStroke(ctx, pos, pos, brushSizeRef.current, colorRef.current)
    }
  }, [getPos])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawingRef.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    const from = lastPoint.current || pos
    if (erasingRef.current) {
      eraseStroke(ctx, from, pos, brushSizeRef.current)
    } else {
      drawBrushStroke(ctx, from, pos, brushSizeRef.current, colorRef.current)
    }
    lastPoint.current = pos
  }, [getPos])

  const stopDrawing = useCallback((e) => {
    if (e) e.preventDefault()
    setIsDrawing(false)
    lastPoint.current = null
  }, [])

  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    setHasDrawn(false)
    setErasing(false)
  }

  const handleSubmit = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onSubmit(dataUrl)
  }

  return (
    <div className="drawing-canvas-container">
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="drawing-canvas"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <span className="canvas-placeholder">draw here</span>
        )}
      </div>

      <div className="color-palette" role="radiogroup" aria-label="Brush color">
        {COLORS.map((c) => (
          <button
            key={c.hex}
            className={`color-swatch ${color.hex === c.hex && !erasing ? 'active' : ''}`}
            style={{ backgroundColor: c.hex }}
            onClick={() => { setColor(c); setErasing(false) }}
            role="radio"
            aria-checked={color.hex === c.hex && !erasing}
            aria-label={c.name}
          />
        ))}
      </div>

      <div className="brush-size-control">
        <span className="brush-label">thin</span>
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          aria-label="Brush size"
        />
        <span className="brush-label">thick</span>
      </div>

      <div className="canvas-actions">
        <button
          className={`btn btn-sm ${erasing ? 'btn-eraser-active' : 'btn-outline'}`}
          onClick={() => setErasing(!erasing)}
        >
          {erasing ? 'eraser on' : 'eraser'}
        </button>
        <button className="btn btn-outline btn-sm" onClick={clearCanvas}>
          clear
        </button>
        <button
          className="btn btn-plant btn-sm"
          onClick={handleSubmit}
          disabled={!hasDrawn || submitting}
        >
          {submitting ? 'planting...' : 'plant!'}
        </button>
      </div>
    </div>
  )
}
