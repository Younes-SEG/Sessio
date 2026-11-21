/** Sessio's mark: a calendar page with an S, drawn in the current text colour. */
export function BrandMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2.5" strokeWidth="2" />
      <path d="M3 9.5h18M8 3v4m8-4v4" strokeWidth="2" />
      <path
        d="M14.6 12.9c-.5-.5-1.3-.8-2.4-.8-1.4 0-2.3.7-2.3 1.7 0 2.3 4.8 1.2 4.8 3.5 0 1.1-1 1.8-2.5 1.8-1.1 0-2-.3-2.6-1"
        strokeWidth="1.8"
      />
    </svg>
  );
}
