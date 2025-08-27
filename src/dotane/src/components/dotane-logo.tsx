interface DotaneLogoProps {
  className?: string
  width?: number
  height?: number
}

export function DotaneLogo({ className = "w-8 h-8", width = 32, height = 32 }: DotaneLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="169.595 326.374 93.031 93.031"
      width={width}
      height={height}
      className={className}
    >
      <g>
        <g>
          <ellipse
            className="stroke-current fill-none"
            strokeWidth="5"
            cx="216.679"
            cy="371.996"
            rx="39.74"
            ry="39.74"
          />
          <path
            d="M 324.324 227.177 L 360.522 263.004 L 288.125 263.004 L 324.324 227.177 Z"
            className="stroke-current fill-foreground dark:fill-white"
            strokeWidth="1"
            style={{
              transformBox: "fill-box",
              transformOrigin: "50% 50%",
              transform: "matrix(-0.011047, 0.999939, -0.999939, -0.011047, -88.50967, 127.158681)",
            }}
          />
        </g>
        <rect x="169.595" y="326.374" width="93.031" height="93.031" className="fill-none" stroke="none" />
      </g>
    </svg>
  )
}
