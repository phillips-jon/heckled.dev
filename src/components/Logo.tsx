// The mark: a red splat, where a tomato just landed. Heckling, the
// old-fashioned way. The same drawing is public/favicon.svg and the share card's.
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <g fill="#ef3b24">
      <path d="M20 5c3 0 4 3 6 3s4-2 6 0-1 4 0 6 4 2 4 5-3 3-3 5 2 4 0 6-4 0-6 1-2 4-5 4-3-3-5-3-4 2-6 0-1-4-3-5-5-1-5-4 3-3 3-5-2-4 0-6 4 0 5-2-1-4 1-5 4 0 6 0 2-4 6-4z"/>
      <circle cx="35.5" cy="31" r="1.6"/>
      <circle cx="5" cy="9" r="1.3"/>
      <circle cx="9" cy="35" r="1.1"/>
      </g>
    </svg>
  );
}
