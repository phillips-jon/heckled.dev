"use client";

import { useEffect, useState } from "react";

// Shown only in the browser that made the roast, which holds its delete token.
const labels = {
  remove: "Remove this roast",
  confirm: "Remove it for good? The link will stop working.",
  removed: "Removed. It's gone.",
};

export function RemoveButton({ slug }: { slug: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "confirm" | "removed">("idle");

  useEffect(() => {
    try {
      setToken(localStorage.getItem(`heckled:delete:${slug}`));
    } catch {}
  }, [slug]);

  if (!token) return null;
  if (state === "removed") return <p className="text-sm text-muted">{labels.removed}</p>;

  async function remove() {
    const res = await fetch(`/api/heckles/${slug}`, { method: "DELETE", headers: { "x-delete-token": token! } });
    if (res.ok) {
      try {
        localStorage.removeItem(`heckled:delete:${slug}`);
      } catch {}
      setState("removed");
      setTimeout(() => location.assign("/"), 1200);
    }
  }

  return state === "confirm" ? (
    <p className="flex flex-wrap items-center gap-3 text-sm text-muted">
      {labels.confirm}
      <button type="button" onClick={remove} className="font-medium text-bad underline underline-offset-4">
        {labels.remove}
      </button>
    </p>
  ) : (
    <button type="button" onClick={() => setState("confirm")} className="text-sm text-muted underline decoration-line-strong underline-offset-4 hover:text-ink">
      {labels.remove}
    </button>
  );
}
