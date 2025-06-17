import React from 'react'

const Logo = ({ size = 32, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle with gradient */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </linearGradient>
        <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {/* Main background circle */}
      <circle cx="32" cy="32" r="30" fill="url(#bgGradient)" />

      {/* Inner glow effect */}
      <circle
        cx="32"
        cy="32"
        r="26"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* The "e7" text */}
      <text
        x="18"
        y="42"
        fontSize="24"
        fontWeight="700"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="url(#textGradient)"
        textAnchor="middle"
      >
        e7
      </text>

      {/* Chat bubble accent */}
      <g transform="translate(40, 20)">
        {/* Main chat bubble */}
        <path
          d="M0 6 C0 2.5 2.5 0 6 0 L14 0 C17.5 0 20 2.5 20 6 L20 12 C20 15.5 17.5 18 14 18 L6 18 C2.5 18 0 15.5 0 12 Z"
          fill="url(#accentGradient)"
        />
        {/* Chat bubble tail */}
        <path d="M2 18 L6 22 L6 18 Z" fill="url(#accentGradient)" />
        {/* Chat dots */}
        <circle cx="6" cy="9" r="1.5" fill="white" opacity="0.9" />
        <circle cx="10" cy="9" r="1.5" fill="white" opacity="0.7" />
        <circle cx="14" cy="9" r="1.5" fill="white" opacity="0.5" />
      </g>

      {/* Subtle outer ring */}
      <circle
        cx="32"
        cy="32"
        r="31"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="1"
      />
    </svg>
  )
}

export default Logo
