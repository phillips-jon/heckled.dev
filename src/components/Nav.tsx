import Link from "next/link";
import { Mark } from "./Logo";

const link = "text-[15px] text-body underline decoration-line-strong underline-offset-[5px] transition-colors hover:text-ink hover:decoration-ink";

export function Nav() {
  return (
    <header className="flex items-center justify-between gap-6 px-5 pt-6 sm:px-14 sm:pt-7">
      <nav className="flex gap-5">
        <Link href="/#roasters" className={link}>
          Get heckled
        </Link>
        <Link href="/#how" className={link}>
          How it works
        </Link>
        <a href="https://github.com/phillips-jon/heckled.dev" className={`${link} hidden sm:inline`}>
          GitHub
        </a>
      </nav>
      <Link href="/" className="group flex items-center gap-2 text-ink no-underline" aria-label="Heckled, home">
        <Mark className="splat size-[34px]" />
        <span className="text-[20px] font-bold tracking-[-0.03em] italic">
          Heckled<span className="text-accent">!</span>
        </span>
      </Link>
    </header>
  );
}
