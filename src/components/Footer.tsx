import { ThemeSwitch } from "./ThemeSwitch";

const link = "text-body underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink hover:decoration-ink";

export function Footer() {
  return (
    <footer className="mt-28 border-t border-line px-5 py-8 text-sm text-muted sm:px-14">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="font-mono text-xs">© 2026 Heckled</p>
          <ThemeSwitch />
        </div>
        <p className="flex flex-wrap gap-x-5 gap-y-2">
          <span>
            Built for the{" "}
            <a className={link} href="https://activebuilders.dev">
              Active Builders × Gradium AI challenge
            </a>
          </span>
          <span>
            Voices by{" "}
            <a className={link} href="https://gradium.ai">
              Gradium
            </a>
          </span>
          <span>
            Made by{" "}
            <a className={link} href="https://joncphillips.com">
              Jon C. Phillips
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}
