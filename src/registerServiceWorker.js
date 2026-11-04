/* NIBRAAS update system (installed PWA + normal Chrome).
 *
 * Why this exists: an installed PWA is almost never "reloaded" and its process stays alive in the
 * background for days, so the old JavaScript keeps running. Two independent signals tell it that a new
 * version exists, and the person always decides when to update:
 *   1. a new /sw.js is waiting (sw.js is stamped with the build id on every deploy), or
 *   2. /version.json (written by every build) no longer matches the build id compiled into this page.
 * Nothing reloads by itself. Pressing "Cusboonaysii" waits for pending database writes, then reloads.
 */
const CURRENT_BUILD = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const MIN_GAP_MS = 60 * 1000;            // never check more often than this
const POLL_MS = 10 * 60 * 1000;          // and at least this often while the app is open
const SNOOZE_MS = 30 * 60 * 1000;        // "Ka dib" hides the bar for this long
const WRITE_WAIT_MS = 6000;              // max wait for in-flight saves before reloading

/* ---- count in-flight writes (POST/PUT/PATCH/DELETE) so an update never cuts a save in half ---- */
let pendingWrites = 0;
(function trackWrites() {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || window.__nibraasFetchTracked) return;
  window.__nibraasFetchTracked = true;
  const original = window.fetch.bind(window);
  window.fetch = function trackedFetch(input, init) {
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") return original(input, init);
    pendingWrites += 1;
    const done = () => { pendingWrites = Math.max(0, pendingWrites - 1); };
    const p = original(input, init);
    p.then(done, done);
    return p;
  };
})();

function waitForWrites() {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => (pendingWrites === 0 || Date.now() - start > WRITE_WAIT_MS ? resolve() : setTimeout(tick, 150));
    tick();
  });
}

/* ---- the small update bar (plain DOM, independent of React so it can never be broken by the app) ---- */
function removeBar() {
  const bar = document.getElementById("nibraas-update-bar");
  if (bar) bar.remove();
}

function showUpdateBar({ onAccept, onLater }) {
  if (document.getElementById("nibraas-update-bar")) return;
  const bar = document.createElement("div");
  bar.id = "nibraas-update-bar";
  bar.setAttribute("role", "status");
  bar.setAttribute("aria-live", "polite");
  bar.style.cssText =
    "position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:520px;margin:0 auto;" +
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
  later.addEventListener("click", () => { removeBar(); onLater(); });
  update.addEventListener("click", () => {
    update.disabled = true;
    later.disabled = true;
    update.textContent = "Waa la cusboonaysiinayaa...";
    onAccept();
  });
  actions.append(later, update);
  bar.append(text, actions);
  document.body.appendChild(bar);
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const secure = window.location.protocol === "https:" || window.location.hostname === "localhost";
  if (!secure) return;

  let registration = null;
  let buildOutdated = false;
  let snoozedUntil = 0;
  let lastCheck = 0;
  let accepted = false;
  // A page that starts with no controller is a first install: clients.claim() must NOT reload it.
  const hadController = !!navigator.serviceWorker.controller;

  function reloadNow() {
    waitForWrites().then(() => window.location.reload());
  }

  function accept() {
    accepted = true;
    const waiting = registration && registration.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      // If controllerchange never arrives, reload anyway: navigations are network-first, so the page
      // still loads the new version.
      setTimeout(reloadNow, 4000);
    } else {
      reloadNow();
    }
  }

  function later() {
    snoozedUntil = Date.now() + SNOOZE_MS;
  }

  function evaluate() {
    if (accepted || Date.now() < snoozedUntil) return;
    const waiting = registration && registration.waiting;
    if ((waiting && navigator.serviceWorker.controller) || buildOutdated) {
      showUpdateBar({ onAccept: accept, onLater: later });
    }
  }

  async function checkVersionFile() {
    if (CURRENT_BUILD === "dev") return;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const remote = await res.json();
      if (remote && typeof remote.id === "string" && remote.id && remote.id !== CURRENT_BUILD) buildOutdated = true;
    } catch {
      /* offline or blocked: keep running the current version */
    }
  }

  async function checkForUpdate(force = false) {
    const now = Date.now();
    if (!force && now - lastCheck < MIN_GAP_MS) { evaluate(); return; }
    lastCheck = now;
    try { if (registration) await registration.update(); } catch { /* offline: ignore */ }
    await checkVersionFile();
    evaluate();
  }

  async function init() {
    try {
      // Remove any older worker registered under another file name, so only /sw.js remains.
      const existing = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        existing.map((r) => {
          const script = (r.active || r.waiting || r.installing)?.scriptURL || "";
          return script && !script.endsWith("/sw.js") ? r.unregister() : null;
        })
      );

      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener("statechange", () => {
          if (worker.state === "installed") evaluate();
        });
      });

      navigator.serviceWorker.addEventListener("controllerchange", () => {
        // Reload only when the person asked for the update (never on first install).
        if (hadController && accepted) reloadNow();
      });

      evaluate();                       // a worker may already be waiting from an earlier visit
      checkForUpdate(true);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
      window.addEventListener("online", () => checkForUpdate(true));
      window.addEventListener("focus", () => checkForUpdate());
      setInterval(() => checkForUpdate(), POLL_MS);
    } catch (error) {
      console.warn("Service worker registration failed:", error);
    }
  }

  if (document.readyState === "complete") init();
  else window.addEventListener("load", init, { once: true });
}
