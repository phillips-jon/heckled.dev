// Starts the heckle worker inside the Next.js server process, so the app is
// one systemd service with no separate queue to run.
//
// HECKLED_WORKER=check loads all of the worker's code (and the browser driver)
// without starting it, so a deploy's pre-flight check catches a module that
// failed to ship, without touching live heckles. "off" skips it entirely.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.HECKLED_WORKER === "off") return;
  const { startWorker } = await import("./lib/worker");
  if (process.env.HECKLED_WORKER === "check") {
    await import("playwright-core");
    return;
  }
  startWorker();
}
