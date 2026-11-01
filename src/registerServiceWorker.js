/* Registers /sw.js and shows a small "update ready" bar when a new version is waiting.
   Call registerServiceWorker() once from src/main.jsx. */
function showUpdateBar(onAccept) {
  if (document.getElementById("nibraas-update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "nibraas-update-bar";
  bar.setAttribute("role", "status");
  bar.style.cssText =
    "position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:10001;max-width:520px;margin:0 auto;" +
    "display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;" +
    "background:#082C2A;color:#fff;font:600 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);";
  const text = document.createElement("span");
  text.textContent = "Nooc cusub oo NIBRAAS ah ayaa diyaar ah.";
  const actions = document.createElement("span");
  actions.style.cssText = "display:flex;gap:8px;flex-shrink:0;";
  const later = document.createElement("button");
  later.type = "button";
  later.textContent = "Ka dib";
  later.style.cssText = "background:transparent;color:#F3E7C4;border:1px solid rgba(243,231,196,.5);border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;";
  const update = document.createElement("button");
  update.type = "button";
  update.textContent = "Cusboonaysii";
  update.style.cssText = "background:#C9A227;color:#082C2A;border:none;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;";
  later.addEventListener("click", () => bar.remove());
  update.addEventListener("click", () => { update.disabled = true; onAccept(); });
  actions.append(later, update);
  bar.append(text, actions);
  document.body.appendChild(bar);
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const secure = window.location.protocol === "https:" || window.location.hostname === "localhost";
  if (!secure) return;

  window.addEventListener("load", async () => {
    try {
      // Remove any older worker registered under a different file name, so only /sw.js remains.
      const existing = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        existing.map((r) => {
          const script = (r.active || r.waiting || r.installing)?.scriptURL || "";
          return script && !script.endsWith("/sw.js") ? r.unregister() : null;
        })
      );

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
      const offerUpdate = (worker) => showUpdateBar(() => worker.postMessage({ type: "SKIP_WAITING" }));

      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) offerUpdate(worker);
        });
      });

      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      // Look for a new version when the app comes back to the foreground, and hourly.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") registration.update().catch(() => {});
      });
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  });
}
