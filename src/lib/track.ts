// Runlight custom events (analytics.joncp.dev). The script loads deferred,
// so an event fired before it arrives is simply dropped.
declare global {
  interface Window {
    runlight?: (event: string) => void;
  }
}

export function track(event: string) {
  try {
    window.runlight?.(event);
  } catch {}
}
