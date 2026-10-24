export function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 40 40"
      width={size}
    >
      <rect
        fill="url(#credet-logo-fill)"
        height="38"
        rx="12"
        width="38"
        x="1"
        y="1"
      />
      <path
        d="M12 12.5h16M12 18.5h11M12 24.5h16M12 30.5h8"
        stroke="white"
        strokeLinecap="round"
        strokeOpacity="0.92"
        strokeWidth="2"
      />
      <circle cx="27.5" cy="30.5" fill="white" r="2" />
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="credet-logo-fill"
          x1="6"
          x2="35"
          y1="3"
          y2="38"
        >
          <stop stopColor="#818CF8" />
          <stop offset="1" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
    </svg>
  );
}
