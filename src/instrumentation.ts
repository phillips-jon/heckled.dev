// Starts the heckle worker inside the Next.js server process, so the app is
// one systemd service with no separate queue to run.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.HECKLED_WORKER !== "off") {
    const { startWorker } = await import("./lib/worker");
    startWorker();
  }
}
