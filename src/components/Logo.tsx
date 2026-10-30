interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 22, className }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Media Downloader"
    >
      <defs>
        <linearGradient id="md-mark" x1="2" y1="1" x2="30" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DEBFA" />
          <stop offset="0.5" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#md-mark)" />
      <rect x="0.6" y="0.6" width="30.8" height="30.8" rx="8.4" stroke="white" strokeOpacity="0.28" strokeWidth="1.2" />
      <path d="M16 8.4v9.4" stroke="#04131C" strokeWidth="2.7" strokeLinecap="round" />
      <path
        d="M11.3 13.9 16 18.6l4.7-4.7"
        stroke="#04131C"
        strokeWidth="2.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.2 23.6h11.6" stroke="#04131C" strokeOpacity="0.5" strokeWidth="2.7" strokeLinecap="round" />
    </svg>
  )
}
