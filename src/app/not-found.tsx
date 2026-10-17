import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-5 py-28 sm:px-14">
      <p className="label">404</p>
      <h1 className="mt-3 max-w-[20em] text-[clamp(1.6rem,3.4vw,2.1rem)] leading-tight">
        <b className="font-semibold">Nothing here.</b> Maybe the roast was removed, or maybe it was too mean to exist.
      </h1>
      <Link href="/" className="group mt-8 inline-flex h-10 items-center gap-1.5 rounded-lg bg-accent px-5 font-semibold text-accent-ink">
        Heckle something <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </Link>
    </div>
  );
}
