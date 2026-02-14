/**
 * Pixel-art conifer tree drawn with SVG.
 * Inspired by classic RPG tileset trees — stacked canopy layers
 * with a small trunk. Renders crisp at any size via image-rendering.
 */
export default function PixelTree({ size = 80, style = {}, className = '' }) {
  // Tree proportions (on a 16×24 grid)
  return (
    <svg
      width={size}
      height={size * 1.5}
      viewBox="0 0 16 24"
      className={`pixel-tree ${className}`}
      style={{ imageRendering: 'pixelated', ...style }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow on ground */}
      <ellipse cx="8" cy="22" rx="5" ry="1.3" fill="#3a7a52" opacity="0.4" />

      {/* Trunk */}
      <rect x="7" y="18" width="2" height="4" fill="#7a5c44" />
      <rect x="6" y="19" width="1" height="2" fill="#8b6b50" />

      {/* Bottom canopy (widest) */}
      <polygon points="2,18 8,12 14,18" fill="#4a9a5a" />
      <polygon points="3,18 8,13 13,18" fill="#5eb86e" />
      {/* Highlight */}
      <polygon points="6,15 8,13 10,15" fill="#7ed48e" opacity="0.6" />

      {/* Middle canopy */}
      <polygon points="3,14 8,8 13,14" fill="#4a9a5a" />
      <polygon points="4,14 8,9 12,14" fill="#5eb86e" />
      <polygon points="6,11 8,9 10,11" fill="#7ed48e" opacity="0.6" />

      {/* Top canopy */}
      <polygon points="4,10 8,4 12,10" fill="#4a9a5a" />
      <polygon points="5,10 8,5 11,10" fill="#5eb86e" />
      <polygon points="7,7 8,5 9,7" fill="#7ed48e" opacity="0.7" />

      {/* Tip */}
      <polygon points="7,5 8,2 9,5" fill="#5eb86e" />
      <rect x="7.5" y="2" width="1" height="1" fill="#7ed48e" opacity="0.8" />
    </svg>
  )
}
