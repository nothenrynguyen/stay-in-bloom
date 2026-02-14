import { useEffect, useState, useRef } from 'react'

/**
 * Slot-machine style rolling number.
 * Each digit column scrolls from 0→target independently.
 */
export default function RollingNumber({ value, delay = 0.3 }) {
  const [visible, setVisible] = useState(false)
  const digits = String(value).split('')

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 1000)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) {
    // Reserve space with invisible digits so layout doesn't shift
    return (
      <span className="rolling-number">
        {digits.map((_, i) => (
          <span key={i} className="rolling-digit-wrapper">
            <span className="rolling-digit-col" style={{ opacity: 0 }}>0</span>
          </span>
        ))}
      </span>
    )
  }

  return (
    <span className="rolling-number">
      {digits.map((d, i) => (
        <RollingDigit key={i} digit={Number(d)} index={i} total={digits.length} />
      ))}
    </span>
  )
}

function RollingDigit({ digit, index, total }) {
  // Stagger each digit slightly — leftmost digit lands last for drama
  const duration = 0.6 + index * 0.12
  const stagger = (total - 1 - index) * 0.08

  // We scroll through a few full 0-9 cycles + land on target digit
  const cycles = 2
  const totalStops = cycles * 10 + digit

  return (
    <span className="rolling-digit-wrapper">
      <span
        className="rolling-digit-col"
        style={{
          '--target': totalStops,
          '--duration': `${duration}s`,
          '--stagger': `${stagger}s`,
        }}
      >
        {/* Render enough digits to scroll through cycles + target */}
        {Array.from({ length: totalStops + 1 }, (_, i) => (
          <span className="rolling-digit" key={i}>
            {i % 10}
          </span>
        ))}
      </span>
    </span>
  )
}
