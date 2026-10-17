// The mark: a tomato, mid-splat. Heckling, the old-fashioned way.
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {/* the splat */}
      <path
        d="M20 5c3 0 4 3 6 3s4-2 6 0-1 4 0 6 4 2 4 5-3 3-3 5 2 4 0 6-4 0-6 1-2 4-5 4-3-3-5-3-4 2-6 0-1-4-3-5-5-1-5-4 3-3 3-5-2-4 0-6 4 0 5-2-1-4 1-5 4 0 6 0 2-4 6-4z"
        fill="var(--accent)"
      />
      {/* drips */}
      <circle cx="35.5" cy="31" r="1.6" fill="var(--accent)" />
      <circle cx="5" cy="9" r="1.3" fill="var(--accent)" />
      <circle cx="9" cy="35" r="1.1" fill="var(--accent)" />
      {/* the shine and the leaf */}
      <path d="M13.5 15.5c1-2 3-3.5 5-4" stroke="#fff" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M20 13c-1-3 0-5 2-6M20 13c-3-1-5 0-6 1M20 13c3-1 5 0 6 2" stroke="#3f8f3a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}
