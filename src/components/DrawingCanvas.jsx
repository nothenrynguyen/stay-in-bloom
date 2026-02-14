import { useRef, useState, useEffect, useCallback } from 'react'

const COLORS = [
  '#e74c3c', // red
  '#f06292', // pink
  '#e91e8a', // hot pink
  '#e67e22', // orange
  '#f1c40f', // yellow
  '#a0d468', // lime
  '#9b59b6', // purple
  '#7c4dff', // violet
  '#3498db', // blue
  '#00bcd4', // cyan
  '#1abc9c', // teal
  '#2ecc71', // green
  '#2c3e50', // dark
  '#bdc3c7', // light gray
]

const CANVAS_SIZE = 400

export default function DrawingCanvas({ onSubmit, submitting }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [brushSize, setBrushSize] = useState(8)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [erasing, setErasing] = useState(false)
  const lastPoint = useRef(null)

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

  const drawBrushStroke = useCallback((ctx, from, to, size, strokeColor) => {
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
  }, [])

  const startDrawing = useCallback((e) => {
    e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    const pos = getPos(e)
    lastPoint.current = pos
    const ctx = canvasRef.current.getContext('2d')
    if (erasing) {
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    } else {
      drawBrushStroke(ctx, pos, pos, brushSize, color)
    }
  }, [getPos, brushSize, color, drawBrushStroke, erasing])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing) return
    const pos = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    if (erasing) {
      const from = lastPoint.current || pos
      const dist = Math.hypot(pos.x - from.x, pos.y - from.y)
      const steps = Math.max(Math.floor(dist / 2), 1)
      ctx.save()
      ctx.globalCompositeOperation = 'destination-out'
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = from.x + (pos.x - from.x) * t
        const y = from.y + (pos.y - from.y) * t
        ctx.beginPath()
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    } else if (lastPoint.current) {
      drawBrushStroke(ctx, lastPoint.current, pos, brushSize, color)
    }
    lastPoint.current = pos
  }, [isDrawing, getPos, brushSize, color, drawBrushStroke, erasing])

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

      <div className="color-palette">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`color-swatch ${color === c && !erasing ? 'active' : ''}`}
            style={{ backgroundColor: c }}
            onClick={() => { setColor(c); setErasing(false) }}
            aria-label={`Select color ${c}`}
          />
        ))}
      </div>

      <div className="tool-row">
        <button
          className={`btn btn-sm ${erasing ? 'btn-eraser-active' : 'btn-outline'}`}
          onClick={() => setErasing(!erasing)}
        >
          {erasing ? '✏️ eraser on' : '🧹 eraser'}
        </button>
      </div>

      <div className="brush-size-control">
        <span className="brush-label">thin</span>
        <input
          type="range"
          min="2"
          max="30"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
        />
        <span className="brush-label">thick</span>
      </div>

      <div className="canvas-actions">
        <button className="btn btn-outline" onClick={clearCanvas}>
          Clear
        </button>
        <button
          className="btn btn-plant"
          onClick={handleSubmit}
          disabled={!hasDrawn || submitting}
        >
          {submitting ? 'Planting...' : 'Plant It'}
        </button>
      </div>
    </div>
  )
}
