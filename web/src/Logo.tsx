// Fireblocks-style mark: dark-navy rounded square with a light upward triangle,
// matching the console logo. Approximation for the demo — use the official asset
// from the Fireblocks brand kit for production materials.
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Fireblocks">
      <rect width="32" height="32" rx="8" fill="#1A1F2E" />
      <path d="M16 8l7 12H9l7-12z" fill="#EAF0FF" />
      <path d="M16 14.5l3.2 5.5h-6.4l3.2-5.5z" fill="#2563EB" />
    </svg>
  );
}
