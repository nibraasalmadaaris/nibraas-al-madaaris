/* NIBRAAS update system (installed PWA + normal Chrome).
 *
 * Why this exists: an installed PWA is almost never "reloaded" and its process stays alive in the
 * background for days, so the old JavaScript keeps running. Two independent signals tell it that a new
 * version exists, and the person always decides when to update:
 *   1. a new /sw.js is waiting (sw.js is stamped with the build id on every deploy), or
 *   2. /version.json (written by every build) no longer matches the build id compiled into this page.
 *
 * Nothing reloads by itself. Pressing "Cusboonaysii" first waits until every database write that is in
 * flight has really finished. The page is NEVER reloaded while a write is pending. If a write fails, the
 * update is paused and a warning is shown (the person can still choose to continue).
 *
 * IMPORTANT: src/main.jsx must import this file BEFORE ./App.jsx. The write tracker below wraps
 * window.fetch when this module is evaluated, and the Supabase client keeps the fetch it sees when it is
 * created (ES modules are evaluated in import order).
 */
const CURRENT_BUILD = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "dev";
const MIN_GAP_MS = 60 * 1000;            // never check more often than this
const POLL_MS = 10 * 60 * 1000;          // and at least this often while the app is open
const SNOOZE_MS = 30 * 60 * 1000;        // "Ka dib" hides the bar for this long
const WRITE_QUIET_MS = 400;              // no write must have started for this long before reloading
const WRITE_MAX_WAIT_MS = 45 * 1000;     // after this the update is paused (never reloaded with writes pending)
const RECENT_FAILURE_MS = 2 * 60 * 1000; // a write that failed this recently pauses the update

/* ---- track database writes (POST/PUT/PATCH/DELETE) so an update never cuts a save in half ---- */
const writes = { pending: 0, lastStartAt: 0, lastFailureAt: 0 };

(function trackWrites() {
  if (typeof window === "undefined" || typeof window.fetch !== "function" || window.__nibraasFetchTracked) return;
  window.__nibraasFetchTracked = true;
  const original = window.fetch.bind(window);
  window.fetch = function trackedFetch(input, init) {
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    const url = String((input && input.url) || input || "");
    // Reads, and auth token refreshes (not school data), are not tracked.
    if (method === "GET" || method === "HEAD" || url.includes("/auth/v1/")) return original(input, init);
    writes.pending += 1;
    writes.lastStartAt = Date.now();
    let finished = false;
    const finish = (failed) => {
      if (finished) return;
      finished = true;
      writes.pending = Math.max(0, writes.pending - 1);
      if (failed) writes.lastFailureAt = Date.now();
    };
    const request = original(input, init);
    request.then((res) => finish(!res || !res.ok), () => finish(true));
    return request; // the caller gets exactly the original promise
  };
})();

/* Resolves {ok:true} when no write is pending (and none started recently), or {ok:false, reason}.
   It never resolves ok while a write is pending. */
function waitForSafeToReload(startedAt) {
  return new Promise((resolve) => {
    const tick = () => {
      if (writes.lastFailureAt >= startedAt - RECENT_FAILURE_MS) return resolve({ ok: false, reason: "failed" });
      if (writes.pending === 0 && Date.now() - writes.lastStartAt >= WRITE_QUIET_MS) return resolve({ ok: true });
      if (Date.now() - startedAt > WRITE_MAX_WAIT_MS) return resolve({ ok: false, reason: "timeout" });
      setTimeout(tick, 150);
    };
    tick();
  });
}

/* ---- the small update bar (plain DOM, independent of React so it can never be broken by the app) ---- */
const BAR_ID = "nibraas-update-bar";
function removeBar() {
  const bar = document.getElementById(BAR_ID);
  if (bar) bar.remove();
}

function button(label, primary) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.style.cssText = primary
    ? "background:#C9A227;color:#082C2A;border:none;border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;"
    : "background:transparent;color:#F3E7C4;border:1px solid rgba(243,231,196,.5);border-radius:10px;padding:8px 12px;font:inherit;cursor:pointer;";
  return b;
}

/* state: "ready" | "waiting" | "failed" | "timeout". Re-renders the same bar element. */
function renderBar(state, handlers) {
  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = document.createElement("div");
    bar.id = BAR_ID;
    bar.setAttribute("role", "status");
    bar.setAttribute("aria-live", "polite");
    bar.style.cssText =
      "position:fixed;left:12px;right:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:520px;margin:0 auto;" +
      "display:flex;gap:10px;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:14px;" +
      "background:#082C2A;color:#fff;font:600 14px/1.4 system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);";
    document.body.appendChild(bar);
  }
  bar.textContent = "";
  bar.dataset.state = state;
  const text = document.createElement("span");
  const actions = document.createElement("span");
  actions.style.cssText = "display:flex;gap:8px;flex-shrink:0;";
  if (state === "ready") {
    text.textContent = "Nooc cusub oo NIBRAAS ah ayaa diyaar ah.";
    const later = button("Ka dib", false);
    const update = button("Cusboonaysii", true);
    later.addEventListener("click", handlers.onLater);
    update.addEventListener("click", () => handlers.onAccept(false));
    actions.append(later, update);
  } else if (state === "waiting") {
    text.textContent = "Waa la sugayaa in kaydinta xogta la dhammeeyo...";
    const stop = button("Jooji", false);
    stop.addEventListener("click", handlers.onCancel);
    actions.append(stop);
  } else if (state === "failed") {
    text.textContent = "Kaydin dhawaan ayaa fashilantay. Update-ka waa la hakiyay si xogtaada loo ilaaliyo. Hubi in xogta la kaydiyay.";
    const stop = button("Jooji", false);
    const force = button("Haddana cusboonaysii", true);
    stop.addEventListener("click", handlers.onCancel);
    force.addEventListener("click", () => handlers.onAccept(true));
    actions.append(stop, force);
  } else {
    text.textContent = "Kaydintu weli socotaa. Update-ka waa la hakiyay si xogta loo ilaaliyo.";
    const stop = button("Jooji", false);
    const retry = button("Isku day mar kale", true);
    stop.addEventListener("click", handlers.onCancel);
    retry.addEventListener("click", () => handlers.onAccept(false));
    actions.append(stop, retry);
  }
  bar.append(text, actions);
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const secure = window.location.protocol === "https:" || window.location.hostname === "localhost";
  if (!secure) return;

  let registration = null;
  let buildOutdated = false;
  let snoozedUntil = 0;
  let lastCheck = 0;
  let updating = false;     // the person pressed "Cusboonaysii" and the flow is running
  let cancelled = false;    // the person pressed "Jooji" during the flow
  let reloading = false;    // reload already triggered: it can only ever happen once
  let runId = 0;            // identifies the current "Cusboonaysii" attempt (older attempts are ignored)
  // A page that starts with no controller is a first install: the first controllerchange is only
  // clients.claim() and must NOT reload it. Later controllerchange events are real updates.
  let claimSeen = !!navigator.serviceWorker.controller;

  // The single place that reloads the page. Refuses while a write is pending.
  function reloadOnce() {
    if (reloading) return;
    if (writes.pending > 0) { setTimeout(reloadOnce, 150); return; }
    reloading = true;
    window.location.reload();
  }

  function later() {
    cancelled = true;
    updating = false;
    snoozedUntil = Date.now() + SNOOZE_MS;
    removeBar();
  }

  const handlers = { onLater: later, onCancel: later, onAccept: (force) => accept(force) };

  async function accept(force) {
    if (updating || reloading) return;
    updating = true;
    cancelled = false;
    const run = ++runId;
    renderBar("waiting", handlers);

    // 1) Let every save that is running finish. A failed save pauses the update (unless forced).
    const startedAt = Date.now();
    const result = force ? await waitForPendingOnly() : await waitForSafeToReload(startedAt);
    if (cancelled || run !== runId) return;
    if (!result.ok) {
      updating = false;
      renderBar(result.reason, handlers);
      return;
    }

    // 2) Activate the new worker (if one is waiting) and reload exactly once.
    const waiting = registration && registration.waiting;
    if (waiting) {
      waiting.postMessage({ type: "SKIP_WAITING" });
      // controllerchange normally triggers the reload; this is only a fallback. Both go through reloadOnce().
      setTimeout(() => { if (!cancelled && run === runId) reloadOnce(); }, 4000);
    } else {
      reloadOnce();
    }
  }

  // "Haddana cusboonaysii": the person accepted the risk, but we still never reload with a write pending.
  function waitForPendingOnly() {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        if (writes.pending === 0 && Date.now() - writes.lastStartAt >= WRITE_QUIET_MS) return resolve({ ok: true });
        if (Date.now() - startedAt > WRITE_MAX_WAIT_MS) return resolve({ ok: false, reason: "timeout" });
        setTimeout(tick, 150);
      };
      tick();
    });
  }

  function evaluate() {
    if (updating || Date.now() < snoozedUntil) return;
    const waiting = registration && registration.waiting;
    if ((waiting && navigator.serviceWorker.controller) || buildOutdated) renderBar("ready", handlers);
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
        // Reload only when this person asked for the update and the writes are done (never on first install).
        if (!claimSeen) { claimSeen = true; return; }
        if (updating && !cancelled) reloadOnce();
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
