"use client";

import { useState } from "react";
import { track } from "@/lib/track";

const button =
  "inline-flex h-10 items-center gap-2 rounded-lg border border-line-strong px-4 text-[15px] text-ink no-underline transition-all hover:border-ink active:scale-[0.97]";

export function ShareBar({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`${button} min-w-[118px] justify-center border-accent bg-accent font-semibold text-accent-ink hover:border-accent hover:brightness-110`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {}
          track("Share: copy link");
        }}
      >
        {copied ? (
          <>
            <svg viewBox="0 0 24 24" className="pop size-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Copied
          </>
        ) : (
          "Copy link"
        )}
      </button>
      <a
        className={button}
        href={`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("Share: X")}
      >
        Post on X
      </a>
      <a
        className={button}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track("Share: LinkedIn")}
      >
        Share on LinkedIn
      </a>
    </div>
  );
}
