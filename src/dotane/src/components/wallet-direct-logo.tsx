interface WalletDirectLogoProps {
  className?: string
  width?: number
  height?: number
}

export function WalletDirectLogo({ className = "w-4 h-4" }: WalletDirectLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
    >
      {/* Circle in center */}
      <circle cx="12" cy="12" r="3.5" strokeWidth="1.5" />
      
      {/* Left outer bar */}
      <rect x="1.5" y="7" width="2" height="10" fill="currentColor" stroke="none" />
      
      {/* Right outer bar */}
      <rect x="20.5" y="7" width="2" height="10" fill="currentColor" stroke="none" />
      
      {/* Left inner bar */}
      <rect x="5" y="8.5" width="2" height="7" fill="currentColor" stroke="none" />
      
      {/* Right inner bar */}
      <rect x="17" y="8.5" width="2" height="7" fill="currentColor" stroke="none" />
    </svg>
  )
}