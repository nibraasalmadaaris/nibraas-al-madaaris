import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import { qrMatrix } from "./lib/qr";
import {
  Home, Users, UserCog, GraduationCap, ClipboardCheck, CalendarClock, BookOpen,
  AlertCircle, TrendingUp, ClipboardList, Wallet, BarChart3, MessageSquare,
  Settings, Plus, Search, Trash2, Pencil, ArrowLeft, X, Check, ChevronRight,
  Grid3x3, Send, RotateCcw, Circle, LogOut, ShieldCheck, Banknote, BriefcaseBusiness, IdCard,
  Download, Upload, FileSpreadsheet, Trophy,
  School, CalendarDays, Clock, ListTodo, MessageSquareWarning, NotebookPen, Receipt,
  UsersRound, MessageCircle, MessageSquareText, Lock
} from "lucide-react";
import logo from "./assets/Astaanta Waxbarashada Nibraas Dahab iyo Cagaar-2.png";

/* ---------------------------------------------------------
   NIBRAAS v44 — Nidaamka Maareynta Madrasada
   NIBRAAS is the school management application.
--------------------------------------------------------- */

const COLORS = {
  teal: "#0B3D3A",
  tealDeep: "#082C2A",
  tealLight: "#175C54",
  gold: "#C9A227",
  goldSoft: "#F3E7C4",
  sand: "#F7F3EA",
  sandDeep: "#EFE8D8",
  ink: "#1B2E2B",
  inkSoft: "#5B6E69",
  brick: "#A2503F",
  line: "#DED4B8",
};

/* ---------- font loader ---------- */
function useBrandFonts() {
  useEffect(() => {
    if (document.getElementById("nibraas-fonts")) return;
    const link = document.createElement("link");
    link.id = "nibraas-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}
const DISPLAY_FONT = "'Fraunces', serif";
const BODY_FONT = "'Manrope', sans-serif";

/* Canonical form used to decide whether two spellings are the same class or the same person.
   "Al-maahiruun", "Al-maahiruun ", "Al-Maahiruun" and "Al maahiruun" all become "al maahiruun". */
function textKey(v) {
  return String(v ?? "")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‐-―_-]+/g, " ")
    .replace(/['‘’`´]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
const classKey = textKey;
function sameText(a, b) {
  const ka = textKey(a);
  return ka !== "" && ka === textKey(b);
}
const sameClass = sameText;

/* Groups spelling variants of class names. An official name from the Classes screen wins as the
   label; otherwise the most common spelling among students is used. */
function buildClassIndex(students = [], officialClasses = []) {
  const groups = new Map();
  (officialClasses || []).forEach((c) => {
    const label = cleanText(String(c?.name ?? ""));
    const k = classKey(label);
    if (k && !groups.has(k)) groups.set(k, { label, official: true, counts: new Map() });
  });
  (students || []).forEach((s) => {
    const raw = cleanText(String(s?.className ?? s?.class ?? s?.fasal ?? ""));
    const k = classKey(raw);
    if (!k) return;
    let g = groups.get(k);
    if (!g) { g = { label: raw, official: false, counts: new Map() }; groups.set(k, g); }
    g.counts.set(raw, (g.counts.get(raw) || 0) + 1);
  });
  groups.forEach((g) => {
    if (!g.official && g.counts.size) g.label = Array.from(g.counts.entries()).sort((a, b) => b[1] - a[1])[0][0];
  });
  const labels = Array.from(groups.values()).map((g) => g.label).sort((a, b) => a.localeCompare(b));
  const labelOf = (name) => groups.get(classKey(name))?.label ?? cleanText(String(name ?? ""));
  return { labels, labelOf };
}

/* ---------- input cleaning & validation ---------- */
const cleanText = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : v);

function isValidISODate(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  const year = Number(v.slice(0, 4));
  return year >= 2000 && year <= 2100;
}

function isValidPhone(v) {
  const digits = String(v ?? "").replace(/[\s\-().]/g, "");
  return /^\+?\d{7,15}$/.test(digits);
}

/* Returns an error message in Somali, or "" when the value is acceptable. */
function validateField(field, raw) {
  const type = field.type;
  const value = typeof raw === "string" ? cleanText(raw) : raw;
  const empty = value === undefined || value === null || value === "";
  if (empty) return field.required ? "Goobtan waa lagama maarmaan." : "";
  if (type === "tel" && !isValidPhone(value)) return "Lambarka taleefanka ma saxna (7 ilaa 15 lambar).";
  if (type === "date" && !isValidISODate(String(value))) return "Taariikhda ma saxna.";
  if (type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return "Geli lambar sax ah.";
    const min = field.min ?? 0;
    if (n < min) return `Lambarku waa inuusan ka yaraan ${min}.`;
    if (field.max !== undefined && n > field.max) return `Lambarku waa inuusan ka badnaan ${field.max}.`;
  }
  return "";
}

/* Positive money amount check shared by finance, invoices and payroll. */
function validateAmount(raw, { allowZero = false, max = 1000000 } = {}) {
  const n = Number(raw);
  if (raw === "" || raw === null || raw === undefined || !Number.isFinite(n)) return "Geli qadar sax ah.";
  if (n < 0 || (!allowZero && n === 0)) return allowZero ? "Qadarku ma noqon karo mid taban." : "Qadarku waa inuu ka weyn yahay 0.";
  if (n > max) return `Qadarku waa inuusan ka badnaan ${max.toLocaleString()}.`;
  return "";
}

function LoadErrorBanner({ onRetry, text = "Xogta lama soo akhrin karin. Tani ma aha liis madhan; wax lama kaydin doono ilaa xogta la soo akhriyo." }) {
  return (
    <div role="alert" className="rounded-2xl border p-5 text-center" style={{ borderColor: COLORS.brick, backgroundColor: "#fff" }}>
      <p className="text-sm font-semibold mb-1" style={{ color: COLORS.brick }}>Xogta lama helin</p>
      <p className="text-sm mb-3" style={{ color: COLORS.inkSoft }}>{text}</p>
      <button type="button" onClick={onRetry} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>Mar kale isku day</button>
    </div>
  );
}

/* Shown on every screen whose feature is only half built, so nobody believes a message was delivered. */
function FeatureStatusBanner({ working, notConnected }) {
  return (
    <div className="rounded-2xl border p-4 mb-4 text-sm" role="note" style={{ borderColor: COLORS.gold, backgroundColor: COLORS.goldSoft, color: COLORS.ink }}>
      <p className="font-semibold mb-1">Xaaladda adeeggan</p>
      <p><span className="font-semibold" style={{ color: "#28633B" }}>Shaqeeya: </span>{working}</p>
      <p className="mt-1"><span className="font-semibold" style={{ color: COLORS.brick }}>Weli lama isku xirin: </span>{notConnected}</p>
    </div>
  );
}

/* ---------- HTML escaping (anything typed by users that is written into a print window) ---------- */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- QR code drawn locally as SVG (student data never leaves the browser) ---------- */
function QrCode({ value, size = 64 }) {
  const matrix = React.useMemo(() => {
    try { return qrMatrix(value); } catch (e) { console.error("QR error:", e); return null; }
  }, [value]);
  if (!matrix) return <div role="img" aria-label="QR lama sameyn karin" style={{ width: size, height: size }} className="shrink-0 border text-[8px] flex items-center justify-center">QR ✕</div>;
  const n = matrix.length;
  const quiet = 2;
  let path = "";
  matrix.forEach((row, y) => row.forEach((dark, x) => { if (dark) path += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
  return (
    <svg role="img" aria-label="QR code" width={size} height={size} viewBox={`0 0 ${n + quiet * 2} ${n + quiet * 2}`} shapeRendering="crispEdges" className="shrink-0">
      <rect width={n + quiet * 2} height={n + quiet * 2} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}

/* ---------- toast notifications (replaces blocking notify()) ---------- */
function notify(message, type = "info") {
  try {
    if (typeof document === "undefined") return;
    let host = document.getElementById("nibraas-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "nibraas-toast-host";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      host.style.cssText = "position:fixed;left:0;right:0;bottom:84px;z-index:9999;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px;pointer-events:none;";
      document.body.appendChild(host);
    }
    const palette = {
      info: { bg: COLORS.tealDeep, fg: "#fff" },
      success: { bg: COLORS.tealLight, fg: "#fff" },
      error: { bg: COLORS.brick, fg: "#fff" },
    }[type] || { bg: COLORS.tealDeep, fg: "#fff" };
    const el = document.createElement("div");
    el.textContent = String(message ?? "");
    el.style.cssText = `max-width:480px;padding:12px 16px;border-radius:12px;font:600 14px/1.4 ${BODY_FONT};background:${palette.bg};color:${palette.fg};box-shadow:0 6px 20px rgba(0,0,0,.25);pointer-events:auto;opacity:0;transition:opacity .2s;`;
    host.appendChild(el);
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    const dismiss = () => {
      el.style.opacity = "0";
      setTimeout(() => el.remove(), 250);
    };
    if (type === "error") {
      // Errors stay until tapped so the full message can be read.
      el.textContent = String(message ?? "") + "  (taabo si aad u xidho)";
      el.style.cursor = "pointer";
      el.addEventListener("click", dismiss);
    } else {
      setTimeout(dismiss, 3500);
    }
  } catch {
    // Never let a notification failure break the app.
    console.warn(message);
  }
}

/* ---------- confirmation dialog (replaces blocking window.confirm) ----------
   Usage: if (!(await askConfirm("Ma hubtaa?", { confirmLabel: "Tirtir", danger: true }))) return; */
function askConfirm(message, opts = {}) {
  const { confirmLabel = "Haa, sii wad", cancelLabel = "Maya", danger = false, showCancel = true } = opts;
  return new Promise((resolve) => {
    if (typeof document === "undefined") { resolve(false); return; }
    const previouslyFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.5);";
    const box = document.createElement("div");
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");
    box.style.cssText = `width:100%;max-width:420px;background:#fff;border-radius:16px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.35);font-family:${BODY_FONT};`;
    const text = document.createElement("p");
    text.textContent = String(message ?? "");
    text.style.cssText = `margin:0 0 20px;font-size:15px;line-height:1.5;color:${COLORS.ink};white-space:pre-line;`;
    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelLabel;
    cancelBtn.style.cssText = `padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:1px solid ${COLORS.line};background:#fff;color:${COLORS.ink};`;
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.textContent = confirmLabel;
    okBtn.style.cssText = `padding:10px 18px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer;border:none;background:${danger ? COLORS.brick : COLORS.teal};color:#fff;`;
    if (showCancel) row.append(cancelBtn);
    row.append(okBtn);
    box.append(text, row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      document.removeEventListener("keydown", onKey, true);
      overlay.remove();
      try { previouslyFocused?.focus?.(); } catch { /* ignore */ }
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); finish(false); }
      else if (e.key === "Tab") {
        // keep focus inside the dialog
        e.preventDefault();
        if (showCancel) (document.activeElement === cancelBtn ? okBtn : cancelBtn).focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    cancelBtn.addEventListener("click", () => finish(false));
    okBtn.addEventListener("click", () => finish(true));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) finish(false); });
    (showCancel ? cancelBtn : okBtn).focus(); // safe default: Enter/Space will not confirm a destructive action
  });
}

/* ---------- error boundary: one broken screen must not blank the whole app ---------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("NIBRAAS UI error:", error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}>
        <div className="max-w-md w-full rounded-2xl border p-6 text-center" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Wax khalad ah ayaa dhacay</p>
          <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>Xogtaada waa badbaadsan tahay. Fadlan dib u cusboonaysii bogga. Haddii dhibaatadu sii socoto, la xiriir maamulka.</p>
          <button type="button" onClick={() => window.location.reload()} className="rounded-xl px-5 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>Dib u cusboonaysii</button>
        </div>
      </div>
    );
  }
}

/* ---------- idle session timeout (security) ---------- */
const IDLE_LOGOUT_MS = 30 * 60 * 1000; // 30 minutes
function useIdleLogout(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        notify("Waa laguu saaray sababta oo ah waqti dheer ayaan wax la samayn.", "info");
        supabase.auth.signOut();
      }, IDLE_LOGOUT_MS);
    };
    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [enabled]);
}

/* Searchable student picker shared by every student-selection field. */
function StudentSearchSelect({ students = [], value = "", onChange, placeholder = "Raadi magaca ardayga...", allowAll = false, allLabel = "Dhammaan", valueKey = "name", className = "w-full rounded-lg border px-3 py-2.5 text-sm", style = {} }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => String(s?.[valueKey] ?? "") === String(value));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = students.filter((s) => {
    const searchable = [
      s?.name, s?.className, s?.parentName, s?.parentPhone, s?.phone,
      s?.studentNumber, s?.registrationNo, s?.admissionNo, s?.studentId, s?.id,
    ].filter((part) => part !== null && part !== undefined).join(" ").toLocaleLowerCase();
    return !normalizedQuery || searchable.includes(normalizedQuery);
  }).slice(0, 100);
  const borderColor = style.borderColor || COLORS.line;
  return <div className="relative w-full">
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: COLORS.inkSoft }} />
      <input role="combobox" aria-expanded={open} aria-autocomplete="list" value={open ? query : (selected ? `${selected.name}${selected.className ? ` — ${selected.className}` : ""}` : (allowAll && value === "Dhammaan" ? allLabel : ""))} onFocus={() => { setQuery(""); setOpen(true); }} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); if (e.key === "Enter" && filtered.length) { e.preventDefault(); onChange(String(filtered[0]?.[valueKey] ?? "")); setOpen(false); setQuery(""); } }} placeholder={placeholder} autoComplete="off" className={`${className} pl-9 pr-3`} style={{ ...style, borderColor, backgroundColor: style.backgroundColor || "#fff" }} />
    </div>
    {open && <><button type="button" aria-label="Xir raadinta" className="fixed inset-0 z-20 cursor-default" onClick={() => setOpen(false)} style={{ background: "transparent" }} /><div role="listbox" className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border shadow-lg" style={{ borderColor, backgroundColor: "#fff" }}>
      {allowAll && <button type="button" role="option" className="block w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50" onClick={() => { onChange("Dhammaan"); setOpen(false); setQuery(""); }}>{allLabel}</button>}
      {filtered.map((student, i) => <button type="button" role="option" aria-selected={String(student?.[valueKey] ?? "") === String(value)} key={student.id || `${student.name}-${i}`} className="block w-full text-left px-3 py-2.5 text-sm hover:bg-amber-50 border-t" style={{ borderColor: "#eee8d9" }} onClick={() => { onChange(String(student?.[valueKey] ?? "")); setOpen(false); setQuery(""); }}><span className="block font-medium">{student.name}</span>{student.className && <span className="block text-xs" style={{ color: COLORS.inkSoft }}>{student.className}</span>}</button>)}
      {filtered.length === 0 && <p className="px-3 py-3 text-sm" style={{ color: COLORS.inkSoft }}>Arday lama helin. Hubi magaca aad qortay.</p>}
    </div></>}
  </div>;
}


/* ---------- secure tenant/branch storage ---------- */
const GLOBAL_STORAGE_KEYS = new Set(["user-profiles", "config-data", "branches-data"]);
let CURRENT_TENANT_ID = null;
// The active branch is only known after the tenant is verified and that tenant's own
// branch list has been read, so it starts as "main" and is never taken from a global key.
let CURRENT_BRANCH_ID = "main";

function setStorageTenant(id) {
  CURRENT_TENANT_ID = id || null;
}

/* Browser-side settings that belong to a school are stored per tenant, so two schools
   (or two accounts) used on the same phone never see each other's branch list. */
function tenantLocalKey(name, tenantId = CURRENT_TENANT_ID) {
  return tenantId ? `${name}:${tenantId}` : null;
}
function readTenantLocal(name, tenantId = CURRENT_TENANT_ID) {
  const key = tenantLocalKey(name, tenantId);
  if (!key) return null;
  try { return localStorage.getItem(key); } catch (e) { console.warn("localStorage read failed:", e); return null; }
}
function writeTenantLocal(name, value, tenantId = CURRENT_TENANT_ID) {
  const key = tenantLocalKey(name, tenantId);
  if (!key) return;
  try { localStorage.setItem(key, value); } catch (e) { console.warn("localStorage write failed:", e); }
}

/* Tenant verification outcome classes. Only "denied" and "setup" are real answers from the
   server; everything else is treated as a temporary problem (offline, sleeping phone, expired
   token being refreshed) that must never be shown as "this tenant is not verified". */
function classifyTenantError(err) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "transient";
  const msg = String(err?.message || err || "").toLowerCase();
  const code = String(err?.code || "");
  const status = Number(err?.status || 0);
  if (/failed to fetch|networkerror|network request failed|load failed|timeout|timed out|aborted|offline/.test(msg)) return "transient";
  if (status === 0 && !code) return "transient";
  if (status === 408 || status === 429 || status >= 500) return "transient";
  if (code === "PGRST301" || /jwt|token/.test(msg)) return "auth";
  if (code === "PGRST202" || code === "42883" || /could not find the function|function .* does not exist/.test(msg)) return "setup";
  return "denied";
}
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* One tenant-verification attempt. Never throws; never changes the verification rules. */
async function verifyTenantOnce(user) {
  try {
    const requestedSchoolName = String(user.user_metadata?.nibraas_school_name || "").trim();

    const { data: memberships, error: membershipError } = await supabase
      .from("nibraas_memberships")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1);
    if (membershipError) {
      console.error("Membership check error:", membershipError);
      return { ok: false, kind: classifyTenantError(membershipError), message: "Xubinimada akoonka lama akhrin karin." };
    }

    let rpcName = "nibraas_bootstrap";
    let rpcArgs;
    if (!(Array.isArray(memberships) && memberships.length > 0) && requestedSchoolName) {
      rpcName = "nibraas_register_tenant";
      rpcArgs = { p_name: requestedSchoolName.slice(0, 120) };
    }
    const { data, error } = rpcArgs ? await supabase.rpc(rpcName, rpcArgs) : await supabase.rpc(rpcName);
    if (error || !data) {
      console.error("Tenant RPC error:", rpcName, error);
      const kind = error ? classifyTenantError(error) : "denied";
      return { ok: false, kind, message: error?.message || "Tenant-ka NIBRAAS lama diyaarin." };
    }
    return { ok: true, tenant: data };
  } catch (e) {
    console.error("Tenant verification crashed:", e);
    return { ok: false, kind: classifyTenantError(e), message: String(e?.message || e) };
  }
}
function setStorageBranch(id) {
  CURRENT_BRANCH_ID = id || "main";
}
function isGlobalStorageKey(key) {
  return GLOBAL_STORAGE_KEYS.has(key);
}
function physicalStorageKey(key, branchId = CURRENT_BRANCH_ID) {
  if (!CURRENT_TENANT_ID) return null;
  const scope = isGlobalStorageKey(key) ? "__global__" : (branchId || "main");
  return `${CURRENT_TENANT_ID}:${scope}:${key}`;
}
function logicalStorageKey(physicalKey) {
  if (!CURRENT_TENANT_ID || typeof physicalKey !== "string") return physicalKey;
  const prefix = `${CURRENT_TENANT_ID}:`;
  if (!physicalKey.startsWith(prefix)) return physicalKey;
  const rest = physicalKey.slice(prefix.length);
  const firstColon = rest.indexOf(":");
  return firstColon >= 0 ? rest.slice(firstColon + 1) : rest;
}

/* ---------- safe storage core (data-loss protection) ----------
   Every list/record the app keeps lives in ONE app_storage row. The old code read with a
   fail-open helper (an error looked like an empty list) and then wrote whatever the screen held,
   so a failed read followed by a save could replace real data with an empty list, and two
   devices could silently overwrite each other. The rules below are enforced for ALL screens:
   1. A key can only be saved after it was read successfully in this session (STORAGE_SYNC).
      A failed read removes that mark, so saving is refused until a later read succeeds.
   2. Before every write the current row is read again. If it changed since this screen loaded it
      (another device/tab), the two versions are merged by record id instead of overwritten.
   3. The result is always returned; callers must check it. Failures show a clear message. */
const STORAGE_SYNC = new Map(); // physical key -> { base: value the screen last saw, json: canonical string | ABSENT }
const ABSENT = "\u0000absent";
const UNDEF = "\u0000undefined";

function canon(v) {
  if (v === undefined) return "null";
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}
const cloneJson = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
function markSynced(physicalKey, value, exists = true) {
  STORAGE_SYNC.set(physicalKey, { base: cloneJson(value), json: exists ? canon(value) : ABSENT });
}
function clearSynced(physicalKey) {
  STORAGE_SYNC.delete(physicalKey);
}
function resetStorageSync() {
  STORAGE_SYNC.clear();
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function isIdList(list) {
  if (!Array.isArray(list)) return false;
  const seen = new Set();
  for (const item of list) {
    if (!isPlainObject(item) || item.id === undefined || item.id === null) return false;
    const id = String(item.id);
    if (seen.has(id)) return false;
    seen.add(id);
  }
  return true;
}
const mergeCanon = (v) => (v === undefined ? UNDEF : canon(v));

/* Three-way merge: base = what the screen loaded, mine = what the screen wants to save,
   theirs = what is stored now. Lists of records are merged by id; objects field by field. */
function merge3(base, mine, theirs) {
  const cm = mergeCanon(mine), cb = mergeCanon(base), ct = mergeCanon(theirs);
  if (cm === ct) return { value: mine, conflict: false };
  if (cm === cb) return { value: theirs, conflict: false };
  if (ct === cb) return { value: mine, conflict: false };

  const baseList = Array.isArray(base) ? base : [];
  if (Array.isArray(mine) && Array.isArray(theirs) && isIdList(mine) && isIdList(theirs) && isIdList(baseList)) {
    const byId = (list) => new Map(list.map((x) => [String(x.id), x]));
    const bMap = byId(baseList), mMap = byId(mine), tMap = byId(theirs);
    const out = [];
    let conflict = false;
    for (const t of theirs) {
      const id = String(t.id);
      if (mMap.has(id)) {
        const r = merge3(bMap.get(id), mMap.get(id), t);
        conflict = conflict || r.conflict;
        out.push(r.value);
      } else if (bMap.has(id)) {
        // I deleted it; keep it only if the other device edited it meanwhile.
        if (canon(t) !== canon(bMap.get(id))) out.push(t);
      } else {
        out.push(t); // added by the other device
      }
    }
    for (const m of mine) {
      const id = String(m.id);
      if (tMap.has(id)) continue;
      if (bMap.has(id)) {
        // The other device deleted it; keep my version only if I edited it.
        if (canon(m) !== canon(bMap.get(id))) out.push(m);
      } else {
        out.push(m); // added by me
      }
    }
    return { value: out, conflict };
  }

  if (isPlainObject(mine) && isPlainObject(theirs)) {
    const b = isPlainObject(base) ? base : {};
    const out = {};
    let conflict = false;
    for (const k of new Set([...Object.keys(b), ...Object.keys(mine), ...Object.keys(theirs)])) {
      const r = merge3(b[k], mine[k], theirs[k]);
      conflict = conflict || r.conflict;
      if (r.value !== undefined) out[k] = r.value;
    }
    return { value: out, conflict };
  }

  // Both sides changed the same list without ids (or a mixed shape): cannot merge safely.
  if (Array.isArray(mine) || Array.isArray(theirs)) return { value: mine, conflict: true };
  return { value: mine, conflict: false }; // same field edited on both sides: this screen's edit wins
}

let LAST_MERGED = null; // set by saveObj when it had to merge another device's changes
const READ_WARNED = new Map();
function warnReadFailure(key) {
  const now = Date.now();
  if (now - (READ_WARNED.get(key) || 0) < 6000) return;
  READ_WARNED.set(key, now);
  notify("Xogta lama soo akhrin karin (isku xirka). Waxa aad aragto ma aha xogta dhabta ah, wax la kaydin maayo ilaa dib loo soo shubo.", "error");
}

async function readRaw(physicalKey) {
  try {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("tenant_id", CURRENT_TENANT_ID)
      .eq("key", physicalKey)
      .maybeSingle();
    if (error) return { ok: false, error };
    return { ok: true, exists: Boolean(data), value: data ? data.value : undefined };
  } catch (error) {
    return { ok: false, error };
  }
}

async function loadObj(key, fallback) {
  const physicalKey = physicalStorageKey(key);
  if (!physicalKey) return fallback;
  const r = await readRaw(physicalKey);
  if (!r.ok) {
    console.error("Load error:", key, r.error);
    clearSynced(physicalKey); // saving this key is now refused until a read succeeds
    warnReadFailure(key);
    return fallback;
  }
  markSynced(physicalKey, r.exists ? r.value : fallback, r.exists);
  return r.exists ? r.value : fallback;
}

async function saveObj(key, obj, opts = {}) {
  const physicalKey = physicalStorageKey(key);
  const fail = (msg) => { if (!opts.silent) notify(msg, "error"); return false; };
  if (!physicalKey || !CURRENT_TENANT_ID) return fail("Kaydinta weli diyaar ma aha. Mar kale isku day.");
  const branchId = isGlobalStorageKey(key) ? "__global__" : (CURRENT_BRANCH_ID || "main");

  let payload = obj;
  let merged = false;
  if (!opts.force) {
    // createIfAbsent: a record that may not exist yet (e.g. today's attendance for a class). The row is
    // still re-read below, and anything already stored is merged by id, never replaced.
    const sync = STORAGE_SYNC.get(physicalKey) || (opts.createIfAbsent ? { base: undefined, json: ABSENT } : null);
    if (!sync) return fail("Xogtan si ammaan ah looma akhrin, sidaas darteed wax lama kaydin si xogta hore loo ilaaliyo. Dib u fur bogga.");
    const cur = await readRaw(physicalKey);
    if (!cur.ok) return fail("Xogta hadda jirta lama hubin karin; wax lama kaydin. Hubi internet-ka.");
    const curJson = cur.exists ? canon(cur.value) : ABSENT;
    if (curJson !== sync.json && cur.exists) {
      const m = merge3(sync.base, obj, cur.value);
      if (m.conflict) return fail("Qalab kale ayaa xogtan beddelay oo isku-darka ma suurtagalin. Dib u soo shub bogga kadibna mar kale isku day.");
      payload = m.value;
      merged = canon(payload) !== canon(obj);
    }
  }

  try {
    const { error } = await supabase
      .from("app_storage")
      .upsert(
        {
          key: physicalKey,
          tenant_id: CURRENT_TENANT_ID,
          branch_id: branchId,
          value: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) { console.error("Storage error:", error); return fail("Kaydinta waa fashilantay. Xogtii hore waa ammaan."); }
  } catch (e) {
    console.error("Storage error:", e);
    return fail("Kaydinta waa fashilantay (isku xirka). Xogtii hore waa ammaan.");
  }
  // The screen now matches what it holds; if the stored value differs (merge), the next save merges again.
  markSynced(physicalKey, obj, true);
  LAST_MERGED = merged ? { physicalKey, value: payload } : null;
  if (merged && !opts.silent) notify("Qalab kale ayaa isbeddel sameeyay; labadaba waa la isku daray. Dib u fur bogga si aad u aragto dhammaan.", "info");
  return true;
}
async function saveArr(key, arr, opts) {
  return saveObj(key, arr, opts);
}
/* Save a list and only then show it on screen. On failure the screen is reset to what is really
   stored (or left untouched when that cannot be read), so the user never sees data that was not saved. */
async function persistList(key, next, setState) {
  const ok = await saveArr(key, next);
  if (ok) {
    const physicalKey = physicalStorageKey(key);
    if (LAST_MERGED && LAST_MERGED.physicalKey === physicalKey) {
      // Another device changed this list too: show the merged result and treat it as loaded.
      markSynced(physicalKey, LAST_MERGED.value, true);
      setState(LAST_MERGED.value);
    } else {
      setState(next);
    }
    return true;
  }
  const fresh = await loadArrSafe(key);
  if (fresh.ok && Array.isArray(fresh.data)) setState(fresh.data);
  return false;
}
async function deleteKey(key) {
  const physicalKey = physicalStorageKey(key);
  if (!physicalKey) return false;
  const { error } = await supabase
    .from("app_storage")
    .delete()
    .eq("tenant_id", CURRENT_TENANT_ID)
    .eq("key", physicalKey);
  if (error) { console.error("Delete error:", error); return false; }
  clearSynced(physicalKey);
  return true;
}
async function listKeys(prefix) {
  const physicalPrefix = physicalStorageKey(prefix);
  if (!physicalPrefix) return [];

  // Do not use SQL LIKE here: attendance keys contain underscores in the date/class
  // separator, and PostgreSQL treats each underscore as a wildcard. A literal key
  // range plus a client-side startsWith check keeps the prefix exact.
  const { data, error } = await supabase
    .from("app_storage")
    .select("key")
    .eq("tenant_id", CURRENT_TENANT_ID)
    .gte("key", physicalPrefix)
    .lt("key", `${physicalPrefix}\uffff`)
    .order("key", { ascending: true });

  if (error) {
    console.error("List error:", error);
    throw error;
  }

  return (data || [])
    .filter((row) => typeof row?.key === "string" && row.key.startsWith(physicalPrefix))
    .map((row) => logicalStorageKey(row.key));
}
async function listStorageEntries(prefix) {
  const physicalPrefix = physicalStorageKey(prefix);
  if (!physicalPrefix) return [];

  // Read key and value together. This avoids a second request per attendance class
  // and ensures a failed read cannot silently look like an empty attendance record.
  const { data, error } = await supabase
    .from("app_storage")
    .select("key, value")
    .eq("tenant_id", CURRENT_TENANT_ID)
    .gte("key", physicalPrefix)
    .lt("key", `${physicalPrefix}\uffff`)
    .order("key", { ascending: true });

  if (error) throw error;
  return (data || [])
    .filter((row) => typeof row?.key === "string" && row.key.startsWith(physicalPrefix))
    .map((row) => { markSynced(row.key, row.value, true); return { key: logicalStorageKey(row.key), value: row.value }; });
}

/* Read-only helper for reports/dashboard/exports: every attendance row under a prefix, plus how many
   could not be read, so a partial result is reported instead of looking like "no attendance". */
async function loadAttendanceRows(prefix) {
  const keys = await listKeys(prefix); // throws when the key list itself cannot be read
  let failed = 0;
  const rows = await Promise.all(keys.map(async (key) => {
    const physicalKey = physicalStorageKey(key);
    const r = physicalKey ? await readRaw(physicalKey) : { ok: false };
    if (!r.ok) { failed += 1; return null; }
    return r.exists ? r.value : null;
  }));
  return { rows: rows.filter(Boolean), failed };
}

async function loadArr(key) {
  return loadObj(key, []);
}

async function loadArrSafe(key) {
  const physicalKey = physicalStorageKey(key);

  if (!physicalKey || !CURRENT_TENANT_ID) {
    return {
      ok: false,
      data: null,
      error: new Error("Tenant storage is not ready"),
    };
  }
  const r = await readRaw(physicalKey);
  if (!r.ok) {
    clearSynced(physicalKey);
    return { ok: false, data: null, error: r.error };
  }
  markSynced(physicalKey, r.exists ? r.value : [], r.exists);
  return { ok: true, data: r.exists ? r.value : [], error: null };
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function fmtDate(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("so-SO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}
function fmtMoney(n, currency) {
  const num = Number(n) || 0;
  return `${num.toLocaleString()} ${currency || ""}`.trim();
}

/* ---------- signature geometric motif ---------- */
function SignatureChain({ className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`} aria-hidden="true">
      {Array.from({ length: 22 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            transform: "rotate(45deg)",
            backgroundColor: i % 4 === 0 ? COLORS.gold : "rgba(201,162,39,0.28)",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- entity schemas ---------- */
const USER_ROLES = ["Admin", "Maamule", "Macalin", "Xisaabiye", "Shaqaale"];

const ROLE_PERMISSIONS = {
  // Admin: awood buuxda oo ku kooban tenant-kiisa; RLS waa inuu tan ka madax-bannaanaadaa.
  Admin: ["*"],
  // Maamule: maamulka hawlgalka dugsiga; ma geli karo baaritaanka amniga/production-ka.
  Maamule: ["home", "students", "employees", "users", "classes", "attendance", "activities", "complaints", "progress", "quran", "exams", "finance", "invoices", "payroll", "reports", "sms", "parents", "communication", "idcards", "jadwal", "excel", "achievements", "daily", "config"],
  // Macalin: xogta waxbarashada; lagama oggola mushahar, maaliyad, maamulka users ama export guud.
  Macalin: ["home", "students", "classes", "attendance", "activities", "progress", "quran", "exams", "jadwal", "achievements", "daily"],
  // Xisaabiye: maaliyadda iyo warbixinnada la xiriira.
  Xisaabiye: ["home", "finance", "invoices", "payroll", "reports", "excel"],
  // Shaqaale: shaqooyinka aasaasiga ah ee loo xilsaaray.
  Shaqaale: ["home", "students", "attendance", "activities", "complaints"],
};

const ROLE_DESCRIPTIONS = {
  Admin: "Maamulka buuxa ee tenant-ka dugsiga.",
  Maamule: "Maamulka hawlgalka dugsiga, shaqaalaha, users iyo dejimaha.",
  Macalin: "Waxbarashada, fasallada, xaadirinta iyo horumarka ardayda.",
  Xisaabiye: "Maaliyadda, biilasha, mushaharka iyo warbixinnada.",
  Shaqaale: "Ardayda, xaadirinta, hawlaha iyo cabashooyinka.",
};

function canAccess(role, id) {
  const allowed = ROLE_PERMISSIONS[role] || ["home"];
  return allowed.includes("*") || allowed.includes(id);
}


function UsersScreen({ currentRole }) {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Macalin" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    loadArrSafe("user-profiles").then((res) => {
      if (!alive) return;
      if (res.ok) setUsers(Array.isArray(res.data) ? res.data : []);
      else setError("Liiska users-ka lama akhrin karin. Hubi internet-ka kadibna dib u fur bogga.");
      setLoaded(res.ok);
    });
    return () => { alive = false; };
  }, []);

  const addUser = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (form.role === "Admin" && currentRole !== "Admin") {
      setError("Admin cusub waxaa abuuri kara Admin-ka hadda jira oo keliya.");
      return;
    }
    if (currentRole === "Maamule" && !["Macalin", "Xisaabiye", "Shaqaale"].includes(form.role)) {
      setError("Maamule wuxuu abuuri karaa kaliya Macalin, Xisaabiye ama Shaqaale.");
      return;
    }
    if (!name || !email || !password) {
      setError("Magaca, email-ka iyo password-ka waa loo baahan yahay.");
      return;
    }
    if (password.length < 8 || password.length > 72) {
      setError("Password-ku waa inuu ahaadaa 8 ilaa 72 xaraf.");
      return;
    }
    if (users.some((u) => u.email?.toLowerCase() === email)) {
      setError("Email-kan hore ayaa loogu daray Users-ka NIBRAAS.");
      return;
    }

    setSaving(true);

    try {
      if (!CURRENT_TENANT_ID) {
        setError("Tenant-ka NIBRAAS lama xaqiijin.");
        return;
      }

      // User-ka waxaa lagu abuuraa Edge Function server-side si secret key-ga
      // uusan waligiis ugu soo bixin browser-ka. Function-ku wuxuu sidoo kale
      // si ammaan ah u hubiyaa in qofka hadda galay uu yahay Admin/Maamule.
      const { data, error: functionError } = await supabase.functions.invoke(
        "nibraas-admin-create-user",
        {
          body: {
            tenant_id: CURRENT_TENANT_ID,
            name,
            email,
            password,
            role: form.role,
          },
        }
      );

      if (functionError) {
        let detail = functionError.message || "User-ka lama abuuri karin.";
        try {
          const body = await functionError.context?.json?.();
          if (body?.error) detail = body.error;
        } catch (e) {
          console.warn("Edge Function error body could not be read:", e);
        }
        setError(detail);
        return;
      }

      if (!data?.user_id) {
        setError("User-ka lama xaqiijin; Edge Function-ku ID ma soo celin.");
        return;
      }

      const profile = {
        id: crypto.randomUUID(),
        authUserId: data.user_id,
        name,
        email,
        role: form.role,
        createdAt: new Date().toISOString(),
      };

      const profileSaved = await persistList("user-profiles", [...users, profile], setUsers);
      setForm({ name: "", email: "", password: "", role: "Macalin" });
      if (!profileSaved) {
        setError("Akoonka waa la abuuray, laakiin liiska profile-ka lama kaydin. Dib u fur bogga; haddii uusan ka muuqan, mar kale ku dar profile-ka.");
        return;
      }
      setMessage(
        data.existing
          ? "Akoonkan hore ayuu u jiray; waxaa lagu xidhay madrasaddan. Password-kiisii hore ayuu isticmaalayaa. Haddii uu illoobay, ha isticmaalo \"Furaha sirta ah waan ilaawaa\"."
          : "User-ka waa la abuuray, waa la xaqiijiyey, waxaana lagu xidhay NIBRAAS."
      );
    } catch (err) {
      setError(err?.message || "Wax khalad ah ayaa dhacay markii user-ka la abuurayay.");
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (user) => {
    // Browser-ka lama siinayo service-role key, sidaas darteed Auth user-ka lama tirtiro halkan.
    // Waxaan kaliya ka saareynaa profile-ka maamulka.
    if (user.authUserId && CURRENT_TENANT_ID) {
      // .select() returns the rows that were really deleted. Row-level security removes
      // nothing without an error when the caller is not an Admin, so check the count.
      const { data: removed, error } = await supabase
        .from("nibraas_memberships")
        .delete()
        .eq("tenant_id", CURRENT_TENANT_ID)
        .eq("user_id", user.authUserId)
        .select("user_id");
      if (error) {
        setError(error.message || "User-ka tenant-ka lagama saari karin.");
        return;
      }
      if (!removed || removed.length === 0) {
        setError("User-ka lama saarin. Admin keliya ayaa user ka saari kara madrasadda.");
        return;
      }
    }
    const listSaved = await persistList("user-profiles", users.filter((u) => u.id !== user.id), setUsers);
    if (!listSaved) { setError("User-ka membership-kiisa waa laga saaray, laakiin liiska profile-ka lama cusboonaysiin. Dib u fur bogga."); return; }
    setMessage("User-ka tenant-ka waa laga saaray. Auth account-ka wali wuxuu ku jiraa Supabase Auth.");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gold }}>MAAMULKA ISTICMAALAYAASHA</p>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Users & Roles</h1>
        <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>User kasta wuxuu yeelan karaa email/password u gaar ah iyo door u gaar ah.</p>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={20} style={{ color: COLORS.teal }} />
          <h2 className="font-semibold" style={{ color: COLORS.ink }}>Doorarka iyo awoodahooda</h2>
        </div>
        <p className="text-xs mb-4" style={{ color: COLORS.inkSoft }}>Liiskani wuxuu muujinayaa qaybaha App-ku u oggolaanayo door kasta. Waa xaddidaad muuqaal/App ah; RLS iyo Edge Functions waa inay sidoo kale xaqiijiyaan oggolaanshaha server-ka.</p>
        <div className="grid md:grid-cols-2 gap-3">
          {USER_ROLES.map((role) => {
            const allowed = ROLE_PERMISSIONS[role] || ["home"];
            const labels = allowed.includes("*")
              ? ["Dhammaan qaybaha App-ka"]
              : allowed.map((id) => NAV.find((item) => item.id === id)?.label || id);
            return <div key={role} className="rounded-xl border p-4" style={{ borderColor: COLORS.line }}>
              <div className="font-semibold" style={{ color: COLORS.ink }}>{role}</div>
              <p className="text-xs mt-1 mb-2" style={{ color: COLORS.inkSoft }}>{ROLE_DESCRIPTIONS[role]}</p>
              <p className="text-xs leading-5">{labels.join(" · ")}</p>
            </div>;
          })}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck size={20} style={{ color: COLORS.teal }} />
          <h2 className="font-semibold" style={{ color: COLORS.ink }}>Ku dar User cusub</h2>
        </div>
        <form onSubmit={addUser} className="grid md:grid-cols-2 gap-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Magaca" className="rounded-lg px-3 py-2.5 outline-none" style={{ border: `1px solid ${COLORS.line}` }} />
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email-ka" className="rounded-lg px-3 py-2.5 outline-none" />
          <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password (ugu yaraan 6)" className="rounded-lg px-3 py-2.5 outline-none" style={{ border: `1px solid ${COLORS.line}` }} />
          <div className="flex gap-2">
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="flex-1 rounded-lg px-3 py-2.5 outline-none" style={{ border: `1px solid ${COLORS.line}` }}>
              {USER_ROLES.filter((role) => currentRole === "Admin" || role !== "Admin").map((role) => <option key={role}>{role}</option>)}
            </select>
            <button disabled={saving} type="submit" className="px-4 rounded-lg font-semibold" style={{ backgroundColor: saving ? COLORS.inkSoft : COLORS.teal, color: "#fff" }}>
              {saving ? "Abuuraya..." : "Ku dar"}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}>{error}</p>}
        {message && <p className="mt-3 rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#EAF5EF", color: COLORS.teal }}>{message}</p>}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
        {users.length === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: COLORS.inkSoft }}>Weli user lama darin.</div>
        ) : users.map((user) => (
          <div key={user.id} className="flex items-center justify-between px-5 py-4 border-b last:border-b-0" style={{ borderColor: COLORS.line }}>
            <div>
              <p className="font-semibold" style={{ color: COLORS.ink }}>{user.name}</p>
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>{user.email} · {user.role}</p>
            </div>
            <button onClick={() => removeUser(user)} className="text-sm px-3 py-2 rounded-lg" style={{ color: COLORS.brick, backgroundColor: "#FDECEC" }}>Ka saar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

const ENTITY_SCHEMAS = {
  students: {
    key: "students",
    title: "Ardayda",
    singular: "Arday",
    icon: Users,
    fields: [
      { key: "name", label: "Magaca oo Buuxa", type: "text", required: true },
      { key: "className", label: "Fasalka", type: "text" },
      { key: "age", label: "Da'da", type: "number", min: 1, max: 120 },
      { key: "gender", label: "Jinsiga", type: "select", options: ["Lab", "Dhedig"] },
      { key: "parentName", label: "Magaca Waalidka", type: "text" },
      { key: "parentPhone", label: "Lambarka Waalidka", type: "tel" },
      { key: "status", label: "Xaalada", type: "select", options: ["Firfircoon", "Joojiyay"] },
    ],
    display: (it) => ({ title: it.name, sub: [it.className, it.status].filter(Boolean).join(" · ") }),
  },
  employees: {
    key: "employees",
    title: "Shaqaalaha",
    singular: "Shaqaale",
    icon: UserCog,
    fields: [
      { key: "name", label: "Magaca oo Buuxa", type: "text", required: true },
      { key: "role", label: "Doorka", type: "select", options: ["Macalin", "Maamule", "Xoghaye", "Kale"] },
      { key: "phone", label: "Telefoonka", type: "tel" },
      { key: "status", label: "Xaalada", type: "select", options: ["Firfircoon", "Fasax", "Ka tagay"] },
    ],
    display: (it) => ({ title: it.name, sub: [it.role, it.status].filter(Boolean).join(" · ") }),
  },
  classes: {
    key: "classes",
    title: "Fasallada",
    singular: "Fasal",
    icon: GraduationCap,
    fields: [
      { key: "name", label: "Magaca Fasalka", type: "text", required: true },
      { key: "teacher", label: "Macalinka Mas'uulka ah", type: "text" },
      { key: "schedule", label: "Jadwalka (tusaale: Aroornimo 8-10)", type: "text" },
      { key: "capacity", label: "Tirada Ardayda ee la ogol yahay", type: "number", min: 1, max: 1000 },
    ],
    display: (it) => ({ title: it.name, sub: [it.teacher, it.schedule].filter(Boolean).join(" · ") }),
  },
  activities: {
    key: "activities",
    title: "Hawlaha",
    singular: "Hawl",
    icon: CalendarClock,
    fields: [
      { key: "title", label: "Cinwaanka Hawsha", type: "text", required: true },
      { key: "date", label: "Taariikhda", type: "date" },
      { key: "location", label: "Goobta", type: "text" },
      { key: "description", label: "Faahfaahin", type: "textarea" },
    ],
    display: (it) => ({ title: it.title, sub: [fmtDate(it.date), it.location].filter(Boolean).join(" · ") }),
  },
  complaints: {
    key: "complaints",
    title: "Cabashooyinka",
    singular: "Cabasho",
    icon: AlertCircle,
    fields: [
      { key: "title", label: "Cinwaanka", type: "text", required: true },
      { key: "from", label: "Ka soo jeeda", type: "text" },
      { key: "description", label: "Faahfaahin", type: "textarea" },
      { key: "status", label: "Xaalada", type: "select", options: ["Furan", "La xaliyay"] },
    ],
    display: (it) => ({ title: it.title, sub: [it.from, it.status].filter(Boolean).join(" · ") }),
  },
  progress: {
    key: "progress",
    title: "Horumarka",
    singular: "Diwaan",
    icon: TrendingUp,
    fields: [
      { key: "studentName", label: "Magaca Ardayga", type: "text", required: true },
      { key: "subject", label: "Maadada", type: "text" },
      { key: "term", label: "Semesterka", type: "select", options: ["Semester 1", "Semester 2"] },
      { key: "score", label: "Dhibcaha", type: "number", min: 0, max: 100 },
      { key: "note", label: "Fallanqayn gaaban", type: "text" },
    ],
    display: (it) => ({ title: it.studentName, sub: [it.subject, it.score != null ? `${it.score}%` : ""].filter(Boolean).join(" · ") }),
  },
  exams: {
    key: "exams",
    title: "Imtixaannada",
    singular: "Imtixaan",
    icon: ClipboardList,
    fields: [
      { key: "name", label: "Magaca Imtixaanka", type: "text", required: true },
      { key: "subject", label: "Maadada", type: "text" },
      { key: "className", label: "Fasalka", type: "text" },
      { key: "date", label: "Taariikhda", type: "date" },
      { key: "maxScore", label: "Ugu badnaan Dhibcaha", type: "number", min: 1, max: 1000 },
    ],
    display: (it) => ({ title: it.name, sub: [it.className, fmtDate(it.date)].filter(Boolean).join(" · ") }),
  },
};

const NAV = [
  { id: "home", label: "Guriga", icon: Home },
  { id: "students", label: "Ardayda", icon: Users },
  { id: "employees", label: "Shaqaalaha", icon: UserCog },
  { id: "users", label: "Users & Roles", icon: ShieldCheck },
  { id: "classes", label: "Fasallada", icon: School },
  { id: "attendance", label: "Xaadirinta", icon: ClipboardCheck },
  { id: "jadwal", label: "Jadwalka Casharrada", icon: CalendarDays },
  { id: "daily", label: "Jadwalka Maalinlaha", icon: Clock },
  { id: "activities", label: "Hawlaha", icon: ListTodo },
  { id: "complaints", label: "Cabashooyinka", icon: MessageSquareWarning },
  { id: "progress", label: "Maadooyin & Horumar", icon: TrendingUp },
  { id: "quran", label: "Qur’aan & Xifdhi", icon: BookOpen },
  { id: "exams", label: "Imtixaannada", icon: NotebookPen },
  { id: "finance", label: "Maaliyadda", icon: Wallet },
  { id: "invoices", label: "Biilasha & Khidmadaha", icon: Receipt },
  { id: "payroll", label: "HR & Mushaharka", icon: Banknote },
  { id: "reports", label: "Warbixinno", icon: BarChart3 },
  { id: "parents", label: "Waalidiinta", icon: UsersRound },
  { id: "communication", label: "Xiriirka Waalidiinta", icon: MessageCircle },
  { id: "idcards", label: "ID Cards", icon: IdCard },
  { id: "sms", label: "Fariimaha SMS", icon: MessageSquareText },
  { id: "security", label: "Production & Security", icon: Lock },
  { id: "excel", label: "Excel / Import & Export", icon: FileSpreadsheet },
  { id: "achievements", label: "Guulaha & Tartanka", icon: Trophy },
  { id: "config", label: "Dejinta", icon: Settings },
];

/* ---------- module icon tones (one colour family per group of modules) ---------- */
const TONE_PEOPLE = { bg: "#E1EFEA", fg: "#0B3D3A" };
const TONE_LEARN = { bg: "#F6EBC8", fg: "#8A6A0A" };
const TONE_MONEY = { bg: "#E2F0DD", fg: "#2F6B3A" };
const TONE_TALK = { bg: "#F7E4DF", fg: "#A2503F" };
const TONE_SYSTEM = { bg: "#E6EAE8", fg: "#3B4F4B" };
const MODULE_TONES = {
  home: TONE_SYSTEM, students: TONE_PEOPLE, employees: TONE_PEOPLE, users: TONE_PEOPLE, parents: TONE_PEOPLE,
  classes: TONE_LEARN, attendance: TONE_LEARN, jadwal: TONE_LEARN, daily: TONE_LEARN, activities: TONE_LEARN,
  progress: TONE_LEARN, quran: TONE_LEARN, exams: TONE_LEARN, achievements: TONE_LEARN,
  finance: TONE_MONEY, invoices: TONE_MONEY, payroll: TONE_MONEY,
  complaints: TONE_TALK, communication: TONE_TALK, sms: TONE_TALK,
  reports: TONE_SYSTEM, idcards: TONE_SYSTEM, security: TONE_SYSTEM, excel: TONE_SYSTEM, config: TONE_SYSTEM,
};
function IconTile({ id, icon: Icon, size = 44, iconSize = 20, tone, className = "" }) {
  const t = tone || MODULE_TONES[id] || TONE_SYSTEM;
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.32), backgroundColor: t.bg, color: t.fg, boxShadow: "inset 0 0 0 1px rgba(11,61,58,0.06)" }}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </span>
  );
}
const PRIMARY_TABS = ["home", "students", "attendance", "finance"];

/* =========================================================
   Generic form field
========================================================= */
function FormField({ field, value, onChange, error }) {
  const base =
    "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2";
  const style = { borderColor: error ? COLORS.brick : COLORS.line, fontFamily: BODY_FONT };
  const errorId = `err-${field.key}`;
  const common = {
    className: base,
    style: { ...style, "--tw-ring-color": COLORS.gold },
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": error ? errorId : undefined,
  };
  const errorNode = error ? (
    <p id={errorId} role="alert" className="mt-1 text-xs font-medium" style={{ color: COLORS.brick }}>{error}</p>
  ) : null;
  if (field.type === "select") {
    return (
      <>
        <select {...common} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Dooro...</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {errorNode}
      </>
    );
  }
  if (field.type === "textarea") {
    return (
      <>
        <textarea
          {...common}
          style={{ ...common.style, minHeight: 80 }}
          maxLength={2000}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
        {errorNode}
      </>
    );
  }
  return (
    <>
      <input
        {...common}
        type={field.type}
        inputMode={field.type === "tel" ? "tel" : field.type === "number" ? "decimal" : undefined}
        min={field.type === "number" ? (field.min ?? 0) : undefined}
        max={field.type === "number" ? field.max : undefined}
        maxLength={field.type === "text" || field.type === "tel" ? 200 : undefined}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {errorNode}
    </>
  );
}

/* =========================================================
   Generic Entity Screen (Students / Employees / Classes / ...)
========================================================= */
function EntityScreen({ schema }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | form
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [errors, setErrors] = useState({});
  const [classStudents, setClassStudents] = useState([]);
  const [scheduleFilter, setScheduleFilter] = useState("Dhammaan");
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const storeKey = `${schema.key}-data`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadArrSafe(storeKey).then((res) => {
      if (alive) {
        setItems(res.ok && Array.isArray(res.data) ? res.data : []);
        setLoadFailed(!res.ok);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [storeKey, reloadNonce]);

  useEffect(() => {
    if (schema.key !== "classes") return;
    let alive = true;
    loadArr("students-data").then((arr) => {
      if (alive) setClassStudents(Array.isArray(arr) ? arr : []);
    }).catch((err) => console.error("Class student counts could not load:", err));
    return () => { alive = false; };
  }, [schema.key]);

const persist = (next) => persistList(storeKey, next, setItems);

  const openNew = () => {
    setFormData({});
    setErrors({});
    setEditingId(null);
    setView("form");
  };
  const openEdit = (it) => {
    setFormData(it);
    setErrors({});
    setEditingId(it.id);
    setView("form");
  };
  const submit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    for (const f of schema.fields) {
      const msg = validateField(f, formData[f.key]);
      if (msg) nextErrors[f.key] = msg;
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      notify("Fadlan sax goobaha casaanka ah.", "error");
      return;
    }
    // Trim stray spaces from text-like fields so the same value is never stored two ways
    // (e.g. a class name with a trailing space).
    const cleaned = { ...formData };
    for (const f of schema.fields) {
      if (["text", "textarea", "tel"].includes(f.type)) cleaned[f.key] = cleanText(cleaned[f.key]);
    }
    if (cleaned.className && schema.fields.some((f) => f.key === "className")) {
      // Use the official spelling from the Classes screen so "al maahiruun" is stored as "Al-maahiruun".
      const official = await loadArr("classes-data");
      const hit = official.find((c) => sameClass(c.name, cleaned.className));
      if (hit) cleaned.className = cleanText(String(hit.name));
    }
    if (schema.key === "students" && !editingId) {
      const same = items.some((it) => sameText(it.name, cleaned.name) && sameClass(it.className, cleaned.className));
      if (same && !(await askConfirm(`Arday magaca "${cleaned.name}" leh ayaa horey fasalkan ugu jira. Ma sii wadaa oo ma ku darta mar kale?`, { confirmLabel: "Haa, ku dar" }))) return;
    }
    let saved;
    if (editingId) {
      saved = await persist(items.map((it) => (it.id === editingId ? { ...it, ...cleaned } : it)));
    } else {
      const newItem = { ...cleaned, id: Date.now(), createdAt: new Date().toISOString() };
      saved = await persist([newItem, ...items]);
    }
    if (!saved) return; // keep the form open so nothing typed is lost
    notify("Waa la kaydiyay.", "success");
    setErrors({});
    setView("list");
  };
  const remove = async (id) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 2500);
      return;
    }
    const removed = await persist(items.filter((it) => it.id !== id));
    setConfirmId(null);
    if (removed) notify("Waa la tirtiray.", "success");
  };

  const filtered = items.filter((it) => {
    const d = schema.display(it);
    const matchesSearch = !search.trim() || `${d.title} ${d.sub} ${it.capacity ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const schedule = String(it.schedule || "").toLowerCase();
    const matchesSchedule = schema.key !== "classes" || scheduleFilter === "Dhammaan" || schedule.includes(scheduleFilter.toLowerCase());
    return matchesSearch && matchesSchedule;
  });
  const classStudentCount = (className) => classStudents.filter((student) => sameClass(student.className || student.class || student.fasal, className)).length;

  const Icon = schema.icon;

  if (view === "form") {
    return (
      <div className={`${schema.key === "classes" ? "max-w-3xl" : "max-w-xl"} mx-auto rounded-2xl p-4 sm:p-6`} style={schema.key === "classes" ? { backgroundColor: "#FFFFFF", border: `1px solid ${COLORS.line}`, boxShadow: "0 12px 35px rgba(8,44,42,.06)" } : undefined}>
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-1.5 text-sm mb-4 font-semibold"
          style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}
        >
          <ArrowLeft size={16} /> Dib u noqo
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          {editingId ? `Wax ka beddel ${schema.singular}` : `Ku dar ${schema.singular} Cusub`}
        </h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className={schema.key === "classes" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "space-y-4"}>
          {schema.fields.map((f) => (
            <div key={f.key} className={schema.key === "classes" && f.key === "schedule" ? "sm:col-span-2" : ""}>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}
              >
                {f.label} {f.required && <span style={{ color: COLORS.brick }}>*</span>}
              </label>
              <FormField
                field={f}
                value={formData[f.key]}
                error={errors[f.key]}
                onChange={(v) => {
                  setFormData((p) => ({ ...p, [f.key]: v }));
                  if (errors[f.key]) setErrors((p) => ({ ...p, [f.key]: undefined }));
                }}
              />
            </div>
          ))}
          <button
            type="submit"
            className={`w-full rounded-xl py-3 font-semibold text-sm mt-2 ${schema.key === "classes" ? "sm:col-span-2" : ""}`}
            style={{ backgroundColor: COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}
          >
            {editingId ? "Kaydi Beddelka" : "Kaydi"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={`${schema.key === "classes" ? "max-w-5xl" : "max-w-2xl"} mx-auto`}>
      {schema.key === "classes" && (
        <div className="rounded-2xl p-5 sm:p-6 mb-5" style={{ background: `linear-gradient(120deg, ${COLORS.tealDeep}, ${COLORS.tealLight})`, color: "#fff" }}>
          <div className="flex items-center gap-3 mb-4"><div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,.13)" }}><GraduationCap size={25} /></div><div><p className="text-xs opacity-75">MAAMULKA DUGSIGA</p><h2 className="text-2xl font-bold" style={{ fontFamily: DISPLAY_FONT }}>Maareynta Fasallada</h2></div></div>
          <p className="text-sm opacity-85">Hal meel ka maamul fasallada, macallimiinta, jadwalka iyo tirada ardayda.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,.12)" }}><p className="text-xs opacity-75">Wadarta fasallada</p><p className="text-2xl font-bold">{items.length}</p></div>
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,.12)" }}><p className="text-xs opacity-75">Ardayda fasallada ku jira</p><p className="text-2xl font-bold">{classStudents.filter((st) => st.className || st.class || st.fasal).length}</p></div>
            <div className="rounded-xl p-3 col-span-2 sm:col-span-1" style={{ backgroundColor: "rgba(255,255,255,.12)" }}><p className="text-xs opacity-75">Fasallada la shaandheeyey</p><p className="text-2xl font-bold">{filtered.length}</p></div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          {schema.key === "classes" ? "Liiska Fasallada" : schema.title}
        </h2>
        <button
          onClick={loadFailed ? () => notify("Xogta lama soo akhrin; marka hore mar kale isku day.", "error") : openNew}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep, fontFamily: BODY_FONT }}
        >
          <Plus size={16} /> Ku dar
        </button>
      </div>
      <SignatureChain className="mb-4" />

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Raadi..."
          className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm outline-none"
          style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
        />
      </div>
      {schema.key === "classes" && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <p className="text-sm" style={{ color: COLORS.inkSoft }}>Dooro fasal si aad wax uga beddesho ama u aragto xogtiisa.</p>
          <select value={scheduleFilter} onChange={(e) => setScheduleFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff" }}>
            <option value="Dhammaan">Dhammaan jadwallada</option><option value="Aroornimo">Aroornimo</option><option value="Galabnimo">Galabnimo</option><option value="Habeenimo">Habeenimo</option>
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Soo dejinaya...
        </p>
      ) : loadFailed ? (
        <LoadErrorBanner onRetry={() => { setLoading(true); setReloadNonce((n) => n + 1); }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon} text={`Wali lama gelin ${schema.title.toLowerCase()}`} />
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const d = schema.display(it);
            return (
              <div
                key={it.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-4 ${schema.key === "classes" ? "sm:px-5 sm:py-5" : "py-3"}`}
                style={{ borderColor: COLORS.line, backgroundColor: "#FFFFFF", boxShadow: schema.key === "classes" ? "0 5px 18px rgba(8,44,42,.045)" : undefined }}
              >
                <button onClick={() => openEdit(it)} className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-3">
                    {schema.key === "classes" && <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.goldSoft, color: COLORS.teal }}><GraduationCap size={21} /></div>}
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold truncate" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                        {d.title}
                      </p>
                      {d.sub && (
                        <p className="text-xs mt-1 truncate" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                          {d.sub}
                        </p>
                      )}
                    </div>
                  </div>
                  {schema.key === "classes" && (
                    <div className="flex flex-wrap gap-2 mt-3 ml-0 sm:ml-[52px]">
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: "#EAF3EF", color: COLORS.teal }}><Users size={13} /> {classStudentCount(it.name)} arday</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: COLORS.goldSoft, color: COLORS.ink }}><Clock size={13} /> {it.schedule || "Jadwal lama gelin"}</span>
                      {it.capacity && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs" style={{ backgroundColor: COLORS.sand, color: COLORS.inkSoft }}>Xad: {it.capacity}</span>}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(it)} className="p-2 rounded-lg" style={{ color: COLORS.tealLight }}>
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    className="p-2 rounded-lg text-xs font-semibold"
                    style={{ color: confirmId === it.id ? "#fff" : COLORS.brick, backgroundColor: confirmId === it.id ? COLORS.brick : "transparent" }}
                  >
                    {confirmId === it.id ? "Xaqiiji" : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: COLORS.goldSoft }}
      >
        <Icon size={22} style={{ color: COLORS.tealDeep }} />
      </div>
      <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
        {text}
      </p>
    </div>
  );
}

/* =========================================================
   Attendance Screen
========================================================= */
function AttendanceScreen() {
  const [students, setStudents] = useState([]);
  const [officialClasses, setOfficialClasses] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [className, setClassName] = useState("Dhammaan");
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [variantRecs, setVariantRecs] = useState([]); // same class saved under a different spelling
  const [rosterFailed, setRosterFailed] = useState(false);
  const [attReady, setAttReady] = useState(false); // today's saved marks were read successfully
  const [rosterNonce, setRosterNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([loadArrSafe("students-data"), loadArrSafe("classes-data")]).then(([arr, cls]) => {
      if (!alive) return;
      setRosterFailed(!arr.ok || !cls.ok);
      setStudents(arr.ok && Array.isArray(arr.data) ? arr.data : []);
      setOfficialClasses(cls.ok && Array.isArray(cls.data) ? cls.data : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [rosterNonce]);

  const classIndex = buildClassIndex(students, officialClasses);
  const classOptions = ["Dhammaan", ...classIndex.labels];
  const roster = className === "Dhammaan" ? students : students.filter((s) => sameClass(s.className, className));

  const attKey = `attendance-${date}__${className}`;
  useEffect(() => {
    let alive = true;
    setAttReady(false);
    (async () => {
      try {
        const isAll = className === "Dhammaan";
        let rec = null;
        if (!isAll) {
          const r = await readRaw(physicalStorageKey(attKey));
          if (!r.ok) throw r.error || new Error("attendance read failed");
          rec = r.exists ? r.value : null;
          markSynced(physicalStorageKey(attKey), r.exists ? r.value : null, r.exists);
        }
        let variants = [];
        const prefix = `attendance-${date}__`;

        if (isAll) {
          // "Dhammaan" is a read-only combined view of the saved class records.
          // Never create or depend on a separate Dhammaan record.
          const entries = await listStorageEntries(prefix);
          variants = entries
            .filter((entry) => entry.key.startsWith(prefix) && Array.isArray(entry.value?.records))
            .map((entry) => ({ key: entry.key, rec: entry.value }))
            .sort((a, b) => Number(a.key === attKey) - Number(b.key === attKey));
        } else {
          // Merge legacy spellings of the selected class without losing their records.
          const entries = await listStorageEntries(prefix);
          variants = entries
            .filter((entry) => entry.key.startsWith(prefix) && entry.key !== attKey &&
              sameClass(entry.key.slice(prefix.length), className) && Array.isArray(entry.value?.records))
            .map((entry) => ({ key: entry.key, rec: entry.value }));
        }

        if (!alive) return;
        const nextMarks = {};
        // Older/variant records first; the canonical selected-class record wins conflicts.
        [...variants.map((item) => item.rec), rec].forEach((record) => {
          if (!record || !Array.isArray(record.records)) return;
          record.records.forEach((item) => {
            if (item?.id != null && item.status) nextMarks[String(item.id)] = item.status;
          });
        });
        setMarks(nextMarks);
        setVariantRecs(variants);
        setSaved(false);
        setAttReady(true);
      } catch (error) {
        console.error("Attendance load error:", error);
        if (alive) notify("Xaadirinta lama soo akhrin karin. Xogta lama beddelin; hubi internet-ka oo mar kale fur.", "error");
      }
    })();
    return () => { alive = false; };
  }, [attKey, className, date]);

  const setMark = (id, status) => setMarks((p) => ({ ...p, [id]: status }));

  const save = async () => {
    if (rosterFailed || !attReady) {
      notify("Xaadirinta weli lama akhrin (ama waa guuldarraystay); wax lama kaydin si xogta hore loo ilaaliyo. Mar kale isku day.", "error");
      return;
    }
    if (className === "Dhammaan") {
      // Save every student into his/her own class record. Never write a separate "Dhammaan"
      // record: the dashboard and reports add up all records, so it would count students twice.
      const groups = new Map();
      students.forEach((s) => {
        const label = classIndex.labelOf(s.className) || "Aan fasal lahayn";
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(s);
      });
      const targets = new Set();
      let allOk = true;
      for (const [label, list] of groups) {
        const key = `attendance-${date}__${label}`;
        targets.add(key);
        const records = list.map((s) => ({ id: s.id, name: s.name, status: marks[s.id] || "Maqan" }));
        const have = new Set(records.map((r) => String(r.id)));
        const extra = [];
        variantRecs.filter((v) => sameClass(v.key.slice(`attendance-${date}__`.length), label)).forEach((v) =>
          v.rec.records.forEach((r) => { if (!have.has(String(r.id))) { have.add(String(r.id)); extra.push(r); } })
        );
        const ok = await saveObj(key, { date, className: label, records: [...records, ...extra] }, { createIfAbsent: true, silent: true });
        if (!ok) allOk = false;
      }
      if (!allOk) {
        notify("Xaadirinta qayb ahaan lama kaydin. Hubi internet-ka oo mar kale isku day.", "error");
        return;
      }
      // Remove old spellings / the old "Dhammaan" record, but only when every student in it is
      // now stored in a class record (nothing is deleted if it still holds other people).
      const known = new Set(students.map((s) => String(s.id)));
      for (const v of variantRecs) {
        if (targets.has(v.key)) continue;
        if (v.rec.records.every((r) => known.has(String(r.id)))) await deleteKey(v.key);
      }
      setVariantRecs([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }
    const records = roster.map((s) => ({ id: s.id, name: s.name, status: marks[s.id] || "Maqan" }));
    // Keep variant records for students no longer in this roster so nothing is lost
    // when the other spellings are merged into the one clean key.
    const have = new Set(records.map((r) => String(r.id)));
    const extra = [];
    variantRecs.forEach((v) => v.rec.records.forEach((r) => {
      if (!have.has(String(r.id))) { have.add(String(r.id)); extra.push(r); }
    }));
    const ok = await saveObj(attKey, { date, className, records: [...records, ...extra] }, { createIfAbsent: true, silent: true });
    if (!ok) {
      notify("Xaadirinta lama kaydin. Hubi internet-ka oo mar kale isku day.", "error");
      return;
    }
    // Remove the other spellings only after the merged record was saved successfully.
    for (const v of variantRecs) await deleteKey(v.key);
    setVariantRecs([]);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const statusStyle = (id, val, target) => {
    const active = (marks[id] || "Maqan") === target;
    return {
      backgroundColor: active ? (target === "Joogto" ? COLORS.teal : target === "Daahay" ? COLORS.gold : COLORS.brick) : "#fff",
      color: active ? "#fff" : COLORS.inkSoft,
      borderColor: COLORS.line,
    };
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
        Xaadirinta
      </h2>
      <SignatureChain className="mb-4" />

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Taariikhda
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Fasalka
          </label>
          <select
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          >
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Soo dejinaya...
        </p>
      ) : rosterFailed ? (
        <LoadErrorBanner onRetry={() => { setLoading(true); setRosterNonce((n) => n + 1); }} />
      ) : roster.length === 0 ? (
        <EmptyState icon={ClipboardCheck} text="Ma jiraan arday la diiwaan geliyay fasalkan." />
      ) : (
        <div className="space-y-2 mb-5">
          {roster.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <p className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                {s.name}
              </p>
              <div className="flex gap-1.5">
                {[
                  ["Joogto", "J"],
                  ["Daahay", "D"],
                  ["Maqan", "M"],
                ].map(([val, letter]) => (
                  <button
                    key={val}
                    onClick={() => setMark(s.id, val)}
                    className="w-9 h-9 rounded-full border text-xs font-bold flex items-center justify-center"
                    style={statusStyle(s.id, marks[s.id], val)}
                    title={val}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {roster.length > 0 && !rosterFailed && (
        <button
          onClick={save}
          disabled={!attReady}
          className="w-full rounded-lg py-3 font-semibold text-sm disabled:opacity-50"
          style={{ backgroundColor: saved ? COLORS.tealLight : COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}
        >
          {saved ? "✓ La Kaydiyay" : "Kaydi Xaadirinta"}
        </button>
      )}
    </div>
  );
}

/* =========================================================
   Finance Screen
========================================================= */
function InvoicesScreen({ config, tr }) {
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    studentId: "",
    studentName: "",
    title: "Khidmad bille",
    amount: "",
    dueDate: todayISO(),
    status: "Aan La Bixin",
    note: "",
  });

  useEffect(() => {
    Promise.all([loadArr("invoices-data"), loadArr("students-data")]).then(([inv, sts]) => {
      setInvoices(Array.isArray(inv) ? inv : []);
      setStudents(Array.isArray(sts) ? sts : []);
      setLoaded(true);
    });
  }, []);

  const persist = (next) => persistList("invoices-data", next, setInvoices);

  const chooseStudent = (id) => {
    const student = students.find((s) => String(s.id) === String(id));
    setForm((p) => ({ ...p, studentId: id, studentName: student?.name || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName) { notify("Dooro ardayga.", "error"); return; }
    const amountError = validateAmount(form.amount);
    if (amountError) { notify(amountError, "error"); return; }
    if (form.dueDate && !isValidISODate(form.dueDate)) { notify("Taariikhda dhammaadka ma saxna.", "error"); return; }
    const item = {
      ...form,
      id: `INV-${Date.now()}`,
      amount: Number(form.amount) || 0,
      createdAt: new Date().toISOString(),
    };
    if (!(await persist([item, ...invoices]))) return;
    notify("Biilka waa la kaydiyay.", "success");
    setForm({ studentId: "", studentName: "", title: "Khidmad bille", amount: "", dueDate: todayISO(), status: "Aan La Bixin", note: "" });
    setView("list");
  };

  const togglePaid = async (invoice) => {
    const next = invoices.map((x) => x.id === invoice.id ? { ...x, status: x.status === "La Bixiyay" ? "Aan La Bixin" : "La Bixiyay", paidAt: x.status === "La Bixiyay" ? null : new Date().toISOString() } : x);
    await persist(next);
  };

  const removeInvoice = async (invoice) => {
    if (!(await askConfirm(`Ma tirtirtaa biilka ${invoice.id}?`, { confirmLabel: "Tirtir", danger: true }))) return;
    await persist(invoices.filter((x) => x.id !== invoice.id));
  };

  const filtered = invoices.filter((x) => filter === "all" || (filter === "paid" ? x.status === "La Bixiyay" : x.status !== "La Bixiyay"));
  const total = invoices.reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const paid = invoices.filter((x) => x.status === "La Bixiyay").reduce((sum, x) => sum + Number(x.amount || 0), 0);
  const outstanding = total - paid;

  if (view === "form") {
    return (
      <div className="max-w-xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm mb-4 font-semibold" style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}>
          <ArrowLeft size={16} /> Dib u noqo
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Samee Biil / Khidmad</h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Ardayga *</label>
            {students.length ? (
              <StudentSearchSelect students={students} value={form.studentId} onChange={chooseStudent} placeholder="Raadi magaca ardayga..." valueKey="id" style={{ borderColor: COLORS.line }} />
            ) : (
              <input value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))} placeholder="Magaca ardayga" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Nooca khidmada</label>
              <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Qadarka *</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Taariikhda bixinta</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Faallo</label>
            <input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
          </div>
          <button type="submit" className="w-full rounded-lg py-3 font-semibold text-sm" style={{ backgroundColor: COLORS.teal, color: COLORS.sand }}>Kaydi Biilka</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>{tr?.invoices || "Biilasha & Khidmadaha"}</h2>
          <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Samee biil arday, la soco lacagta la bixiyay iyo tan harsan.</p>
        </div>
        <button onClick={() => setView("form")} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16} /> Biil cusub</button>
      </div>
      <SignatureChain className="mb-4" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Biilasha oo dhan" value={fmtMoney(total, config.currency)} />
        <StatCard label="La bixiyay" value={fmtMoney(paid, config.currency)} tone="teal" />
        <StatCard label="Harsan" value={fmtMoney(outstanding, config.currency)} tone="brick" />
      </div>
      <div className="flex gap-2 mb-4">
        {[['all','Dhammaan'],['unpaid','Aan La Bixin'],['paid','La Bixiyay']].map(([key,label]) => (
          <button key={key} onClick={() => setFilter(key)} className="rounded-full px-3 py-1.5 text-xs font-semibold border" style={{ borderColor: filter === key ? COLORS.teal : COLORS.line, backgroundColor: filter === key ? COLORS.teal : '#fff', color: filter === key ? '#fff' : COLORS.ink }}>{label}</button>
        ))}
      </div>
      {!loaded ? <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p> : filtered.length === 0 ? <EmptyState icon={FileSpreadsheet} text="Wali biil lama sameyn." /> : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="rounded-xl border px-4 py-3 bg-white" style={{ borderColor: COLORS.line }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><p className="text-sm font-semibold" style={{ color: COLORS.ink }}>{inv.studentName}</p><span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: inv.status === 'La Bixiyay' ? COLORS.goldSoft : '#F8E7E3', color: inv.status === 'La Bixiyay' ? COLORS.tealDeep : COLORS.brick }}>{inv.status}</span></div>
                  <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{inv.title} · {inv.id} · Due: {fmtDate(inv.dueDate)}</p>
                  {inv.note ? <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{inv.note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold" style={{ color: COLORS.tealLight }}>{fmtMoney(inv.amount, config.currency)}</p>
                  <button onClick={() => togglePaid(inv)} className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold" style={{ borderColor: COLORS.line }}>{inv.status === 'La Bixiyay' ? 'Ka noqo bixinta' : 'Calaamadee La Bixiyay'}</button>
                  <button onClick={() => removeInvoice(inv)} className="p-2 rounded-lg" style={{ color: COLORS.brick }} aria-label="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FinanceScreen({ config }) {
  const [txns, setTxns] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ type: "Lacag La Bixiyay", date: todayISO() });

  useEffect(() => {
    Promise.all([loadArrSafe("finance-data"), loadArr("students-data")]).then(([fin, studentList]) => {
      if (fin.ok) {
        setTxns(Array.isArray(fin.data) ? fin.data : []);
      } else {
        // Never treat a failed read as "no records": saving would overwrite the real data.
        setLoadFailed(true);
        notify("Xogta maaliyadda lama soo akhrin karin. Kaydinta waa la xiray si xogta loo ilaaliyo. Dib u cusboonaysii bogga.", "error");
      }
      setStudents(Array.isArray(studentList) ? studentList : []);
      setLoading(false);
    });
  }, []);

  // Always re-read the latest records right before writing, then apply only this one change.
  // This keeps other devices'/users' newer records and refuses to write if the read fails.
  const persist = async (mutate) => {
    if (loadFailed) { notify("Kaydinta waa la xiray: xogta maaliyadda lama akhrin. Dib u cusboonaysii bogga.", "error"); return false; }
    const fresh = await loadArrSafe("finance-data");
    if (!fresh.ok) { notify("Xogta maaliyadda lama akhrin karin; wax lama kaydin. Isku day mar kale.", "error"); return false; }
    const next = mutate(Array.isArray(fresh.data) ? fresh.data : []);
    const saved = await saveArr("finance-data", next);
    if (!saved) { notify("Kaydinta waa fashilantay. Xogtaada hore ma beddelmin.", "error"); return false; }
    setTxns(next);
    return true;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName) { notify("Dooro ardayga.", "error"); return; }
    const amountError = validateAmount(form.amount);
    if (amountError) { notify(amountError, "error"); return; }
    if (form.date && !isValidISODate(form.date)) { notify("Taariikhda ma saxna.", "error"); return; }
    if (editingId !== null) {
      const ok = await persist((cur) => cur.map(t => String(t.id) === String(editingId) ? { ...t, ...form, amount: Number(form.amount), id: t.id, updatedAt: new Date().toISOString() } : t));
      if (!ok) return;
    } else {
      const newItem = { ...form, amount: Number(form.amount), id: Date.now(), createdAt: new Date().toISOString() };
      const ok = await persist((cur) => [newItem, ...cur]);
      if (!ok) return;
    }
    setForm({ type: "Lacag La Bixiyay", date: todayISO() });
    setEditingId(null);
    setView("list");
  };

  const editTxn = (txn) => {
    setForm({ type: txn.type || "Lacag La Bixiyay", date: txn.date || todayISO(), studentName: txn.studentName || "", amount: String(txn.amount ?? ""), note: txn.note || "" });
    setEditingId(txn.id);
    setView("form");
  };

  const deleteTxn = async (txn) => {
    if (!(await askConfirm(`Ma hubtaa inaad tirtirto diiwaanka ${txn.studentName || "lacagta"}?`, { confirmLabel: "Tirtir", danger: true }))) return;
    await persist((cur) => cur.filter(t => String(t.id) !== String(txn.id)));
  };

  const collected = txns.filter((t) => t.type === "Lacag La Bixiyay").reduce((s, t) => s + Number(t.amount || 0), 0);
  const due = txns.filter((t) => t.type === "Deyn").reduce((s, t) => s + Number(t.amount || 0), 0);

  if (view === "form") {
    return (
      <div className="max-w-xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm mb-4 font-semibold" style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}>
          <ArrowLeft size={16} /> Dib u noqo
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          {editingId !== null ? "Wax ka beddel Diiwaanka Lacagta" : "Diiwaan Gelin Lacag"}
        </h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Magaca Ardayga *
            </label>
            <StudentSearchSelect students={students} value={form.studentName || ""} onChange={(v) => setForm((p) => ({ ...p, studentName: v }))} placeholder="Raadi magaca ardayga..." style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }} />
            {students.length === 0 && <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Liiska ardaydu ma soo degin. Hubi qaybta Ardayda.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                Nooca
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
              >
                <option>Lacag La Bixiyay</option>
                <option>Deyn</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                Qadarka *
              </label>
              <input
                type="number"
                value={form.amount || ""}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
                style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Taariikhda
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Faallo
            </label>
            <input
              value={form.note || ""}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            />
          </div>
          <button type="submit" className="w-full rounded-lg py-3 font-semibold text-sm" style={{ backgroundColor: COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}>
            {editingId !== null ? "Kaydi Beddelka" : "Kaydi"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          Maaliyadda
        </h2>
        <button
          onClick={() => setView("form")}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep, fontFamily: BODY_FONT }}
        >
          <Plus size={16} /> Ku dar
        </button>
      </div>
      <SignatureChain className="mb-4" />

      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard label="La Ururiyay" value={fmtMoney(collected, config.currency)} tone="teal" />
        <StatCard label="Deynta Haray" value={fmtMoney(due, config.currency)} tone="brick" />
      </div>

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Soo dejinaya...
        </p>
      ) : txns.length === 0 ? (
        <EmptyState icon={Wallet} text="Wali lama gelin diiwaan lacageed." />
      ) : (
        <div className="space-y-2">
          {txns.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                  {t.studentName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                  {fmtDate(t.date)} {t.note ? `· ${t.note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold" style={{ color: t.type === "Deyn" ? COLORS.brick : COLORS.tealLight, fontFamily: BODY_FONT }}>
                  {t.type === "Deyn" ? "-" : "+"}{fmtMoney(t.amount, config.currency)}
                </p>
                <button type="button" onClick={() => editTxn(t)} className="rounded-lg border px-2 py-1 text-xs font-semibold" style={{ borderColor: COLORS.line, color: COLORS.teal }}>Wax ka beddel</button>
                <button type="button" onClick={() => deleteTxn(t)} className="rounded-lg px-2 py-1 text-xs font-semibold" style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}>Tirtir</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone = "teal" }) {
  const bg = tone === "teal" ? COLORS.teal : tone === "brick" ? COLORS.brick : COLORS.tealLight;
  return (
    <div className="rounded-xl px-4 py-4" style={{ backgroundColor: bg }}>
      <p className="text-xs font-semibold opacity-80" style={{ color: COLORS.goldSoft, fontFamily: BODY_FONT }}>
        {label}
      </p>
      <p className="text-lg font-bold mt-1" style={{ color: "#fff", fontFamily: DISPLAY_FONT }}>
        {value}
      </p>
    </div>
  );
}


/* =========================================================
   Parents / Parent Portal Screen
========================================================= */
function ParentsScreen() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState("parents");
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    studentName: "",
    relation: "Aabe",
    portalStatus: "Aan la hawlgelin",
  });

  useEffect(() => {
    Promise.all([loadArrSafe("parents-data"), loadArrSafe("students-data")]).then(([p, s]) => {
      const savedParents = p.ok && Array.isArray(p.data) ? p.data : [];
      const studentList = s.ok && Array.isArray(s.data) ? s.data : [];
      if (!p.ok || !s.ok) setLoadFailed(true);
      // Waalidka lagu qoray diiwaangelinta ardayga ha uga muuqdo Parent Portal,
      // si aan mar labaad xog isku mid ah loo qorin.
      const known = new Set(savedParents.map(x => `${String(x.phone || "").replace(/\D/g, "")}|${String(x.name || "").trim().toLowerCase()}`));
      const linked = studentList.filter(st => String(st.parentName || "").trim() && String(st.parentPhone || "").trim()).map(st => {
        const key = `${String(st.parentPhone).replace(/\D/g, "")}|${String(st.parentName).trim().toLowerCase()}`;
        if (known.has(key)) return null;
        known.add(key);
        return { id: `student-parent-${st.id}`, name: st.parentName, phone: st.parentPhone, email: "", studentName: st.name, relation: "Mas'uul", portalStatus: "Aan la hawlgelin", linkedFromStudent: true };
      }).filter(Boolean);
      setParents([...linked, ...savedParents]);
      setStudents(studentList);
      setLoaded(true);
    });
  }, []);

  // Saved explicitly after each change (no auto-save effect): a failed read can never overwrite stored parents.
  const persistParents = (next) => persistList("parents-data", next, setParents);

  const resetForm = () => {
    setForm({
      name: "",
      phone: "",
      email: "",
      studentName: "",
      relation: "Aabe",
      portalStatus: "Aan la hawlgelin",
    });
  };

  const saveParent = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.studentName.trim()) return;

    const item = {
      id: crypto.randomUUID(),
      ...form,
      createdAt: new Date().toISOString(),
    };
    if (!(await persistParents([item, ...parents]))) return;
    notify("Waalidka waa la kaydiyay.", "success");
    resetForm();
    setView("parents");
  };

  const removeParent = async (id) => {
    const next = parents.filter((p) => p.id !== id);
    if (!(await persistParents(next))) return;
    if (selectedId === id) setSelectedId("");
  };

  const togglePortal = (parent) => {
    const nextStatus =
      parent.portalStatus === "Firfircoon" ? "Aan la hawlgelin" : "Firfircoon";
    persistParents(parents.map((p) => (p.id === parent.id ? { ...p, portalStatus: nextStatus } : p)));
  };

  const filtered = parents.filter((p) =>
    [p.name, p.phone, p.email, p.studentName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const selected = parents.find((p) => p.id === selectedId) || filtered[0] || null;

  const openPortal = (parent) => {
    setSelectedId(parent.id);
    setView("portal");
  };

  if (view === "add") {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          type="button"
          onClick={() => setView("parents")}
          className="flex items-center gap-2 text-sm font-semibold mb-5"
          style={{ color: COLORS.teal, fontFamily: BODY_FONT }}
        >
          <ArrowLeft size={16} /> Dib ugu noqo Waalidiinta
        </button>

        <div className="rounded-2xl border p-5 md:p-6" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gold }}>WAALIDIINTA</p>
          <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
            Ku dar Waalid
          </h1>
          <p className="text-sm mb-6" style={{ color: COLORS.inkSoft }}>
            Waalidka ku xir ardayga si xogta dugsiga loogu diyaariyo Parent Portal.
          </p>

          <form onSubmit={saveParent} className="grid md:grid-cols-2 gap-4">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Magaca waalidka"
              required
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Telefoonka"
              required
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email-ka (ikhtiyaari)"
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            />
            <StudentSearchSelect students={students} value={form.studentName} onChange={(v) => setForm({ ...form, studentName: v })} placeholder="Raadi magaca ardayga..." className="rounded-lg border px-3 py-2.5 outline-none" style={{ borderColor: COLORS.line }} />
            <select
              value={form.relation}
              onChange={(e) => setForm({ ...form, relation: e.target.value })}
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            >
              <option>Aabe</option>
              <option>Hooyo</option>
              <option>Walaal</option>
              <option>Mas'uul</option>
              <option>Kale</option>
            </select>
            <select
              value={form.portalStatus}
              onChange={(e) => setForm({ ...form, portalStatus: e.target.value })}
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            >
              <option>Aan la hawlgelin</option>
              <option>Firfircoon</option>
            </select>

            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 rounded-lg py-3 font-semibold"
                style={{ backgroundColor: COLORS.teal, color: "#fff" }}
              >
                Kaydi Waalidka
              </button>
              <button
                type="button"
                onClick={() => { resetForm(); setView("parents"); }}
                className="px-5 rounded-lg font-semibold"
                style={{ backgroundColor: COLORS.sandDeep, color: COLORS.ink }}
              >
                Ka noqo
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (view === "portal") {
    const student = students.find((s) => sameText(s.name, selected?.studentName));
    const progress = [];
    const exams = [];
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.gold }}>PARENT PORTAL</p>
            <h1 className="text-3xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
              Aragtida Waalidka
            </h1>
            <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
              Tani waa preview-ka xogta uu waalidku arki doono.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setView("parents")}
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
            style={{ backgroundColor: COLORS.teal, color: "#fff" }}
          >
            <ArrowLeft size={16} /> Waalidiinta
          </button>
        </div>

        <div className="rounded-2xl border p-5 mb-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold" style={{ color: COLORS.inkSoft }}>WAALID</p>
              <h2 className="text-xl font-semibold" style={{ color: COLORS.ink }}>{selected?.name || "—"}</h2>
              <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
                {selected?.relation || ""} · {selected?.phone || ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: COLORS.inkSoft }}>Ardayga</p>
              <p className="font-semibold" style={{ color: COLORS.teal }}>{selected?.studentName || "—"}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-3 mb-5">
          {[
            ["Xaadirin", "—"],
            ["Horumar", "—"],
            ["Imtixaan", "—"],
            ["Maaliyad", "—"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <p className="text-xs" style={{ color: COLORS.inkSoft }}>{label}</p>
              <p className="text-xl font-bold mt-1" style={{ color: COLORS.ink }}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
            <h3 className="font-semibold mb-3" style={{ color: COLORS.ink }}>Xogta Ardayga</h3>
            {student ? (
              <div className="space-y-2 text-sm" style={{ color: COLORS.inkSoft }}>
                <p><strong style={{ color: COLORS.ink }}>Magac:</strong> {student.name}</p>
                <p><strong style={{ color: COLORS.ink }}>Fasal:</strong> {student.className || "—"}</p>
                <p><strong style={{ color: COLORS.ink }}>Xaalad:</strong> {student.status || "—"}</p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>Xogta ardayga lama helin.</p>
            )}
          </div>

          <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
            <h3 className="font-semibold mb-3" style={{ color: COLORS.ink }}>Fariin / Ogeysiis</h3>
            <p className="text-sm" style={{ color: COLORS.inkSoft }}>
              Parent Portal-ka dhabta ah waxaa tallaabada xigta lagu xiriirin doonaa Supabase Auth si waalid kasta u yeesho login u gaar ah.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: COLORS.gold }}>WAALIDIINTA</p>
          <h1 className="text-3xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
            Parent Portal
          </h1>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
            Maamul waalidiinta, xiriirkooda iyo ardayda ay masuulka ka yihiin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { resetForm(); setView("add"); }}
          className="flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold"
          style={{ backgroundColor: COLORS.teal, color: "#fff" }}
        >
          <Plus size={17} /> Ku dar Waalid
        </button>
      </div>
      <FeatureStatusBanner
        working="Diiwaangelinta waalidiinta, ku xirka ardayda iyo eegista xogta ardayga."
        notConnected="Parent Portal-ka dhabta ah: waalid weli ma geli karo (login u gaar ah ma jiro). Xaaladda “Firfircoon” waa calaamad gudaha ah oo keliya."
      />

      <div className="rounded-xl border p-4 mb-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="flex items-center gap-2">
          <Search size={17} style={{ color: COLORS.inkSoft }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Raadi waalid, arday ama telefoon..."
            className="w-full outline-none text-sm"
            style={{ fontFamily: BODY_FONT }}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} text="Weli waalid lama darin." />
      ) : (
        <div className="space-y-3">
          {filtered.map((parent) => (
            <div key={parent.id} className="rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold" style={{ color: COLORS.ink }}>{parent.name}</h3>
                  <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
                    {parent.relation} · {parent.phone} · Arday: {parent.studentName}
                  </p>
                  {parent.email && <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{parent.email}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => togglePortal(parent)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{
                      backgroundColor: parent.portalStatus === "Firfircoon" ? "#EAF5EF" : COLORS.sandDeep,
                      color: parent.portalStatus === "Firfircoon" ? COLORS.teal : COLORS.ink,
                    }}
                  >
                    {parent.portalStatus}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPortal(parent)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: COLORS.goldSoft, color: COLORS.tealDeep }}
                  >
                    Arag Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => removeParent(parent.id)}
                    className="rounded-lg px-3 py-2 text-xs font-semibold"
                    style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}
                  >
                    Tirtir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SMS Screen
========================================================= */
function SmsScreen({ tr }) {
  const [log, setLog] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("Dhammaan Waalidiinta");
  const [selectedParent, setSelectedParent] = useState("");
  const [selectedClass, setSelectedClass] = useState("Dhammaan");
  const [customTo, setCustomTo] = useState("");
  const [message, setMessage] = useState("");
  const [template, setTemplate] = useState("");
  const [sending, setSending] = useState(false);
  const [sentFlash, setSentFlash] = useState(false);
  const [search, setSearch] = useState("");

  const templates = [
    { id: "absence", label: "Maqnaansho", text: "Salaan. Waxaan idin ogeysiinaynaa in ardayga uu maanta maqnaa. Fadlan la xiriir maamulka haddii loo baahdo." },
    { id: "fee", label: "Lacag / Fee", text: "Salaan. Tani waa xusuusin ku saabsan lacagta dugsiga ee weli harsan. Fadlan la xiriir maamulka si aad u xaqiijiso bixinta." },
    { id: "exam", label: "Imtixaan", text: "Salaan. Waxaa jira ogeysiis ku saabsan imtixaanka ardayga. Fadlan hubi jadwalka iyo waqtiga imtixaanka." },
    { id: "result", label: "Natiijo", text: "Salaan. Natiijada waxbarashada ardayga waa diyaar. Fadlan la xiriir madrasada haddii aad u baahan tahay faahfaahin." },
    { id: "general", label: "Ogeysiis guud", text: "Salaan. Tani waa ogeysiis ka yimid NIBRAAS / maamulka madrasada." },
  ];

  useEffect(() => {
    Promise.all([loadArr("sms-log"), loadArr("parents-data"), loadArr("students-data")]).then(([sms, parentList, studentList]) => {
      setLog(Array.isArray(sms) ? sms : []);
      setParents(Array.isArray(parentList) ? parentList : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setLoading(false);
    });
  }, []);

  const classes = buildClassIndex(students).labels;
  const filteredParents = parents.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [p.name, p.phone, p.email, p.studentName, p.relationship]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const applyTemplate = (id) => {
    const found = templates.find((t) => t.id === id);
    setTemplate(id);
    if (found) setMessage(found.text);
  };

  const buildRecipient = () => {
    if (to === "Waalid Gaar ah") {
      const p = parents.find((x) => String(x.id) === String(selectedParent));
      return p ? (p.phone || p.name || "Waalid aan la magacaabin") : "Waalid aan la dooran";
    }
    if (to === "Fasal") return selectedClass === "Dhammaan" ? "Dhammaan Fasalada" : `Fasal: ${selectedClass}`;
    if (to === "Shaqaalaha") return "Shaqaalaha";
    if (to === "Lambar Gaar ah") return customTo.trim() || "Lambar aan la gelin";
    return "Dhammaan Waalidiinta";
  };

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    const entry = {
      id: Date.now(),
      to: buildRecipient(),
      targetType: to,
      className: to === "Fasal" ? selectedClass : null,
      template: template || null,
      message: message.trim(),
      status: "queued",
      sentAt: new Date().toISOString(),
    };
    const next = [entry, ...log];
    const saved = await persistList("sms-log", next, setLog);
    if (!saved) { setSending(false); return; }
    setMessage("");
    setTemplate("");
    setCustomTo("");
    setSelectedParent("");
    setSending(false);
    setSentFlash(true);
    setTimeout(() => setSentFlash(false), 2200);
  };

  const removeLog = async (id) => {
    const next = log.filter((x) => x.id !== id);
    await persistList("sms-log", next, setLog);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          SMS & Notifications
        </h2>
        <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Samee fariin, dooro cidda loo dirayo, oo hayso taariikhda fariimaha. SMS dhab ah wuxuu u baahan doonaa provider/API marka dambe.
        </p>
      </div>
      <FeatureStatusBanner
        working="Qorista fariimaha, dooridda cidda, templates-ka iyo kaydinta taariikhda."
        notConnected="Dirista SMS-ga dhabta ah (ma jiro SMS provider/API). Fariimaha waxay ku kaydsan yihiin taariikhda kaliya; waalidiinta looma gaarsiin."
      />
      <SignatureChain className="mb-4" />

      <div className="grid md:grid-cols-3 gap-3 mb-5">
        {[
          ["Fariimo", log.length],
          ["Waalidiin", parents.length],
          ["Arday", students.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
            <p className="text-lg font-bold" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="space-y-4 mb-8 rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Loo Diray</label>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}>
              <option>Dhammaan Waalidiinta</option>
              <option>Fasal</option>
              <option>Waalid Gaar ah</option>
              <option>Shaqaalaha</option>
              <option>Lambar Gaar ah</option>
            </select>
          </div>
          {to === "Fasal" && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Fasal</label>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}>
                <option>Dhammaan</option>
                {classes.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
          {to === "Waalid Gaar ah" && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Waalid</label>
              <select value={selectedParent} onChange={(e) => setSelectedParent(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}>
                <option value="">Dooro waalid</option>
                {filteredParents.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ""}</option>)}
              </select>
            </div>
          )}
          {to === "Lambar Gaar ah" && (
            <input value={customTo} onChange={(e) => setCustomTo(e.target.value)} placeholder="+252..." className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }} />
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Template</label>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button key={t.id} type="button" onClick={() => applyTemplate(t.id)} className="rounded-lg px-3 py-2 text-xs font-semibold border" style={{ borderColor: template === t.id ? COLORS.teal : COLORS.line, backgroundColor: template === t.id ? COLORS.goldSoft : "#fff", color: COLORS.ink, fontFamily: BODY_FONT }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Fariinta</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Qor fariinta..." className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, minHeight: 110, fontFamily: BODY_FONT }} />
          <p className="text-xs mt-1 text-right" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{message.length} xaraf</p>
        </div>

        <button type="submit" disabled={sending || !message.trim()} className="w-full rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2" style={{ backgroundColor: sentFlash ? COLORS.tealLight : COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT, opacity: sending || !message.trim() ? 0.65 : 1 }}>
          <Send size={15} /> {sending ? "Kaydinaya..." : sentFlash ? "La Kaydiyay!" : "Kaydi Fariinta (SMS lama dirayo)"}
        </button>
      </form>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>Taariikhda Fariimaha</h3>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi..." className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }} />
      </div>
      {loading ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>Soo dejinaya...</p>
      ) : log.length === 0 ? (
        <EmptyState icon={MessageSquare} text="Wali lama dirin fariin." />
      ) : (
        <div className="space-y-2">
          {log.filter((l) => !search.trim() || `${l.to} ${l.message}`.toLowerCase().includes(search.toLowerCase())).map((l) => (
            <div key={l.id} className="rounded-xl border px-4 py-3" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <div>
                  <p className="text-xs font-bold" style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}>{l.to}</p>
                  {l.status && <p className="text-[11px]" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{l.status === "queued" ? "La diyaariyay — provider SMS lama xirin" : l.status}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{new Date(l.sentAt).toLocaleString("so-SO")}</p>
                  <button type="button" onClick={() => removeLog(l.id)} title="Tirtir" style={{ color: COLORS.brick }}><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-sm" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>{l.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Reports Screen
========================================================= */
function ParentCommunicationScreen() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [logs, setLogs] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState("compose");
  const [selectedParent, setSelectedParent] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [filter, setFilter] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [templateText, setTemplateText] = useState("");

  useEffect(() => {
    Promise.all([
      loadArr("parents-data"),
      loadArr("students-data"),
      loadArr("attendance-history"),
      loadArr("parent-communication-log"),
      loadArr("parent-message-templates"),
    ]).then(([p, st, att, lg, tp]) => {
      setParents(Array.isArray(p) ? p : []);
      setStudents(Array.isArray(st) ? st : []);
      setAttendance(Array.isArray(att) ? att : []);
      setLogs(Array.isArray(lg) ? lg : []);
      setTemplates(Array.isArray(tp) ? tp : []);
      setLoaded(true);
    });
  }, []);

  const parentStudents = (parent) => students.filter((s) => {
    const ids = [s.id, s.studentId].filter(Boolean).map(String);
    return ids.includes(String(parent?.studentId)) || ids.includes(String(parent?.student?.id));
  });

  const visibleParents = parents.filter((p) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    const student = students.find((s) => String(s.id) === String(p.studentId));
    return [p.name, p.phone, p.email, student?.name].filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const selected = parents.find((p) => String(p.id) === String(selectedParent));

  const saveLog = async (item) => {
    const next = [item, ...logs];
    return persistList("parent-communication-log", next, setLogs);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    const item = {
      id: crypto.randomUUID(),
      parentId: selected.id,
      parentName: selected.name,
      studentId: selected.studentId || null,
      channel: selected.phone ? "SMS" : "Portal",
      subject: subject.trim() || "Ogeysiis NIBRAAS",
      message: message.trim(),
      status: "La diyaariyey",
      createdAt: new Date().toISOString(),
    };
    const saved = await saveLog(item);
    if (!saved) return; // keep what the user typed
    setMessage("");
    setSubject("");
  };

  const createAbsenceAlerts = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const absentIds = attendance.filter((a) => {
      const date = a.date || a.attendanceDate;
      const status = String(a.status || "").toLowerCase();
      return date === today && ["maqan", "absent", "maqan/maqan"].some((x) => status.includes(x));
    }).map((a) => String(a.studentId || a.id));
    const alerts = parents.filter((p) => absentIds.includes(String(p.studentId))).map((p) => ({
      id: crypto.randomUUID(), parentId: p.id, parentName: p.name, studentId: p.studentId || null,
      channel: p.phone ? "SMS" : "Portal", subject: "Ogeysiis Xaadirin",
      message: "Waxaan ku wargelinaynaa in ardayga maanta lagu diiwaangeliyey maqnaansho.",
      status: "La diyaariyey", createdAt: new Date().toISOString(), automated: true,
    }));
    if (!alerts.length) { notify("Maanta lama helin maqnaansho si alert loogu sameeyo."); return; }
    const next = [...alerts, ...logs];
    const saved = await persistList("parent-communication-log", next, setLogs);
    if (!saved) return;
    notify(`${alerts.length} ogeysiis waalid ayaa la diyaariyey.`, "success");
    setMode("history");
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim() || !templateText.trim()) return;
    const item = { id: crypto.randomUUID(), name: templateName.trim(), text: templateText.trim(), createdAt: new Date().toISOString() };
    const next = [item, ...templates];
    const saved = await persistList("parent-message-templates", next, setTemplates);
    if (!saved) return;
    setTemplateName(""); setTemplateText("");
  };

  const deleteTemplate = async (id) => {
    const next = templates.filter((x) => x.id !== id);
    await persistList("parent-message-templates", next, setTemplates);
  };

  const markSent = async (id) => {
    const next = logs.map((x) => x.id === id ? { ...x, status: "La diray" } : x);
    await persistList("parent-communication-log", next, setLogs);
  };

  const tabs = [
    ["compose", "Qor Farriin"], ["alerts", "Absence Alerts"], ["templates", "Templates"], ["history", "Taariikhda"],
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl p-6" style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealLight})`, color: "white" }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">NIBRAAS Communication Center</div>
            <h1 className="text-3xl font-semibold mt-1" style={{ fontFamily: DISPLAY_FONT }}>Xiriirka Waalidiinta</h1>
            <p className="text-sm opacity-85 mt-2 max-w-2xl">Hal meel oo lagu diyaariyo farriimaha waalidiinta, ogeysiisyada maqnaanshaha, templates iyo taariikhda xiriirka.</p>
          </div>
          <MessageSquare size={42} />
        </div>
      </div>

      <FeatureStatusBanner
        working="Diyaarinta farriimaha, ogeysiisyada maqnaanshaha, templates-ka iyo taariikhda xiriirka."
        notConnected="Dirista dhabta ah ee SMS iyo Parent Portal (ma jiro provider/login waalid). Xaaladda “La diyaariyey / La diray” waa calaamad gacan-ku-sameysan; waxba looma gaarsiin waalidka."
      />
      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => <button key={id} onClick={() => setMode(id)} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: mode === id ? COLORS.teal : "white", color: mode === id ? "white" : COLORS.ink, border: `1px solid ${COLORS.line}` }}>{label}</button>)}
      </div>

      {mode === "compose" && (
        <div className="grid lg:grid-cols-[1fr_1.2fr] gap-5">
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: COLORS.line }}>
            <h2 className="font-semibold mb-4">Dooro Waalid</h2>
            <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Raadi magac, telefoon ama arday..." className="w-full rounded-lg border px-3 py-2.5 mb-3" style={{ borderColor: COLORS.line }} />
            <div className="space-y-2 max-h-96 overflow-auto">
              {visibleParents.map((p) => {
                const st = students.find((s) => String(s.id) === String(p.studentId));
                return <button key={p.id} onClick={() => setSelectedParent(p.id)} className="w-full text-left p-3 rounded-xl border" style={{ borderColor: String(p.id) === String(selectedParent) ? COLORS.teal : COLORS.line, background: String(p.id) === String(selectedParent) ? COLORS.sand : "white" }}><div className="font-semibold">{p.name}</div><div className="text-xs" style={{ color: COLORS.inkSoft }}>{st?.name || "Arday lama xirin"}{p.phone ? ` · ${p.phone}` : ""}</div></button>;
              })}
              {!visibleParents.length && <div className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Waalid lama helin.</div>}
            </div>
          </div>
          <form onSubmit={sendMessage} className="rounded-2xl border bg-white p-5 space-y-4" style={{ borderColor: COLORS.line }}>
            <h2 className="font-semibold">Farriin cusub</h2>
            <div className="text-sm p-3 rounded-lg" style={{ background: COLORS.sand }}>{selected ? `Ku socota: ${selected.name}${selected.phone ? ` · ${selected.phone}` : ""}` : "Marka hore dooro waalid."}</div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Cinwaanka farriinta" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={7} placeholder="Qor farriinta..." className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
            <button disabled={!selected || !message.trim()} className="px-5 py-2.5 rounded-lg font-semibold text-white disabled:opacity-50" style={{ background: COLORS.teal }}>Diyaari Farriinta</button>
            <p className="text-xs" style={{ color: COLORS.inkSoft }}>NIBRAAS wuxuu kaydinayaa farriinta iyo taariikhdeeda. Dirista SMS-ga dhabta ah waxay u baahan tahay SMS provider/API.</p>
          </form>
        </div>
      )}

      {mode === "alerts" && (
        <div className="rounded-2xl border bg-white p-6" style={{ borderColor: COLORS.line }}>
          <h2 className="text-xl font-semibold mb-2">Ogeysiisyada Maqnaanshaha</h2>
          <p className="text-sm mb-5" style={{ color: COLORS.inkSoft }}>Samee farriimo diyaarsan oo waalidiinta loo diro marka arday maqnaado. Maanta oo keliya ayaa la baarayaa.</p>
          <button onClick={createAbsenceAlerts} className="px-5 py-2.5 rounded-lg font-semibold text-white" style={{ background: COLORS.teal }}>Samee Absence Alerts</button>
          <div className="mt-6 grid sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl" style={{ background: COLORS.sand }}><div className="text-xs">Waalidiin</div><strong className="text-2xl">{parents.length}</strong></div>
            <div className="p-4 rounded-xl" style={{ background: COLORS.sand }}><div className="text-xs">Farriimo</div><strong className="text-2xl">{logs.length}</strong></div>
            <div className="p-4 rounded-xl" style={{ background: COLORS.sand }}><div className="text-xs">Templates</div><strong className="text-2xl">{templates.length}</strong></div>
          </div>
        </div>
      )}

      {mode === "templates" && (
        <div className="grid lg:grid-cols-2 gap-5">
          <form onSubmit={saveTemplate} className="rounded-2xl border bg-white p-5 space-y-4" style={{ borderColor: COLORS.line }}>
            <h2 className="font-semibold">Template cusub</h2>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Magaca template-ka" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
            <textarea value={templateText} onChange={(e) => setTemplateText(e.target.value)} rows={6} placeholder="Qoraalka template-ka..." className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
            <button className="px-5 py-2.5 rounded-lg font-semibold text-white" style={{ background: COLORS.teal }}>Kaydi Template</button>
          </form>
          <div className="rounded-2xl border bg-white p-5" style={{ borderColor: COLORS.line }}>
            <h2 className="font-semibold mb-3">Templates-ka jira</h2>
            <div className="space-y-3">{templates.map((t) => <div key={t.id} className="p-3 rounded-xl border" style={{ borderColor: COLORS.line }}><div className="flex justify-between gap-3"><strong>{t.name}</strong><button onClick={() => deleteTemplate(t.id)} title="Delete"><Trash2 size={16} /></button></div><p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>{t.text}</p></div>)}{!templates.length && <div className="text-sm" style={{ color: COLORS.inkSoft }}>Template weli lama abuurin.</div>}</div>
          </div>
        </div>
      )}

      {mode === "history" && (
        <div className="rounded-2xl border bg-white p-5" style={{ borderColor: COLORS.line }}>
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Taariikhda Xiriirka</h2><span className="text-xs" style={{ color: COLORS.inkSoft }}>{logs.length} records</span></div>
          <div className="space-y-3">{logs.map((x) => <div key={x.id} className="p-4 rounded-xl border" style={{ borderColor: COLORS.line }}><div className="flex justify-between gap-3 flex-wrap"><div><strong>{x.parentName}</strong><div className="text-xs" style={{ color: COLORS.inkSoft }}>{x.channel} · {fmtDate(x.createdAt?.slice(0,10))}</div></div><button onClick={() => markSent(x.id)} disabled={x.status === "La diray"} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: x.status === "La diray" ? COLORS.sandDeep : COLORS.goldSoft }}>{x.status}</button></div><div className="text-sm mt-2"><strong>{x.subject}</strong><p className="mt-1">{x.message}</p></div></div>)}{!logs.length && <div className="text-center py-10 text-sm" style={{ color: COLORS.inkSoft }}>Weli ma jiro taariikh xiriir.</div>}</div>
        </div>
      )}
    </div>
  );
}

function ReportsScreen({ config }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    students: [], employees: [], finance: [], complaints: [], activities: [],
    progress: [], exams: [], examResults: [], quran: [], payroll: [], attendance: [],
  });
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    className: "Dhammaan",
    student: "Dhammaan",
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const [students, employees, finance, complaints, activities, academicProgress, progressData, exams, examResults, quran, payroll] =
        await Promise.all([
          loadArr("students-data"),
          loadArr("employees-data"),
          loadArr("finance-data"),
          loadArr("complaints-data"),
          loadArr("activities-data"),
          loadArr("academic-progress-data"),
          loadArr("progress-data"),
          loadArr("exams-data"),
          loadArr("exam-results-data"),
          loadArr("quran-progress-data"),
          loadArr("payroll-data"),
        ]);

      let attendance = [];
      try {
        const { rows, failed } = await loadAttendanceRows("attendance-");
        if (failed) notify(`Warbixinta waa dhammaystiran tahay: ${failed} diiwaan xaadirin lama akhrin karin.`, "error");
        attendance = rows.flatMap((row) =>
          (row.records || []).map((record) => ({
            ...record,
            date: row.date,
            className: row.className,
          }))
        );
      } catch (e) {
        console.error("Reports attendance error:", e);
        notify("Xaadirinta lama soo akhrin karin; warbixintu xaadirin kuma jirto.", "error");
      }

      setData({
        students: Array.isArray(students) ? students : [],
        employees: Array.isArray(employees) ? employees : [],
        finance: Array.isArray(finance) ? finance : [],
        complaints: Array.isArray(complaints) ? complaints : [],
        activities: Array.isArray(activities) ? activities : [],
        progress: [
          ...(Array.isArray(progressData) ? progressData : []),
          ...(Array.isArray(academicProgress) ? academicProgress : []),
        ].filter((item, index, arr) => arr.findIndex((x) => String(x.id) === String(item.id)) === index),
        exams: Array.isArray(exams) ? exams : [],
        examResults: Array.isArray(examResults) ? examResults : [],
        quran: Array.isArray(quran) ? quran : [],
        payroll: Array.isArray(payroll) ? payroll : [],
        attendance,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const inRange = (date) => {
    if (!date) return true;
    const d = String(date).slice(0, 10);
    if (filters.from && d < filters.from) return false;
    if (filters.to && d > filters.to) return false;
    return true;
  };

  const selectedStudent = filters.student === "Dhammaan" ? "" : filters.student;
  const selectedClass = filters.className === "Dhammaan" ? "" : filters.className;

  const filteredStudents = data.students.filter((s) => {
    if (selectedStudent && !sameText(s.name, selectedStudent)) return false;
    if (selectedClass && !sameClass(s.className, selectedClass)) return false;
    return true;
  });

  const filteredAttendance = data.attendance.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedClass && !sameClass(r.className, selectedClass)) return false;
    if (selectedStudent && !sameText(r.name, selectedStudent)) return false;
    return true;
  });

  const filteredProgress = data.progress.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedStudent && !sameText(r.studentName, selectedStudent)) return false;
    if (selectedClass) {
      const student = data.students.find((s) => sameText(s.name, r.studentName));
      if (!sameClass(student?.className, selectedClass)) return false;
    }
    return true;
  });

  const filteredQuran = data.quran.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedStudent && !sameText(r.studentName, selectedStudent)) return false;
    if (selectedClass) {
      const student = data.students.find((s) => sameText(s.name, r.studentName));
      if (!sameClass(student?.className, selectedClass)) return false;
    }
    return true;
  });

  const filteredExamResults = data.examResults.filter((r) => {
    const exam = data.exams.find((e) => String(e.id) === String(r.examId));
    if (!inRange(exam?.date)) return false;
    if (selectedStudent && !sameText(r.studentName, selectedStudent)) return false;
    if (selectedClass && !sameClass(exam?.className, selectedClass)) return false;
    return true;
  });

  const filteredFinance = data.finance.filter((t) => {
    const date = t.date || t.createdAt;
    return inRange(date);
  });

  const filteredPayroll = data.payroll.filter((p) => {
    const date = p.date || p.month || p.createdAt;
    return inRange(date);
  });

  const present = filteredAttendance.filter((r) => r.status === "Joogto" || r.status === "Maqan" || r.status === "Daahday" || r.status === "La fasaxay");
  const presentCount = filteredAttendance.filter((r) => r.status === "Joogto").length;
  const attendanceRate = filteredAttendance.length ? Math.round((presentCount / filteredAttendance.length) * 100) : null;

  const collected = filteredFinance
    .filter((t) => t.type === "Lacag La Bixiyay")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const due = filteredFinance
    .filter((t) => t.type === "Deyn")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const expenses = filteredFinance
    .filter((t) => t.type === "Kharash")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const scoredProgress = filteredProgress.filter((r) => typeof r.score === "number" && Number.isFinite(r.score));
  const progressAverage = scoredProgress.length
    ? Math.round(scoredProgress.reduce((sum, r) => sum + r.score, 0) / scoredProgress.length)
    : null;

  const examScores = filteredExamResults
    .map((r) => {
      const exam = data.exams.find((e) => String(e.id) === String(r.examId));
      const max = Number(exam?.maxScore || 100);
      return max > 0 ? (Number(r.score || 0) / max) * 100 : null;
    })
    .filter((v) => v != null && Number.isFinite(v));
  const examAverage = examScores.length
    ? Math.round(examScores.reduce((a, b) => a + b, 0) / examScores.length)
    : null;

  const payrollTotal = filteredPayroll.reduce((sum, p) => sum + Number(p.netSalary ?? p.net ?? 0), 0);
  const openComplaints = data.complaints.filter((c) => c.status !== "La xaliyay").length;
  const upcoming = data.activities.filter((a) => a.date && a.date >= todayISO()).length;
  const activeStudents = filteredStudents.filter((s) => s.status !== "Joojiyay").length;

  const classes = buildClassIndex(data.students).labels;
  const studentsForFilter = Array.from(new Set(data.students.map((s) => s.name).filter(Boolean))).sort();

  const resetFilters = () => setFilters({ from: "", to: "", className: "Dhammaan", student: "Dhammaan" });

  const exportCSV = () => {
    const rows = [
      ["Warbixinta NIBRAAS"],
      ["Laga bilaabo", filters.from || "Dhammaan"],
      ["Ilaa", filters.to || "Dhammaan"],
      ["Fasal", filters.className],
      ["Arday", filters.student],
      [],
      ["Qodob", "Qiime"],
      ["Ardayda Guud", filteredStudents.length],
      ["Ardayda Firfircoon", activeStudents],
      ["Shaqaalaha", data.employees.length],
      ["Heerka Xaadirinta", attendanceRate == null ? "" : `${attendanceRate}%`],
      ["Celceliska Horumarka", progressAverage == null ? "" : `${progressAverage}%`],
      ["Celceliska Imtixaanka", examAverage == null ? "" : `${examAverage}%`],
      ["Qoraallada Qur'aanka", filteredQuran.length],
      ["Lacagta La Ururiyay", collected],
      ["Deynta", due],
      ["Kharashka", expenses],
      ["Mushaharka Saafi ah", payrollTotal],
      ["Cabashooyin Furan", openComplaints],
      ["Hawlo Soo Socda", upcoming],
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nibraas-report-${todayISO()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Keep the object URL alive briefly so the browser can begin the download.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printReport = () => {
    const school = escapeHtml(config.schoolName || "NIBRAAS");
    const currency = escapeHtml(config.currency || "$");
    const money = (v) => `${Number(v || 0).toLocaleString()} ${currency}`.trim();
    const html = `<!doctype html><html lang="so"><head><meta charset="UTF-8"/><title>Warbixin - ${school}</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#1B2E2B}h1{color:#0B3D3A;margin:0 0 4px}.muted{color:#5B6E69;font-size:13px;margin-bottom:22px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{border:1px solid #DED4B8;border-radius:10px;padding:14px}.label{font-size:12px;color:#5B6E69}.value{font-size:22px;font-weight:bold;color:#0B3D3A;margin-top:5px}.footer{margin-top:25px;border-top:1px solid #DED4B8;padding-top:10px;font-size:11px;color:#5B6E69}@media print{body{padding:15px}}
    </style></head><body><h1>${school}</h1><div class="muted">Warbixin Maamul · ${new Date().toLocaleDateString("so-SO")}</div><div class="grid">
      <div class="card"><div class="label">Ardayda Guud</div><div class="value">${filteredStudents.length}</div></div>
      <div class="card"><div class="label">Ardayda Firfircoon</div><div class="value">${activeStudents}</div></div>
      <div class="card"><div class="label">Xaadirinta</div><div class="value">${attendanceRate == null ? "—" : attendanceRate + "%"}</div></div>
      <div class="card"><div class="label">Horumarka</div><div class="value">${progressAverage == null ? "—" : progressAverage + "%"}</div></div>
      <div class="card"><div class="label">Imtixaanka</div><div class="value">${examAverage == null ? "—" : examAverage + "%"}</div></div>
      <div class="card"><div class="label">Qur'aan / Xifdhi</div><div class="value">${filteredQuran.length}</div></div>
      <div class="card"><div class="label">Lacagta La Ururiyay</div><div class="value">${money(collected)}</div></div>
      <div class="card"><div class="label">Deynta</div><div class="value">${money(due)}</div></div>
      <div class="card"><div class="label">Kharashka</div><div class="value">${money(expenses)}</div></div>
      <div class="card"><div class="label">Mushahar</div><div class="value">${money(payrollTotal)}</div></div>
    </div><div class="footer">NIBRAAS — Nidaamka Maareynta Madrasada</div></body></html>`;
    const win = window.open("", "_blank");
    if (!win) { notify("Fadlan ogolow popup-ka browser-ka.", "error"); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 400);
  };

  if (loading) return <p className="text-sm py-10 text-center" style={{ color: COLORS.inkSoft }}>Warbixinta waa la soo dejinayaa...</p>;

  const cards = [
    ["Ardayda Guud", filteredStudents.length, Users],
    ["Ardayda Firfircoon", activeStudents, Check],
    ["Xaadirinta", attendanceRate == null ? "—" : `${attendanceRate}%`, ClipboardCheck],
    ["Horumarka", progressAverage == null ? "—" : `${progressAverage}%`, TrendingUp],
    ["Imtixaanka", examAverage == null ? "—" : `${examAverage}%`, ClipboardList],
    ["Qur'aan / Xifdhi", filteredQuran.length, BookOpen],
    ["La Ururiyay", fmtMoney(collected, config.currency), Wallet],
    ["Deynta", fmtMoney(due, config.currency), AlertCircle],
    ["Mushaharka", fmtMoney(payrollTotal, config.currency), Banknote],
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Warbixinno & Analytics</h2>
          <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Hal meel ka arag waxqabadka NIBRAAS.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="rounded-lg px-3 py-2 text-xs font-semibold border" style={{ borderColor: COLORS.line, backgroundColor: "#fff", color: COLORS.ink }}>📥 Excel/CSV</button>
          <button onClick={printReport} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>🖨️ Daabac PDF</button>
          <button onClick={loadReports} className="rounded-lg px-3 py-2 text-xs font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}>↻ Cusboonaysii</button>
        </div>
      </div>
      <SignatureChain className="mb-5" />

      <div className="rounded-xl border p-4 mb-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="grid md:grid-cols-4 gap-3">
          <div><label className="block text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>Laga bilaabo</label><input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} /></div>
          <div><label className="block text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>Ilaa</label><input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }} /></div>
          <div><label className="block text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>Fasalka</label><select value={filters.className} onChange={(e) => setFilters((p) => ({ ...p, className: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }}><option>Dhammaan</option>{classes.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>Ardayga</label><StudentSearchSelect students={studentsForFilter.map((name) => ({ name }))} value={filters.student} onChange={(v) => setFilters((p) => ({ ...p, student: v }))} placeholder="Raadi ardayga..." allowAll allLabel="Dhammaan" style={{ borderColor: COLORS.line }} /></div>
        </div>
        <button onClick={resetFilters} className="mt-3 text-xs font-semibold" style={{ color: COLORS.tealLight }}>Nadiifi filters</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {cards.map(([label, value, Icon]) => <div key={label} className="rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><Icon size={18} style={{ color: COLORS.gold }} /><p className="text-lg font-bold mt-2" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>{value}</p><p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>{label}</p></div>)}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <h3 className="font-semibold mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Waxqabadka Waxbarashada</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>Horumar la diiwaangeliyay</span><strong>{filteredProgress.length}</strong></div>
            <div className="flex justify-between"><span>Celceliska horumarka</span><strong>{progressAverage == null ? "—" : `${progressAverage}%`}</strong></div>
            <div className="flex justify-between"><span>Natiijooyinka imtixaanka</span><strong>{filteredExamResults.length}</strong></div>
            <div className="flex justify-between"><span>Celceliska imtixaanka</span><strong>{examAverage == null ? "—" : `${examAverage}%`}</strong></div>
            <div className="flex justify-between"><span>Diiwaannada Qur'aanka</span><strong>{filteredQuran.length}</strong></div>
          </div>
        </div>
        <div className="rounded-xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <h3 className="font-semibold mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Maaliyad & Maamul</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span>La ururiyay</span><strong>{fmtMoney(collected, config.currency)}</strong></div>
            <div className="flex justify-between"><span>Deyn</span><strong>{fmtMoney(due, config.currency)}</strong></div>
            <div className="flex justify-between"><span>Kharash</span><strong>{fmtMoney(expenses, config.currency)}</strong></div>
            <div className="flex justify-between"><span>Mushaharka</span><strong>{fmtMoney(payrollTotal, config.currency)}</strong></div>
            <div className="flex justify-between"><span>Cabashooyin furan</span><strong>{openComplaints}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   HR & Payroll Screen
========================================================= */
function PayrollScreen({ config }) {
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("list");
  const [editingId, setEditingId] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    employeeId: "", employeeName: "", month: new Date().toISOString().slice(0, 7),
    baseSalary: "", bonus: "0", deduction: "0", status: "La sugayo", note: "",
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([loadArr("employees-data"), loadArr("payroll-data")])
      .then(([emps, pays]) => {
        if (!active) return;
        setEmployees(Array.isArray(emps) ? emps : []);
        setRecords(Array.isArray(pays) ? pays : []);
      })
      .catch((error) => {
        console.error("Payroll load error:", error);
        if (active) notify("Xogta mushaharka lama soo akhrin karin.", "error");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const persist = (next) => persistList("payroll-data", next, setRecords);

  const emptyForm = (selectedMonth = month) => ({
    employeeId: "", employeeName: "", month: selectedMonth,
    baseSalary: "", bonus: "0", deduction: "0", status: "La sugayo", note: "",
  });
  const openNew = () => { setEditingId(null); setForm(emptyForm()); setView("form"); };
  const openEdit = (record) => {
    setEditingId(record.id);
    setForm({
      employeeId: record.employeeId || "", employeeName: record.employeeName || "",
      month: record.month || month, baseSalary: String(record.baseSalary ?? record.netSalary ?? ""),
      bonus: String(record.bonus ?? 0), deduction: String(record.deduction ?? 0),
      status: record.status || "La sugayo", note: record.note || "",
    });
    setView("form");
  };
  const selectEmployee = (id) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    setForm((p) => ({ ...p, employeeId: id, employeeName: emp?.name || "" }));
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeName) { notify("Dooro shaqaalaha.", "error"); return; }
    const baseError = validateAmount(form.baseSalary);
    if (baseError) { notify(`Mushaharka aasaasiga: ${baseError}`, "error"); return; }
    const bonusError = form.bonus === "" || form.bonus === undefined ? "" : validateAmount(form.bonus, { allowZero: true });
    if (bonusError) { notify(`Bonus: ${bonusError}`, "error"); return; }
    const deductionError = form.deduction === "" || form.deduction === undefined ? "" : validateAmount(form.deduction, { allowZero: true });
    if (deductionError) { notify(`Jaris: ${deductionError}`, "error"); return; }
    const base = Number(form.baseSalary) || 0;
    const bonus = Number(form.bonus) || 0;
    const deduction = Number(form.deduction) || 0;
    if (deduction > base + bonus) { notify("Jarisku ma ka badnaan karo mushaharka iyo bonus-ka isku-darka.", "error"); return; }
    setSaving(true);
    try {
      const old = records.find((r) => r.id === editingId);
      const item = {
        ...(old || {}), id: editingId ?? Date.now(), ...form,
        baseSalary: base, bonus, deduction, netSalary: Math.max(0, base + bonus - deduction),
        createdAt: old?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      const next = [item, ...records.filter((r) => r.id !== item.id && !(r.employeeId === item.employeeId && r.month === item.month))];
      if (!(await persist(next))) return; // persistList already explained why; the form stays open
      setMonth(item.month); setEditingId(null); setView("list");
      notify(editingId ? "Mushaharka waa la cusboonaysiiyey." : "Mushaharka waa la diiwaangeliyey.", "success");
    } catch (error) {
      console.error("Payroll save error:", error);
      notify("Mushaharka lama kaydin. Isku day mar kale.", "error");
    } finally { setSaving(false); }
  };
  const remove = async (id) => {
    const next = records.filter((r) => r.id !== id);
    if (await persist(next)) notify("Diiwaanka waa la tirtiray.", "success");
  };

  const monthRecords = records.filter((r) => r.month === month);
  const filtered = monthRecords.filter((r) => !search.trim() || `${r.employeeName} ${r.status} ${r.note || ""}`.toLowerCase().includes(search.toLowerCase()));
  const total = monthRecords.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const paid = monthRecords.filter((r) => r.status === "La bixiyay").reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const pending = total - paid;
  const currency = config?.currency || "$";
  const money = (n) => `${currency} ${Number(n || 0).toLocaleString()}`;
  const netPreview = Math.max(0, (Number(form.baseSalary) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0));

  if (view === "form") {
    return (
      <div className="max-w-3xl mx-auto">
        <button type="button" onClick={() => { setEditingId(null); setView("list"); }} className="flex items-center gap-2 text-sm mb-4 font-semibold" style={{ color: COLORS.tealLight }}><ArrowLeft size={17}/> Dib u noqo</button>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line, background: "#fff" }}>
          <div className="p-5 md:p-6" style={{ background: `linear-gradient(115deg, ${COLORS.tealDeep}, ${COLORS.tealLight})`, color: "#fff" }}>
            <div className="flex items-center gap-3"><div className="rounded-xl p-3" style={{ background: "#ffffff20" }}><Banknote size={25}/></div><div><h2 className="text-xl font-bold" style={{ fontFamily: DISPLAY_FONT }}>{editingId ? "Wax ka beddel Mushahar" : "Diiwaangeli Mushahar"}</h2><p className="text-xs mt-1" style={{ color: "#D7E9E4" }}>Geli xogta mushaharka shaqaalaha.</p></div></div>
          </div>
          <form onSubmit={submit} className="p-5 md:p-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold" style={{ color: COLORS.ink }}>Shaqaalaha<select value={form.employeeId} onChange={(e) => selectEmployee(e.target.value)} required className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" style={{ borderColor: COLORS.line }}><option value="">Dooro shaqaale...</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.name}{e.role ? ` — ${e.role}` : ""}</option>)}</select></label>
              <label className="block text-sm font-semibold" style={{ color: COLORS.ink }}>Bisha mushaharka<input type="month" value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} required className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" style={{ borderColor: COLORS.line }}/></label>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              {[ ["Mushaharka aasaasiga", "baseSalary"], ["Gunno", "bonus"], ["Jaritaan", "deduction"] ].map(([label, key]) => <label key={key} className="block text-sm font-semibold" style={{ color: COLORS.ink }}>{label}<input type="number" min="0" step="0.01" value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} required={key === "baseSalary"} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" style={{ borderColor: COLORS.line }}/></label>)}
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="block text-sm font-semibold" style={{ color: COLORS.ink }}>Xaaladda lacag-bixinta<select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" style={{ borderColor: COLORS.line }}><option>La sugayo</option><option>La bixiyay</option></select></label>
              <div className="rounded-xl p-3" style={{ background: COLORS.sand }}><p className="text-xs" style={{ color: COLORS.inkSoft }}>Mushahar saafi ah</p><p className="text-2xl font-bold mt-1" style={{ color: COLORS.teal }}>{money(netPreview)}</p></div>
            </div>
            <label className="block text-sm font-semibold" style={{ color: COLORS.ink }}>Faallo (ikhtiyaari)<textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Faahfaahin dheeraad ah..." rows={3} className="mt-2 w-full rounded-xl border px-3 py-3 font-normal" style={{ borderColor: COLORS.line }}/></label>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2"><button type="button" onClick={() => { setEditingId(null); setView("list"); }} className="rounded-xl border px-5 py-3 text-sm font-semibold" style={{ borderColor: COLORS.line, color: COLORS.ink }}>Ka noqo</button><button disabled={saving} className="rounded-xl px-6 py-3 text-sm font-bold" style={{ background: COLORS.teal, color: "#fff", opacity: saving ? .7 : 1 }}>{saving ? "Kaydinaya..." : editingId ? "Cusboonaysii Mushaharka" : "Kaydi Mushaharka"}</button></div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div><div className="flex items-center gap-2"><div className="rounded-xl p-2.5" style={{ background: COLORS.goldSoft, color: COLORS.teal }}><Banknote size={22}/></div><h2 className="text-2xl font-bold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>HR & Mushaharka</h2></div><p className="text-sm mt-2" style={{ color: COLORS.inkSoft }}>Maamul mushaharka shaqaalaha iyo lacag-bixinta.</p><SignatureChain className="mt-2"/></div>
        <button onClick={openNew} className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold shadow-sm" style={{ background: COLORS.gold, color: COLORS.tealDeep }}><Plus size={17}/> Ku dar Mushahar</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[{label:"Wadarta Mushaharka",value:total,tone:COLORS.tealDeep,sub:`${monthRecords.length} diiwaan`},{label:"La Bixiyey",value:paid,tone:COLORS.tealLight,sub:"Lacag la guddoomay"},{label:"La Sugayo",value:pending,tone:"#8A6A0A",sub:"Lacag aan weli la bixin"}].map((item) => <div key={item.label} className="rounded-2xl p-4 md:p-5" style={{ background: item.tone, color: "#fff" }}><p className="text-xs font-semibold opacity-90">{item.label}</p><p className="text-2xl font-bold mt-2">{money(item.value)}</p><p className="text-xs mt-1 opacity-75">{item.sub}</p></div>)}
      </div>
      <div className="grid md:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1.2fr)] gap-3 mb-4">
        <label className="relative"><span className="sr-only">Dooro bisha</span><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-xl border px-3 py-3 text-sm" style={{ borderColor: COLORS.line, background: "#fff" }}/></label>
        <div className="relative"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi magaca shaqaalaha..." className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm" style={{ borderColor: COLORS.line, background: "#fff" }}/></div>
      </div>
      {loading ? <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}>Waa la soo dejinayaa...</div> : filtered.length === 0 ? <div className="rounded-2xl border p-8 text-center" style={{ borderColor: COLORS.line, background: "#fff" }}><div className="mx-auto mb-3 rounded-2xl p-3 w-fit" style={{ background: COLORS.sand, color: COLORS.teal }}><Banknote size={25}/></div><p className="font-semibold" style={{ color: COLORS.ink }}>{search ? "Shaqaale lama helin." : "Weli mushahar bishan lama diiwaangelin."}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Riix “Ku dar Mushahar” si aad u bilowdo.</p></div> : <div className="space-y-3">{filtered.map((r) => <div key={r.id} className="rounded-2xl border p-4 md:p-5 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: COLORS.line, background: "#fff" }}><div className="flex items-center gap-3 min-w-0"><div className="rounded-xl p-3 shrink-0" style={{ background: COLORS.sand, color: COLORS.teal }}><UserCog size={21}/></div><div className="min-w-0"><p className="font-bold text-sm" style={{ color: COLORS.ink }}>{r.employeeName}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{money(r.netSalary)} <span className="mx-1">·</span> Mushahar saafi ah</p>{r.note ? <p className="text-xs mt-1 truncate max-w-md" style={{ color: COLORS.inkSoft }}>{r.note}</p> : null}</div></div><div className="flex items-center gap-2 ml-auto"><span className="rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: r.status === "La bixiyay" ? "#E4F1E8" : COLORS.goldSoft, color: r.status === "La bixiyay" ? "#28633B" : COLORS.tealDeep }}>{r.status}</span><button type="button" onClick={() => openEdit(r)} title="Wax ka beddel" className="rounded-lg p-2" style={{ color: COLORS.teal, background: "#E8F1EE" }}><Pencil size={16}/></button><button type="button" onClick={() => remove(r.id)} title="Tirtir" className="rounded-lg p-2" style={{ color: COLORS.brick, background: "#FDECEC" }}><Trash2 size={16}/></button></div></div>)}</div>}
    </div>
  );
}

/* =========================================================
   Configuration Screen
========================================================= */
function ConfigScreen({ config, setConfig }) {
  const [form, setForm] = useState(config);
  const [saved, setSaved] = useState(false);
  const [resetStep, setResetStep] = useState(false);
const [backupLoading, setBackupLoading] = useState(false);
const [restoreLoading, setRestoreLoading] = useState(false);

const downloadBackup = async () => {
  setBackupLoading(true);
  try {
    // Fetch in pages so larger schools are not silently truncated by the
    // database API's per-request row limit.
    const pageSize = 1000;
    const data = [];
    let from = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from("app_storage")
        .select("key, value, updated_at, created_at, branch_id")
        .eq("tenant_id", CURRENT_TENANT_ID)
        .order("key", { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      data.push(...(page || []));
      if (!page || page.length < pageSize) break;
      from += pageSize;
    }

    // Preserve the physical storage key so tenant/branch scope is not lost in backup.
    // Restore remaps the old tenant prefix to the currently signed-in tenant.
    const backupData = data.map((row) => ({
      key: row.key,
      value: row.value,
      updated_at: row.updated_at,
      created_at: row.created_at,
      branch_id: row.branch_id || "main",
    }));

    const backup = {
      app: "NIBRAAS",
      version: 3,
      keyFormat: "physical",
      exportedAt: new Date().toISOString(),
      recordCount: backupData.length,
      data: backupData,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nibraas-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Give the browser time to start the download before releasing the blob URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    console.error("Backup error:", error);
    notify("Backup-ka lama soo dejisan.", "error");
  } finally {
    setBackupLoading(false);
  }
};

const restoreBackup = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".json") || file.size <= 0 || file.size > 50 * 1024 * 1024) {
    notify("Faylka backup-ku waa inuu noqdaa JSON sax ah oo ka yar 50 MB.", "error");
    return;
  }

  setRestoreLoading(true);
  try {
    const text = await file.text();
    let backup;
    try {
      backup = JSON.parse(text);
    } catch {
      throw new Error("Faylku ma aha JSON sax ah.");
    }

    if (!["NIBRAAS", "Isnaad"].includes(backup?.app) || !Array.isArray(backup?.data)) {
      throw new Error("Backup file-ku ma aha backup sax ah oo NIBRAAS ah.");
    }
    if (backup.data.length === 0) {
      throw new Error("Backup-ku wax xog ah kuma jiro; waxba lama beddelin.");
    }
    if (Number.isInteger(backup.recordCount) && backup.recordCount !== backup.data.length) {
      throw new Error("Tirada xogta backup-ka isma waafaqsana; waxba lama beddelin.");
    }
    if (!CURRENT_TENANT_ID) {
      throw new Error("Tenant-ka hadda lama aqoonsan; waxba lama beddelin.");
    }

    const isPhysicalFormat = backup?.keyFormat === "physical";
    const now = new Date().toISOString();

    // Older backups may contain empty legacy keys in the form tenant:logicalKey.
    // Skip one only when a correctly scoped key for the same tenant and logical key
    // is also present, so no non-empty or unmatched data is silently discarded.
    const restoreSourceRows = backup.data
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        if (!isPhysicalFormat || typeof row?.key !== "string") return true;
        const rawKey = row.key; // keep exact key (trailing spaces are part of some class names)
        const firstColon = rawKey.indexOf(":");
        const secondColon = firstColon >= 0 ? rawKey.indexOf(":", firstColon + 1) : -1;
        const isLegacyTwoPartKey = firstColon > 0 && secondColon < 0 && firstColon < rawKey.length - 1;
        if (!isLegacyTwoPartKey || !Array.isArray(row.value) || row.value.length !== 0) return true;
        const tenantPrefix = rawKey.slice(0, firstColon);
        const legacyLogicalKey = rawKey.slice(firstColon + 1);
        const hasScopedReplacement = backup.data.some((candidate) => {
          if (!candidate || typeof candidate.key !== "string") return false;
          const candidateKey = candidate.key.trim();
          const candidateFirstColon = candidateKey.indexOf(":");
          const candidateSecondColon = candidateFirstColon >= 0
            ? candidateKey.indexOf(":", candidateFirstColon + 1)
            : -1;
          return candidateFirstColon > 0 && candidateSecondColon > candidateFirstColon + 1 &&
            candidateKey.slice(0, candidateFirstColon) === tenantPrefix &&
            candidateKey.slice(candidateSecondColon + 1) === legacyLogicalKey;
        });
        return !hasScopedReplacement;
      });

    const seenKeys = new Set();
    const rowsToRestore = restoreSourceRows.map(({ row, index }) => {
      if (!row || typeof row.key !== "string" || !row.key.trim()) {
        throw new Error(`Furaha xogta safka ${index + 1} waa khaldan yahay.`);
      }
      if (!Object.prototype.hasOwnProperty.call(row, "value")) {
        throw new Error(`Xogta safka ${index + 1} qiime (value) ma leh.`);
      }

      let logicalKey;
      let keyBranchScope;
      let storedBranchId;

      if (isPhysicalFormat) {
        const rawKey = row.key; // keep exact key (trailing spaces are part of some class names)
        const firstColon = rawKey.indexOf(":");
        const secondColon = firstColon >= 0 ? rawKey.indexOf(":", firstColon + 1) : -1;
        if (firstColon <= 0 || secondColon < 0 || secondColon === rawKey.length - 1) {
          throw new Error(`Furaha physical-ka ee safka ${index + 1} waa khaldan yahay.`);
        }
        // Ignore the old tenant ID; preserve the original scope and logical key.
        keyBranchScope = rawKey.slice(firstColon + 1, secondColon);
        logicalKey = rawKey.slice(secondColon + 1);
        if (!keyBranchScope || !logicalKey) {
          throw new Error(`Furaha physical-ka ee safka ${index + 1} waa khaldan yahay.`);
        }
        storedBranchId = typeof row.branch_id === "string" && row.branch_id.trim()
          ? row.branch_id
          : (keyBranchScope === "__global__" ? "main" : keyBranchScope);
      } else {
        logicalKey = logicalStorageKey(row.key.trim());
        keyBranchScope = isGlobalStorageKey(logicalKey)
          ? "__global__"
          : (typeof row.branch_id === "string" && row.branch_id.trim() ? row.branch_id : "main");
        storedBranchId = typeof row.branch_id === "string" && row.branch_id.trim() ? row.branch_id : "main";
      }

      const physicalKey = physicalStorageKey(
        logicalKey,
        keyBranchScope === "__global__" ? CURRENT_BRANCH_ID : keyBranchScope
      );
      if (!physicalKey) {
        throw new Error(`Furaha xogta safka ${index + 1} lama diyaarin karin.`);
      }
      if (seenKeys.has(physicalKey)) {
        throw new Error(
          `Backup-ku wuxuu leeyahay furayaal is-dul-saaran: ${logicalKey}. Waxba lama beddelin. Samee Backup cusub oo qaabkiisa cusub ah kadib marka cusboonaysiintu diyaar noqoto.`
        );
      }
      seenKeys.add(physicalKey);

      return {
        key: physicalKey,
        tenant_id: CURRENT_TENANT_ID,
        branch_id: storedBranchId,
        value: row.value,
        updated_at: typeof row.updated_at === "string" ? row.updated_at : now,
        created_at: typeof row.created_at === "string" ? row.created_at : now,
      };
    });

    const confirmed = await askConfirm(
      `Backup-kan wuxuu ka kooban yahay ${rowsToRestore.length} qaybood oo xog ah.\n\n` +
      "Xogta leh furayaal isku mid ah waa la cusboonaysiin karaa. Hubi inaad haysato backup cusub ka hor intaadan sii wadin.\n\nMa sii wadeysaa?",
      { confirmLabel: "Restore", danger: true }
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from("app_storage")
      .upsert(rowsToRestore, { onConflict: "key" });
    if (error) throw error;

    resetStorageSync(); // everything is re-read from the database after the reload
    notify(`Restore waa guuleystay: ${rowsToRestore.length} qaybood oo xog ah ayaa la diray. NIBRAAS waa dib loo furayaa.`, "success");
    setTimeout(() => window.location.reload(), 1800);
  } catch (error) {
    console.error("Restore error:", error);
    const detail = [error?.message, error?.details, error?.hint, error?.code ? `(code: ${error.code})` : ""].filter(Boolean).join("\n") || "Hubi backup file-ka iyo xiriirka Supabase.";
    await askConfirm(`Restore-ku wuu fashilmay.\n\n${detail}`, { confirmLabel: "Hagaag", showCancel: false, danger: true });
  } finally {
    setRestoreLoading(false);
  }
};
  useEffect(() => setForm(config), [config]);

  const save = async (e) => {
    e.preventDefault();
    const okConfig = await saveObj("config-data", form);
    if (!okConfig) return;
    setConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetAll = async () => {
    if (!resetStep) {
      setResetStep(true);
      setTimeout(() => setResetStep(false), 3000);
      return;
    }
    const keys = [
      "students-data",
      "employees-data",
      "classes-data",
      "activities-data",
      "complaints-data",
      "progress-data",
      "exams-data",
      "finance-data",
      "sms-log",
    ];
    const failed = [];
    for (const k of keys) {
      if (!(await deleteKey(k))) failed.push(k);
    }
    setResetStep(false);
    if (failed.length) {
      notify(`Dib-u-dejintu way dhammaystirmin: ${failed.length} qayb lama tirtirin (${failed.join(", ")}).`, "error");
      return;
    }
    window.location.reload();
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
        Dejinta
      </h2>
      <SignatureChain className="mb-5" />

      <form onSubmit={save} className="space-y-4 mb-8">
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Magaca Madrasada
          </label>
          <input
            value={form.schoolName || ""}
            onChange={(e) => setForm((p) => ({ ...p, schoolName: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Logo-ga Madrasada (URL)
          </label>
          <input
            type="url"
            value={form.logoUrl || ""}
            onChange={(e) => setForm((p) => ({ ...p, logoUrl: e.target.value }))}
            placeholder="https://..."
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          />
          {form.logoUrl && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={form.logoUrl}
                alt="Logo-ga Madrasada"
                className="w-14 h-14 rounded-xl object-contain bg-white p-1 border"
                style={{ borderColor: COLORS.line }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>Logo-ga muuqaalka kore ayuu kasoo muuqanayaa.</span>
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Cinwaanka
          </label>
          <input
            value={form.address || ""}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Telefoonka
            </label>
            <input
              value={form.phone || ""}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Email-ka Madrasada
            </label>
            <input
              type="email"
              value={form.email || ""}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="info@madrasada.com"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Lacagta
            </label>
            <select
              value={form.currency || "$"}
              onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            >
              <option value="$">USD ($)</option>
              <option value="Ksh">KES (Ksh)</option>
              <option value="ETB">ETB</option>
              <option value="Sl.Sh">Shilin Soomaali</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full rounded-lg py-3 font-semibold text-sm" style={{ backgroundColor: saved ? COLORS.tealLight : COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}>
          {saved ? "✓ La Kaydiyay" : "Kaydi Dejinta"}
        </button>
      </form>

      <div className="rounded-xl border p-4 mb-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="flex items-center gap-3">
          {form.logoUrl ? (
            <img src={form.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white p-1 border" style={{ borderColor: COLORS.line }} />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.gold }}>
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: COLORS.tealDeep }}>N</span>
            </div>
          )}
          <div>
            <p className="font-semibold" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>{form.schoolName || "NIBRAAS"}</p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{form.address || "Cinwaan lama gelin"}</p>
            <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>{form.phone || "Telefoon lama gelin"}{form.email ? ` · ${form.email}` : ""}</p>
          </div>
        </div>
      </div>

      <div
  className="rounded-xl border p-4 mt-4"
  style={{ borderColor: COLORS.line }}
>
  <p
    className="text-sm font-semibold mb-1"
    style={{
      color: COLORS.ink,
      fontFamily: BODY_FONT,
    }}
  >
    Backup & Restore
  </p>

  <p
    className="text-xs mb-4"
    style={{
      color: COLORS.inkSoft,
      fontFamily: BODY_FONT,
    }}
  >
    Soo dejiso nuqul dhammaan xogta NIBRAAS ah ama
    dib ugu soo celi backup hore.
  </p>

  <div className="grid grid-cols-2 gap-3">
    <button
      type="button"
      onClick={downloadBackup}
      disabled={backupLoading}
      className="rounded-lg py-3 text-sm font-semibold"
      style={{
        backgroundColor: COLORS.teal,
        color: "#fff",
        fontFamily: BODY_FONT,
      }}
    >
      {backupLoading ? "Soo dejinaya..." : "💾 Backup"}
    </button>

    <label
      className="rounded-lg py-3 text-sm font-semibold text-center cursor-pointer"
      style={{
        backgroundColor: COLORS.gold,
        color: COLORS.tealDeep,
        fontFamily: BODY_FONT,
      }}
    >
      {restoreLoading ? "Soo celinaya..." : "📥 Restore"}

      <input
        type="file"
        accept=".json,application/json"
        onChange={restoreBackup}
        disabled={restoreLoading}
        className="hidden"
      />
    </label>
  </div>
</div>
</div>
  );
}


/* =========================================================
   Student ID Cards
========================================================= */
function IdCardsScreen({ config }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let alive = true;
    loadArr("students-data").then((data) => {
      if (!alive) return;
      setStudents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [s.name, s.className, s.parentName, s.parentPhone]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const printCard = (student) => {
    setSelected(student);
    setTimeout(() => window.print(), 80);
  };

  const printAll = () => {
    if (!filtered.length) return;
    setSelected(null);
    setTimeout(() => window.print(), 80);
  };

  if (loading) {
    return <div className="max-w-5xl mx-auto p-6 text-sm" style={{ color: COLORS.inkSoft }}>ID Cards waa la soo dejinayaa...</div>;
  }

  const card = (student, printMode = false) => {
    const token = `NIBRAAS-STUDENT-${student.id || student.name || "student"}`;
    return (
      <div
        key={student.id || student.name}
        className={printMode ? "id-card-print" : "rounded-2xl border overflow-hidden"}
        style={{
          width: 360,
          minHeight: 220,
          background: "#fff",
          borderColor: COLORS.line,
          boxShadow: printMode ? "none" : "0 8px 24px rgba(0,0,0,0.06)",
        }}
      >
        <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: COLORS.tealDeep }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.gold }}>
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: COLORS.tealDeep }}>N</span>
            </div>
            <div>
              <div className="text-sm font-bold" style={{ color: "#fff", fontFamily: DISPLAY_FONT }}>{config?.schoolName || "NIBRAAS"}</div>
              <div className="text-[9px]" style={{ color: COLORS.goldSoft }}>STUDENT ID CARD</div>
            </div>
          </div>
        </div>
        <div className="p-5 flex gap-4 items-center">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.sandDeep, border: `1px solid ${COLORS.line}` }}>
            <GraduationCap size={34} style={{ color: COLORS.teal }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold truncate" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>{student.name || "Arday"}</div>
            <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Fasal: <b>{student.className || "—"}</b></div>
            <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Xaalad: <b>{student.status || "Firfircoon"}</b></div>
            {student.parentPhone && <div className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Waalid: {student.parentPhone}</div>}
          </div>
          <QrCode value={token} size={64} />
        </div>
        <div className="px-5 py-2 text-[9px]" style={{ backgroundColor: COLORS.sand, color: COLORS.inkSoft }}>
          ID: {String(student.id || student.name || "").slice(-12)} · NIBRAAS
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-5 md:p-7">
      <style>{`@media print { body * { visibility: hidden !important; } #idcards-print, #idcards-print * { visibility: visible !important; } #idcards-print { position: absolute; left: 0; top: 0; width: 100%; display: flex; flex-wrap: wrap; gap: 16px; } .no-print { display: none !important; } .id-card-print { break-inside: avoid; page-break-inside: avoid; } }`}</style>
      <div className="no-print flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>ID Cards</h1>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>Kaarka aqoonsiga ardayda iyo QR code.</p>
        </div>
        <button onClick={printAll} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>🖨️ Daabac dhammaan</button>
      </div>
      <div className="no-print mb-5">
        <div className="relative max-w-md">
          <Search size={17} className="absolute left-3 top-3" style={{ color: COLORS.inkSoft }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi arday..." className="w-full rounded-lg border pl-10 pr-3 py-2.5 text-sm outline-none" style={{ borderColor: COLORS.line }} />
        </div>
      </div>
      <div id="idcards-print" className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(selected ? [selected] : filtered).map((student) => (
          <div key={student.id || student.name} className="flex flex-col gap-2">
            {card(student, true)}
            <button className="no-print self-start rounded-lg px-3 py-2 text-xs font-semibold" onClick={() => printCard(student)} style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}>🖨️ Daabac kaarkan</button>
          </div>
        ))}
      </div>
      {!filtered.length && <div className="no-print text-center py-12 text-sm" style={{ color: COLORS.inkSoft }}>Arday lama helin.</div>}
      <div className="no-print mt-6 rounded-xl border p-4 text-xs" style={{ borderColor: COLORS.line, backgroundColor: "#fff", color: COLORS.inkSoft }}>
        QR-ga wuxuu wataa aqoonsi kooban oo NIBRAAS ah; xogta ardayga oo dhan laguma gelin QR-ga.
      </div>
    </div>
  );
}

/* =========================================================
   Home / Dashboard Screen
========================================================= */
function HomeScreen({ config, goTo, currentRole, tr }) {
  const navLabel = (id, fallback) => tr?.[id] || fallback;
  const [data, setData] = useState({
    students: [], employees: [], finance: [], complaints: [], activities: [],
    progress: [], exams: [], examResults: [], quran: [], payroll: [],
  });
  const [attendance, setAttendance] = useState({ present: 0, total: 0 });
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [students, employees, finance, complaints, activities, progress, exams, examResults, quran, payroll] = await Promise.all([
        loadArr("students-data"),
        loadArr("employees-data"),
        loadArr("finance-data"),
        loadArr("complaints-data"),
        loadArr("activities-data"),
        loadArr("progress-data"),
        loadArr("exams-data"),
        loadArr("exam-results-data"),
        loadArr("quran-progress-data"),
        loadArr("payroll-data"),
      ]);

      let present = 0;
      let total = 0;
      try {
        const { rows, failed } = await loadAttendanceRows(`attendance-${todayISO()}`);
        if (failed) notify(`Xaadirinta maanta: ${failed} diiwaan lama akhrin karin.`, "error");
        rows.forEach((row) => {
          (row.records || []).forEach((record) => {
            total += 1;
            if (record.status === "Joogto") present += 1;
          });
        });
      } catch (e) {
        console.error("Dashboard attendance error:", e);
        notify("Xaadirinta maanta lama soo akhrin karin.", "error");
      }

      setData({
        students: Array.isArray(students) ? students : [],
        employees: Array.isArray(employees) ? employees : [],
        finance: Array.isArray(finance) ? finance : [],
        complaints: Array.isArray(complaints) ? complaints : [],
        activities: Array.isArray(activities) ? activities : [],
        progress: Array.isArray(progress) ? progress : [],
        exams: Array.isArray(exams) ? exams : [],
        examResults: Array.isArray(examResults) ? examResults : [],
        quran: Array.isArray(quran) ? quran : [],
        payroll: Array.isArray(payroll) ? payroll : [],
      });
      setAttendance({ present, total });

      // Attendance of the current month, per day, for the progress chart (one query).
      try {
        const monthPrefix = `attendance-${todayISO().slice(0, 7)}`;
        const entries = await listStorageEntries(monthPrefix);
        const byDay = new Map();
        entries.forEach(({ key, value }) => {
          const day = String(value?.date || key.slice("attendance-".length, "attendance-".length + 10));
          const bucket = byDay.get(day) || { present: 0, total: 0 };
          (Array.isArray(value?.records) ? value.records : []).forEach((record) => {
            bucket.total += 1;
            if (record.status === "Joogto") bucket.present += 1;
          });
          byDay.set(day, bucket);
        });
        setAttendanceTrend([...byDay.entries()]
          .filter(([, v]) => v.total > 0)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-7)
          .map(([day, v]) => ({ day, pct: Math.round((v.present / v.total) * 100), present: v.present, total: v.total })));
      } catch (e) {
        console.error("Dashboard attendance trend error:", e);
        setAttendanceTrend([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
    const onFocus = () => refreshDashboard();
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(refreshDashboard, 30000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(timer);
    };
  }, [refreshDashboard]);

  const today = todayISO();
  const activeStudents = data.students.filter((s) => s.status !== "Joojiyay");
  const collected = data.finance.filter((t) => t.type === "Lacag La Bixiyay").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const due = data.finance.filter((t) => t.type === "Deyn").reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const openComplaints = data.complaints.filter((c) => c.status !== "La xaliyay").length;
  const upcomingActivities = data.activities
    .filter((a) => a.date && a.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const quranToday = data.quran.filter((r) => r.date === today).length;
  const quranStudents = new Set(data.quran.map((r) => r.studentName).filter(Boolean)).size;
  const examResults = data.examResults.filter((r) => Number.isFinite(Number(r.score)));
  const examAverage = examResults.length
    ? Math.round(examResults.reduce((sum, r) => sum + Number(r.score || 0), 0) / examResults.length)
    : null;
  const progressScores = data.progress.filter((r) => r.score !== "" && Number.isFinite(Number(r.score)));
  const progressAverage = progressScores.length
    ? Math.round(progressScores.reduce((sum, r) => sum + Number(r.score || 0), 0) / progressScores.length)
    : null;
  const attendancePct = attendance.total ? Math.round((attendance.present / attendance.total) * 100) : null;
  // Payroll records store the final amount in netSalary (older/other shapes: amount, salary).
  const payAmount = (p) => Number(p.netSalary ?? p.amount ?? p.salary ?? 0) || 0;
  const thisMonthKey = today.slice(0, 7);
  const payrollMonth = data.payroll.filter((p) => p.month === thisMonthKey);
  const payrollTotal = payrollMonth.reduce((sum, p) => sum + payAmount(p), 0);
  const payrollPaid = payrollMonth.filter((p) => p.status === "La bixiyay").reduce((sum, p) => sum + payAmount(p), 0);
  const payrollPending = Math.max(0, payrollTotal - payrollPaid);
  const payrollPaidPct = payrollTotal ? Math.round((payrollPaid / payrollTotal) * 100) : 0;

  // Student growth: cumulative number of students at the end of each of the last 12 months
  // (students without a creation date count as "already enrolled" at the start).
  const growthSeries = (() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (11 - i));
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("so-SO", { month: "short" }) };
    });
    return months.map((m) => ({
      ...m,
      value: data.students.filter((s) => !s.createdAt || String(s.createdAt).slice(0, 7) <= m.key).length,
    }));
  })();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const quranRecent = data.quran.filter((r) => String(r.date || "") >= monthAgo);
  const quranByType = Object.entries(quranRecent.reduce((acc, r) => {
    const t = r.type || "Kale";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const quranTopStudents = Object.entries(quranRecent.reduce((acc, r) => {
    if (r.studentName) acc[r.studentName] = (acc[r.studentName] || 0) + 1;
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const quick = NAV.filter((n) => n.id !== "home" && canAccess(currentRole, n.id));
  const cards = [
    { label: "Ardayda Firfircoon", value: activeStudents.length, icon: Users, tone: "teal", action: "students" },
    { label: "Xaadirinta Maanta", value: attendancePct != null ? `${attendancePct}%` : "—", icon: ClipboardCheck, tone: "gold", action: "attendance" },
    { label: "Qur’aan Maanta", value: quranToday, icon: BookOpen, tone: "light", action: "quran" },
    { label: "Celceliska Imtixaanka", value: examAverage != null ? `${examAverage}%` : "—", icon: GraduationCap, tone: "tealLight", action: "exams" },
    { label: "Lacagta La Ururiyay", value: fmtMoney(collected, config.currency), icon: Wallet, tone: "light", action: "finance" },
    { label: "Deynta Haray", value: fmtMoney(due, config.currency), icon: AlertCircle, tone: "brick", action: "finance" },
    { label: "Cabashooyin Furan", value: openComplaints, icon: MessageSquare, tone: "light", action: "complaints" },
    { label: "Shaqaalaha", value: data.employees.length, icon: UserCog, tone: "light", action: "employees" },
  ];

  const toneStyle = (tone) => {
    if (tone === "teal") return { backgroundColor: COLORS.teal, color: "#fff", icon: COLORS.gold, sub: COLORS.goldSoft };
    if (tone === "tealLight") return { backgroundColor: COLORS.tealLight, color: "#fff", icon: COLORS.gold, sub: COLORS.goldSoft };
    if (tone === "gold") return { backgroundColor: COLORS.goldSoft, color: COLORS.ink, icon: COLORS.teal, sub: COLORS.inkSoft };
    if (tone === "brick") return { backgroundColor: "#F8ECE8", color: COLORS.ink, icon: COLORS.brick, sub: COLORS.inkSoft };
    return { backgroundColor: "#fff", color: COLORS.ink, icon: COLORS.tealLight, sub: COLORS.inkSoft };
  };

  const monthlyFinance = Array.from({ length: 6 }, (_, index) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - index), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value = data.finance
      .filter((t) => t.type === "Lacag La Bixiyay" && String(t.date || t.createdAt || "").slice(0, 7) === key)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return { key, label: d.toLocaleDateString("so-SO", { month: "short" }), value };
  });
  const maxFinance = Math.max(...monthlyFinance.map((m) => m.value), 1);

  const scoreBars = [
    { label: "Imtixaan", value: examAverage },
    { label: "Horumar", value: progressAverage },
    { label: "Xaadirin", value: attendancePct },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: COLORS.gold, fontFamily: BODY_FONT }}>
            Dashboard-ka NIBRAAS
          </p>
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
            {config.schoolName || "NIBRAAS"}
          </h1>
          <p className="text-sm" style={{ color: COLORS.inkSoft }}>
            Dulmar ku saabsan xogta aad doorkaaga ku geli karto maanta.
          </p>
        </div>
        <button onClick={refreshDashboard} className="self-start md:self-auto rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
          {loading ? "Soo dejinaya..." : "Cusboonaysii"}
        </button>
      </div>

      <SignatureChain className="mb-7" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.filter((card) => canAccess(currentRole, card.action)).map((card) => {
          const tone = toneStyle(card.tone);
          const allowed = canAccess(currentRole, card.action);
          return (
            <button
              key={card.label}
              onClick={() => allowed && goTo(card.action)}
              className="rounded-2xl p-4 text-left"
              style={{ backgroundColor: tone.backgroundColor, border: `1px solid ${card.tone === "light" ? COLORS.line : "transparent"}`, cursor: allowed ? "pointer" : "default" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl" style={{ backgroundColor: card.tone === "teal" || card.tone === "tealLight" ? "rgba(255,255,255,0.12)" : card.tone === "brick" ? "rgba(162,80,63,0.12)" : card.tone === "gold" ? "rgba(11,61,58,0.08)" : "rgba(23,92,84,0.10)" }}><card.icon size={18} style={{ color: tone.icon }} /></span>
                {card.label === "Xaadirinta Maanta" && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.gold }} />}
              </div>
              <p className="text-2xl font-bold mt-3 truncate" style={{ color: tone.color, fontFamily: DISPLAY_FONT }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: tone.sub }}>{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className={`grid ${canAccess(currentRole, "finance") ? "lg:grid-cols-[1.2fr_0.8fr]" : "lg:grid-cols-1"} gap-5 mb-6`}>
        {canAccess(currentRole, "finance") && (
          <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Dhaqaalaha</p>
                <h2 className="text-lg font-semibold mt-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Lacagta la ururiyay — 6 bilood</h2>
              </div>
              <button onClick={() => goTo("finance")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Maaliyadda</button>
            </div>
            <div className="h-44 flex items-end gap-3">
              {monthlyFinance.map((m) => (
                <div key={m.key} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: COLORS.inkSoft }}>{m.value ? fmtMoney(m.value, config.currency) : "—"}</span>
                  <div className="w-full rounded-t-lg" style={{ height: `${Math.max(8, (m.value / maxFinance) * 115)}px`, backgroundColor: COLORS.teal }} />
                  <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>{m.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl p-5" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Waxqabadka</p>
          <h2 className="text-lg font-semibold mt-1 mb-5" style={{ fontFamily: DISPLAY_FONT }}>Heerarka muhiimka ah</h2>
          <div className="space-y-4">
            {scoreBars.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1.5"><span>{item.label}</span><span>{item.value != null ? `${item.value}%` : "—"}</span></div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.14)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${Math.max(0, Math.min(100, item.value || 0))}%`, backgroundColor: COLORS.gold }} />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><p className="text-xs">Ardayda Qur’aanka</p><p className="text-xl font-bold mt-1">{quranStudents}</p></div>
            {canAccess(currentRole, "payroll") && <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><p className="text-xs">Mushaharka bishan</p><p className="text-sm font-bold mt-2">{fmtMoney(payrollTotal, config.currency)}</p></div>}
          </div>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-6">
        {canAccess(currentRole, "students") && (
          <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }} aria-label="Korodhka ardayda">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Ardayda</p>
            <h2 className="text-lg font-semibold mt-1 mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Korodhka ardayda — 12 bilood</h2>
            {data.students.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Weli arday lama diiwaangelin.</p>
            ) : (() => {
              const W = 320, H = 130, pad = 18;
              const max = Math.max(...growthSeries.map((g) => g.value), 1);
              const min = Math.min(...growthSeries.map((g) => g.value));
              const span = Math.max(max - min, 1);
              const pts = growthSeries.map((g, i) => [pad + (i * (W - pad * 2)) / (growthSeries.length - 1), H - pad - ((g.value - min) / span) * (H - pad * 2)]);
              const line = pts.map((p) => p.join(",")).join(" ");
              const area = `${pad},${H - pad} ${line} ${W - pad},${H - pad}`;
              return (
                <>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Ardayda: ${growthSeries[0].value} ilaa ${growthSeries[growthSeries.length - 1].value}`}>
                    <polygon points={area} fill={COLORS.teal} opacity="0.12" />
                    <polyline points={line} fill="none" stroke={COLORS.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                    {pts.map((p, i) => <circle key={growthSeries[i].key} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 2.5} fill={i === pts.length - 1 ? COLORS.gold : COLORS.teal} />)}
                  </svg>
                  <div className="flex justify-between text-[10px] mt-1" style={{ color: COLORS.inkSoft }}>
                    <span>{growthSeries[0].label}</span><span>{growthSeries[5].label}</span><span>{growthSeries[11].label}</span>
                  </div>
                  <p className="text-sm mt-3" style={{ color: COLORS.ink }}>
                    Hadda: <strong>{growthSeries[11].value}</strong> arday
                    {growthSeries[11].value - growthSeries[0].value > 0 && <span style={{ color: COLORS.tealLight }}> · +{growthSeries[11].value - growthSeries[0].value} sannadkan</span>}
                  </p>
                </>
              );
            })()}
          </section>
        )}

        {canAccess(currentRole, "attendance") && (
          <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }} aria-label="Horumarka xaadirinta">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Xaadirin</p>
                <h2 className="text-lg font-semibold mt-1 mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Horumarka xaadirinta</h2>
              </div>
              <button onClick={() => goTo("attendance")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Xaadirinta</button>
            </div>
            {attendanceTrend.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Bishan weli xaadirin lama qaadin.</p>
            ) : (
              <div className="h-36 flex items-end gap-2">
                {attendanceTrend.map((d) => (
                  <div key={d.day} className="flex-1 h-full flex flex-col justify-end items-center gap-1" title={`${d.day}: ${d.present}/${d.total}`}>
                    <span className="text-[10px] font-semibold" style={{ color: COLORS.inkSoft }}>{d.pct}%</span>
                    <div className="w-full rounded-t-lg" style={{ height: `${Math.max(6, d.pct)}%`, maxHeight: 90, backgroundColor: d.pct >= 80 ? COLORS.teal : d.pct >= 60 ? COLORS.gold : COLORS.brick }} />
                    <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>{d.day.slice(8)}/{d.day.slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {canAccess(currentRole, "quran") && (
          <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }} aria-label="Horumarka Qur'aanka">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Qur’aan</p>
                <h2 className="text-lg font-semibold mt-1 mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Horumarka Qur’aanka — 30 maalin</h2>
              </div>
              <button onClick={() => goTo("quran")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Qur’aan</button>
            </div>
            {quranRecent.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>30-kii maalin ee la soo dhaafay diiwaan Qur’aan lama gelin.</p>
            ) : (
              <>
                <div className="space-y-3">
                  {quranByType.slice(0, 4).map(([type, count]) => (
                    <div key={type}>
                      <div className="flex justify-between text-xs mb-1" style={{ color: COLORS.ink }}><span>{type}</span><span>{count}</span></div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: COLORS.sand }}><div className="h-2 rounded-full" style={{ width: `${Math.round((count / quranRecent.length) * 100)}%`, backgroundColor: COLORS.teal }} /></div>
                    </div>
                  ))}
                </div>
                {quranTopStudents.length > 0 && (
                  <p className="text-xs mt-4" style={{ color: COLORS.inkSoft }}>Ardayda ugu firfircoon: {quranTopStudents.map(([name, n]) => `${name} (${n})`).join(" · ")}</p>
                )}
              </>
            )}
          </section>
        )}

        {canAccess(currentRole, "payroll") && (
          <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }} aria-label="Dulmarka mushaharka">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Mushaharka</p>
                <h2 className="text-lg font-semibold mt-1 mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Dulmarka mushaharka bishan</h2>
              </div>
              <button onClick={() => goTo("payroll")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Mushaharka</button>
            </div>
            {payrollMonth.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Bishan mushahar lama diiwaangelin.</p>
            ) : (
              <>
                <div className="h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: COLORS.goldSoft }} role="img" aria-label={`${payrollPaidPct}% la bixiyay`}>
                  <div style={{ width: `${payrollPaidPct}%`, backgroundColor: COLORS.teal }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                  <div className="rounded-xl p-2" style={{ backgroundColor: COLORS.sand }}><p className="text-[11px]" style={{ color: COLORS.inkSoft }}>Wadarta</p><p className="text-sm font-bold mt-1">{fmtMoney(payrollTotal, config.currency)}</p></div>
                  <div className="rounded-xl p-2" style={{ backgroundColor: "#E4F1E8" }}><p className="text-[11px]" style={{ color: "#28633B" }}>La bixiyay</p><p className="text-sm font-bold mt-1">{fmtMoney(payrollPaid, config.currency)}</p></div>
                  <div className="rounded-xl p-2" style={{ backgroundColor: COLORS.goldSoft }}><p className="text-[11px]" style={{ color: COLORS.tealDeep }}>La sugayo</p><p className="text-sm font-bold mt-1">{fmtMoney(payrollPending, config.currency)}</p></div>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-5 mb-8">
        <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Jadwal</p><h2 className="text-lg font-semibold mt-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Hawlaha soo socda</h2></div>
            {canAccess(currentRole, "activities") && <button onClick={() => goTo("activities")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Eeg dhammaan</button>}
          </div>
          {upcomingActivities.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: COLORS.inkSoft }}>Ma jiraan hawlo soo socda.</p>
          ) : (
            <div className="space-y-2">
              {upcomingActivities.slice(0, 5).map((activity, index) => (
                <div key={activity.id || `${activity.title}-${index}`} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.sand }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.goldSoft }}><CalendarClock size={18} style={{ color: COLORS.teal }} /></div>
                  <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>{activity.title || "Hawl"}</p><p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>{[fmtDate(activity.date), activity.location].filter(Boolean).join(" · ") || "Taariikh lama gelin"}</p></div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Waxbarasho</p><h2 className="text-lg font-semibold mt-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Xogta waxbarashada</h2></div>
            {canAccess(currentRole, "quran") && <button onClick={() => goTo("quran")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Qur’aan</button>}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: COLORS.sand }}><span className="text-sm" style={{ color: COLORS.ink }}>Diiwaannada Qur’aanka maanta</span><strong>{quranToday}</strong></div>
            <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: COLORS.sand }}><span className="text-sm" style={{ color: COLORS.ink }}>Natiijooyinka imtixaanka</span><strong>{data.examResults.length}</strong></div>
            <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: COLORS.sand }}><span className="text-sm" style={{ color: COLORS.ink }}>Diiwaannada horumarka</span><strong>{data.progress.length}</strong></div>
            <div className="flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: COLORS.sand }}><span className="text-sm" style={{ color: COLORS.ink }}>Imtixaannada la qorsheeyay</span><strong>{data.exams.length}</strong></div>
          </div>
        </section>
      </div>

      <div className="rounded-2xl p-5 mb-8" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
        <div className="flex items-center justify-between mb-4"><div><p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Falcelin degdeg ah</p><h2 className="text-lg font-semibold mt-1" style={{ fontFamily: DISPLAY_FONT }}>Qaybaha muhiimka ah</h2></div><BarChart3 size={22} style={{ color: COLORS.gold }} /></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quick.slice(0, 6).map((n) => (
            <button key={n.id} onClick={() => goTo(n.id)} className="rounded-xl p-3 text-left" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ backgroundColor: "rgba(201,162,39,0.18)" }}><n.icon size={17} style={{ color: COLORS.gold }} /></span><span className="block text-xs mt-2" style={{ color: "#fff" }}>{navLabel(n.id, n.label)}</span></button>
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: COLORS.inkSoft }}>Dhammaan Qaybaha</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
        {quick.map((n) => (
          <button key={n.id} onClick={() => goTo(n.id)} className="flex flex-col items-center gap-1.5"><IconTile id={n.id} icon={n.icon} size={56} iconSize={22} /><span className="text-[11px] text-center leading-tight" style={{ color: COLORS.ink }}>{navLabel(n.id, n.label)}</span></button>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   Subjects & Academic Progress Screen
========================================================= */
function ProgressScreen() {
  const [tab, setTab] = useState("progress");
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectForm, setSubjectForm] = useState({ name: "", teacher: "", className: "" });
  const [progressForm, setProgressForm] = useState({ studentName: "", subject: "", term: "Semester 1", score: "", date: todayISO(), teacher: "", note: "" });

  useEffect(() => {
    Promise.all([loadArr("students-data"), loadArr("subjects-data"), loadArr("academic-progress-data"), loadArr("progress-data")]).then(([studentList, subjectList, progressList]) => {
      setStudents(Array.isArray(studentList) ? studentList : []);
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
      setRecords(Array.isArray(progressList) ? progressList : []);
      setLoading(false);
    });
  }, []);

  const persistSubjects = (next) => persistList("subjects-data", next, setSubjects);
  const persistRecords = (next) => persistList("academic-progress-data", next, setRecords);

  const addSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    setSaving(true);
    const item = { id: Date.now(), name: subjectForm.name.trim(), teacher: subjectForm.teacher.trim(), className: subjectForm.className.trim(), createdAt: new Date().toISOString() };
    const savedSubject = await persistSubjects([item, ...subjects]);
    if (savedSubject) setSubjectForm({ name: "", teacher: "", className: "" });
    setSaving(false);
  };

  const deleteSubject = async (id) => { await persistSubjects(subjects.filter((s) => s.id !== id)); };

  const addProgress = async (e) => {
    e.preventDefault();
    if (!progressForm.studentName.trim() || !progressForm.subject.trim()) return;
    const rawScore = progressForm.score === "" ? "" : Number(progressForm.score);
    if (rawScore !== "" && (Number.isNaN(rawScore) || rawScore < 0 || rawScore > 100)) return;
    setSaving(true);
    const item = { ...progressForm, id: Date.now(), score: rawScore, createdAt: new Date().toISOString() };
    const savedProgress = await persistRecords([item, ...records]);
    setSaving(false);
    if (!savedProgress) return;
    setProgressForm({ studentName: "", subject: "", term: "Semester 1", score: "", date: todayISO(), teacher: "", note: "" });
    setTab("progress");
  };

  const removeProgress = async (id) => { await persistRecords(records.filter((r) => r.id !== id)); };
  const filtered = records.filter((r) => `${r.studentName || ""} ${r.subject || ""} ${r.teacher || ""} ${r.term || ""}`.toLowerCase().includes(search.toLowerCase()));
  const scored = records.filter((r) => typeof r.score === "number" && !Number.isNaN(r.score));
  const average = scored.length ? Math.round(scored.reduce((sum, r) => sum + r.score, 0) / scored.length) : 0;
  const passed = scored.filter((r) => r.score >= 50).length;

  if (loading) return <p className="text-sm py-10 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div><h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Maadooyin & Horumar</h2><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Maamul maadooyinka oo la soco dhibcaha iyo horumarka ardayda.</p></div>
        <button onClick={() => setTab(tab === "form" ? "progress" : "form")} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16} /> {tab === "form" ? "Diiwaanka" : "Ku dar Horumar"}</button>
      </div>
      <SignatureChain className="mb-4" />
      <div className="flex gap-2 mb-5">
        {[['progress','Horumarka'],['subjects','Maadooyinka'],['form','Diiwaangeli']].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className="rounded-full px-4 py-2 text-xs font-semibold border" style={{ borderColor: COLORS.line, backgroundColor: tab === id ? COLORS.teal : '#fff', color: tab === id ? '#fff' : COLORS.ink }}>{label}</button>)}
      </div>

      {tab === "subjects" && <div className="grid lg:grid-cols-2 gap-5">
        <form onSubmit={addSubject} className="rounded-xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: '#fff' }}>
          <h3 className="font-semibold mb-4" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Ku dar Maado</h3>
          <div className="space-y-3">
            <input value={subjectForm.name} onChange={(e)=>setSubjectForm(p=>({...p,name:e.target.value}))} placeholder="Magaca Maadada *" required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <input value={subjectForm.teacher} onChange={(e)=>setSubjectForm(p=>({...p,teacher:e.target.value}))} placeholder="Macalinka" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <input value={subjectForm.className} onChange={(e)=>setSubjectForm(p=>({...p,className:e.target.value}))} placeholder="Fasalka" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <button disabled={saving} className="w-full rounded-lg py-3 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>{saving?'Kaydinaya...':'Kaydi Maadada'}</button>
          </div>
        </form>
        <div className="rounded-xl border overflow-hidden" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
          <div className="px-5 py-4 border-b" style={{borderColor:COLORS.line}}><p className="font-semibold" style={{color:COLORS.ink}}>Maadooyinka ({subjects.length})</p></div>
          {subjects.length===0 ? <EmptyState icon={TrendingUp} text="Wali maado lama gelin." /> : <div>{subjects.map(s=><div key={s.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b last:border-b-0" style={{borderColor:COLORS.line}}><div><p className="font-semibold text-sm" style={{color:COLORS.ink}}>{s.name}</p><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{[s.teacher,s.className].filter(Boolean).join(' · ') || 'Faahfaahin lama gelin'}</p></div><button onClick={()=>deleteSubject(s.id)} className="p-2 rounded-lg" style={{color:COLORS.brick,backgroundColor:'#FDECEC'}}><Trash2 size={15}/></button></div>)}</div>}
        </div>
      </div>}

      {tab === "form" && <form onSubmit={addProgress} className="max-w-2xl mx-auto rounded-xl border p-5" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
        <h3 className="font-semibold mb-1" style={{color:COLORS.ink,fontFamily:DISPLAY_FONT}}>Diiwaangeli Horumarka Ardayga</h3><p className="text-xs mb-5" style={{color:COLORS.inkSoft}}>Geli natiijada ama qiimeynta maadada.</p>
        <div className="space-y-4">
          <StudentSearchSelect students={students} value={progressForm.studentName} onChange={(v)=>setProgressForm(p=>({...p,studentName:v}))} placeholder="Raadi magaca ardayga..." style={{borderColor:COLORS.line}} />
          <div className="grid md:grid-cols-2 gap-3"><select value={progressForm.subject} onChange={e=>setProgressForm(p=>({...p,subject:e.target.value}))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro maado...</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select><select value={progressForm.term} onChange={e=>setProgressForm(p=>({...p,term:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option>Semester 1</option><option>Semester 2</option><option>Sanad Dugsi</option></select></div>
          <div className="grid md:grid-cols-3 gap-3"><input type="number" min="0" max="100" value={progressForm.score} onChange={e=>setProgressForm(p=>({...p,score:e.target.value}))} placeholder="Dhibco %" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}/><input type="date" value={progressForm.date} onChange={e=>setProgressForm(p=>({...p,date:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}/><input value={progressForm.teacher} onChange={e=>setProgressForm(p=>({...p,teacher:e.target.value}))} placeholder="Macalin" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}/></div>
          <textarea value={progressForm.note} onChange={e=>setProgressForm(p=>({...p,note:e.target.value}))} placeholder="Faallo / Qiimeyn" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line,minHeight:90}}/>
          <button disabled={saving || !students.length || !subjects.length} className="w-full rounded-lg py-3 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>{saving?'Kaydinaya...':'Kaydi Horumarka'}</button>
        </div>
      </form>}

      {tab === "progress" && <>
        <div className="grid grid-cols-3 gap-3 mb-5"><StatCard label="Diiwaanno" value={records.length} tone="teal"/><StatCard label="Celcelis %" value={average} tone="light"/><StatCard label="Gudbay" value={passed} tone="gold"/></div>
        <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:COLORS.inkSoft}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Raadi arday, maado ama macalin..." className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" style={{borderColor:COLORS.line}}/></div>
        {filtered.length===0 ? <EmptyState icon={TrendingUp} text="Wali lama gelin horumar arday."/> : <div className="space-y-2">{filtered.map(r=><div key={r.id} className="rounded-xl border px-4 py-3" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold" style={{color:COLORS.ink}}>{r.studentName}</p><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{[r.subject,r.term,r.teacher,fmtDate(r.date)].filter(Boolean).join(' · ')}</p>{r.note&&<p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{r.note}</p>}</div><div className="flex items-center gap-2">{r.score!==''&&r.score!=null&&<span className="rounded-full px-3 py-1 text-sm font-bold" style={{backgroundColor:r.score>=50?COLORS.goldSoft:'#FDECEC',color:r.score>=50?COLORS.tealDeep:COLORS.brick}}>{r.score}%</span>}<button onClick={()=>removeProgress(r.id)} className="p-2 rounded-lg" style={{color:COLORS.brick,backgroundColor:'#FDECEC'}}><Trash2 size={15}/></button></div></div></div>)}</div>}
      </>}
    </div>
  );
}

/* =========================================================
   V29 — Exam Schedule & Results
   Logout/Ka bax is preserved from V28.
=========================================================
   Exams & Report Cards Screen
========================================================= */
function ExamsScreen() {
  const [tab, setTab] = useState("exams");
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [examForm, setExamForm] = useState({ name: "", subject: "", className: "", date: todayISO(), time: "", room: "", maxScore: "100" });
  const [resultForm, setResultForm] = useState({ examId: "", studentName: "", score: "", note: "" });
  const [reportStudent, setReportStudent] = useState("");

  useEffect(() => {
    Promise.all([
      loadArr("exams-data"),
      loadArr("exam-results-data"),
      loadArr("students-data"),
      loadArr("subjects-data"),
    ]).then(([examList, resultList, studentList, subjectList]) => {
      setExams(Array.isArray(examList) ? examList : []);
      setResults(Array.isArray(resultList) ? resultList : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setSubjects(Array.isArray(subjectList) ? subjectList : []);
      setLoading(false);
    });
  }, []);

  const persistExams = (next) => persistList("exams-data", next, setExams);
  const persistResults = (next) => persistList("exam-results-data", next, setResults);

  const addExam = async (e) => {
    e.preventDefault();
    if (!examForm.name.trim()) return;
    const max = Number(examForm.maxScore || 100);
    if (!Number.isFinite(max) || max <= 0) return;
    setSaving(true);
    const item = {
      id: Date.now(),
      name: examForm.name.trim(),
      subject: examForm.subject.trim(),
      className: examForm.className.trim(),
      date: examForm.date,
      time: examForm.time,
      room: examForm.room.trim(),
      maxScore: max,
      createdAt: new Date().toISOString(),
    };
    const savedExam = await persistExams([item, ...exams]);
    setSaving(false);
    if (!savedExam) return;
    setExamForm({ name: "", subject: "", className: "", date: todayISO(), time: "", room: "", maxScore: "100" });
    setTab("exams");
  };

  const deleteExam = async (id) => {
    if (!(await persistExams(exams.filter((e) => e.id !== id)))) return;
    await persistResults(results.filter((r) => r.examId !== id));
    if (resultForm.examId === String(id)) setResultForm((p) => ({ ...p, examId: "" }));
  };

  const addResult = async (e) => {
    e.preventDefault();
    const exam = exams.find((x) => String(x.id) === String(resultForm.examId));
    if (!exam || !resultForm.studentName.trim()) return;
    const score = Number(resultForm.score);
    if (!Number.isFinite(score) || score < 0 || score > exam.maxScore) return;
    setSaving(true);
    const existing = results.find((r) => String(r.examId) === String(exam.id) && sameText(r.studentName, resultForm.studentName));
    const item = { id: existing?.id || Date.now(), examId: exam.id, studentName: resultForm.studentName, score, note: resultForm.note.trim(), updatedAt: new Date().toISOString() };
    const next = existing ? results.map((r) => (r.id === existing.id ? item : r)) : [item, ...results];
    const savedResult = await persistResults(next);
    setSaving(false);
    if (!savedResult) return;
    setResultForm({ examId: String(exam.id), studentName: "", score: "", note: "" });
  };

  const grade = (score, max) => {
    const pct = max ? (Number(score) / Number(max)) * 100 : 0;
    if (pct >= 90) return "A";
    if (pct >= 80) return "B";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    if (pct >= 50) return "E";
    return "F";
  };

  const selectedReportStudent = students.find((s) => sameText(s.name, reportStudent));
  const reportRows = results
    .filter((r) => sameText(r.studentName, reportStudent))
    .map((r) => {
      const exam = exams.find((e) => String(e.id) === String(r.examId));
      return exam ? { ...r, exam } : null;
    })
    .filter(Boolean);
  const reportAverage = reportRows.length
    ? Math.round(reportRows.reduce((sum, r) => sum + (Number(r.score) / Number(r.exam.maxScore || 100)) * 100, 0) / reportRows.length)
    : 0;
  const filteredExams = exams.filter((e) => `${e.name} ${e.subject} ${e.className}`.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p className="text-sm py-10 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Imtixaanno & Report Cards</h2>
          <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Samee imtixaan, qorshee waqtiga iyo qolka, geli natiijooyinka, oo soo saar warbixinta ardayga.</p>
        </div>
        <button onClick={() => setTab(tab === "exam-form" ? "exams" : "exam-form")} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16} /> {tab === "exam-form" ? "Imtixaannada" : "Imtixaan Cusub"}</button>
      </div>
      <SignatureChain className="mb-4" />
      <div className="flex gap-2 mb-5 flex-wrap">
        {[['exams','Imtixaannada'],['result-form','Geli Natiijo'],['report','Report Card'],['exam-form','Samee Imtixaan']].map(([id,label]) => <button key={id} onClick={() => setTab(id)} className="rounded-full px-4 py-2 text-xs font-semibold border" style={{ borderColor: COLORS.line, backgroundColor: tab === id ? COLORS.teal : '#fff', color: tab === id ? '#fff' : COLORS.ink }}>{label}</button>)}
      </div>

      {tab === "exam-form" && <form onSubmit={addExam} className="max-w-2xl mx-auto rounded-xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: '#fff' }}>
        <h3 className="font-semibold mb-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Samee Imtixaan Cusub</h3>
        <p className="text-xs mb-5" style={{ color: COLORS.inkSoft }}>Imtixaanka marka hore samee, kadib natiijooyinka ardayda geli.</p>
        <div className="space-y-4">
          <input value={examForm.name} onChange={(e)=>setExamForm(p=>({...p,name:e.target.value}))} placeholder="Magaca imtixaanka *" required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
          <div className="grid md:grid-cols-2 gap-3">
            <select value={examForm.subject} onChange={(e)=>setExamForm(p=>({...p,subject:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro maado...</option>{subjects.map(s=><option key={s.id} value={s.name}>{s.name}</option>)}</select>
            <input value={examForm.className} onChange={(e)=>setExamForm(p=>({...p,className:e.target.value}))} placeholder="Fasalka" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="date" value={examForm.date} onChange={(e)=>setExamForm(p=>({...p,date:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <input type="time" value={examForm.time} onChange={(e)=>setExamForm(p=>({...p,time:e.target.value}))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <input value={examForm.room} onChange={(e)=>setExamForm(p=>({...p,room:e.target.value}))} placeholder="Qolka / Hoolka" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
            <input type="number" min="1" value={examForm.maxScore} onChange={(e)=>setExamForm(p=>({...p,maxScore:e.target.value}))} placeholder="Ugu badnaan dhibco" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
          </div>
          <button disabled={saving} className="w-full rounded-lg py-3 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>{saving?'Kaydinaya...':'Kaydi Imtixaanka'}</button>
        </div>
      </form>}

      {tab === "exams" && <>
        <div className="grid grid-cols-3 gap-3 mb-5"><StatCard label="Imtixaano" value={exams.length} tone="teal"/><StatCard label="Natiijooyin" value={results.length} tone="light"/><StatCard label="Arday" value={new Set(results.map(r=>r.studentName)).size} tone="gold"/></div>
        <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{color:COLORS.inkSoft}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Raadi imtixaan, maado ama fasal..." className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" style={{borderColor:COLORS.line}}/></div>
        {filteredExams.length===0 ? <EmptyState icon={ClipboardList} text="Wali imtixaan lama sameyn."/> : <div className="space-y-2">{filteredExams.map(exam=><div key={exam.id} className="rounded-xl border px-4 py-3" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold" style={{color:COLORS.ink}}>{exam.name}</p><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{[exam.subject,exam.className,fmtDate(exam.date),exam.time,exam.room,`/ ${exam.maxScore}`].filter(Boolean).join(' · ')}</p></div><div className="flex items-center gap-2"><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{backgroundColor:COLORS.goldSoft,color:COLORS.tealDeep}}>{results.filter(r=>String(r.examId)===String(exam.id)).length} natiijo</span><button onClick={()=>deleteExam(exam.id)} className="p-2 rounded-lg" style={{color:COLORS.brick,backgroundColor:'#FDECEC'}}><Trash2 size={15}/></button></div></div></div>)}</div>}
      </>}

      {tab === "result-form" && <form onSubmit={addResult} className="max-w-2xl mx-auto rounded-xl border p-5" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
        <h3 className="font-semibold mb-1" style={{color:COLORS.ink,fontFamily:DISPLAY_FONT}}>Geli Natiijada Ardayga</h3>
        <p className="text-xs mb-5" style={{color:COLORS.inkSoft}}>Haddii ardayga hore loogu qoray imtixaankan, natiijada waa la cusboonaysiinayaa.</p>
        <div className="space-y-4">
          <select value={resultForm.examId} onChange={e=>setResultForm(p=>({...p,examId:e.target.value}))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro imtixaan...</option>{exams.map(e=><option key={e.id} value={e.id}>{e.name}{e.subject?` — ${e.subject}`:''}</option>)}</select>
          <StudentSearchSelect students={students} value={resultForm.studentName} onChange={(v)=>setResultForm(p=>({...p,studentName:v}))} placeholder="Raadi magaca ardayga..." style={{borderColor:COLORS.line}} />
          <input type="number" min="0" value={resultForm.score} onChange={e=>setResultForm(p=>({...p,score:e.target.value}))} placeholder="Dhibcaha" required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
          <textarea value={resultForm.note} onChange={e=>setResultForm(p=>({...p,note:e.target.value}))} placeholder="Faallo" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line,minHeight:90}} />
          <button disabled={saving || !exams.length || !students.length} className="w-full rounded-lg py-3 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>{saving?'Kaydinaya...':'Kaydi Natiijada'}</button>
        </div>
      </form>}

      {tab === "report" && <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border p-5 mb-4" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
          <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-semibold" style={{color:COLORS.ink,fontFamily:DISPLAY_FONT}}>Report Card</h3><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>Dooro arday si aad u aragto natiijooyinkiisa.</p></div><button type="button" onClick={()=>window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>🖨️ Daabac</button></div>
          <StudentSearchSelect students={students} value={reportStudent} onChange={setReportStudent} placeholder="Raadi magaca ardayga..." style={{borderColor:COLORS.line}} />
        </div>
        {reportStudent && <div className="rounded-xl border overflow-hidden" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
          <div className="p-5 border-b" style={{borderColor:COLORS.line}}><p className="text-lg font-semibold" style={{fontFamily:DISPLAY_FONT,color:COLORS.ink}}>{selectedReportStudent?.name || reportStudent}</p><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{selectedReportStudent?.className || 'Fasalka lama gelin'}</p></div>
          <div className="grid grid-cols-2 gap-3 p-5"><StatCard label="Celcelis %" value={reportAverage} tone="teal"/><StatCard label="Imtixaano" value={reportRows.length} tone="gold"/></div>
          {reportRows.length===0 ? <EmptyState icon={ClipboardList} text="Ardaygan wali natiijo imtixaan ah looma gelin."/> : <div className="px-5 pb-5 space-y-2">{reportRows.map(r=><div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3" style={{borderColor:COLORS.line}}><div><p className="text-sm font-semibold" style={{color:COLORS.ink}}>{r.exam.name}</p><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>{[r.exam.subject,fmtDate(r.exam.date)].filter(Boolean).join(' · ')}{r.note?` · ${r.note}`:''}</p></div><div className="text-right"><p className="font-bold" style={{color:COLORS.teal}}>{r.score}/{r.exam.maxScore}</p><p className="text-xs font-semibold" style={{color:COLORS.gold}}>{grade(r.score,r.exam.maxScore)}</p></div></div>)}</div>}
        </div>}
      </div>}
    </div>
  );
}

/* =========================================================
   Quran & Hifdh Screen
========================================================= */
function QuranScreen() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("Dhammaan Fasallada");
  const [typeFilter, setTypeFilter] = useState("Dhammaan Ayatada");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    studentName: "", type: "Xifdhi Cusub", surah: "", fromAyah: "", toAyah: "",
    date: todayISO(), note: "", rating: "Wanaagsan",
  });

  useEffect(() => {
    let active = true;
    Promise.all([loadArr("quran-progress-data"), loadArr("students-data")]).then(([quran, studentList]) => {
      if (!active) return;
      setRecords(Array.isArray(quran) ? quran : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setLoading(false);
    }).catch((err) => {
      console.error("Quran records load failed:", err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const persist = (next) => persistList("quran-progress-data", next, setRecords);

  const chooseStudent = (name) => {
    setSelectedStudent(name);
    setForm((p) => ({ ...p, studentName: name }));
  };

  const startNew = () => {
    setEditingId(null);
    setForm({ studentName: selectedStudent, type: "Xifdhi Cusub", surah: "", fromAyah: "", toAyah: "", date: todayISO(), note: "", rating: "Wanaagsan" });
  };

  const submit = async (e) => {
    e.preventDefault();
    const studentName = (form.studentName || selectedStudent).trim();
    if (!studentName) return;
    setSaving(true);
    try {
      const payload = { ...form, studentName, rating: form.rating || "Wanaagsan" };
      let savedRecord;
      if (editingId !== null) {
        savedRecord = await persist(records.map((r) => String(r.id) === String(editingId) ? { ...r, ...payload, id: r.id } : r));
      } else {
        const item = { ...payload, id: Date.now(), createdAt: new Date().toISOString() };
        savedRecord = await persist([item, ...records]);
      }
      if (!savedRecord) return; // keep the form content
      setSelectedStudent(studentName);
      setForm({ studentName, type: "Xifdhi Cusub", surah: "", fromAyah: "", toAyah: "", date: todayISO(), note: "", rating: "Wanaagsan" });
      setEditingId(null);
    } catch (err) {
      console.error("Quran record save failed:", err);
      notify("Diiwaangelinta way fashilantay. Fadlan mar kale isku day.", "error");
    } finally {
      setSaving(false);
    }
  };

  const editRecord = (record) => {
    setSelectedStudent(record.studentName || "");
    setForm({ studentName: record.studentName || "", type: record.type || "Xifdhi Cusub", surah: record.surah || "", fromAyah: record.fromAyah || "", toAyah: record.toAyah || "", date: record.date || todayISO(), note: record.note || "", rating: record.rating || "Wanaagsan" });
    setEditingId(record.id);
  };

  const deleteRecord = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    try {
      await persist(records.filter((r) => String(r.id) !== String(id)));
    } catch (err) {
      console.error("Quran record delete failed:", err);
      notify("Diiwaanka lama tirtiri karin. Mar kale isku day.", "error");
    }
    setConfirmDeleteId(null);
  };

  const classOptions = [...new Set(students.map((s) => s.className).filter(Boolean))].sort();
  const visibleStudents = students.filter((s) => {
    const name = (s.name || s.fullName || "").trim();
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase());
    const matchesClass = classFilter === "Dhammaan Fasallada" || s.className === classFilter;
    return matchesSearch && matchesClass;
  });
  const selectedStudentData = students.find((s) => (s.name || s.fullName) === selectedStudent);
  const studentRecords = records.filter((r) => r.studentName === selectedStudent).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const filteredRecords = studentRecords.filter((r) => typeFilter === "Dhammaan Ayatada" || r.type === typeFilter);
  const todayCount = records.filter((r) => r.date === todayISO()).length;
  const studentsCount = new Set(records.map((r) => r.studentName).filter(Boolean)).size;
  const lessonTypes = [
    { value: "Xifdhi Cusub", title: "Cashar Cusub", sub: "Aayado cusub", Icon: BookOpen },
    { value: "Dib-u-celin", title: "Dib u Celis", sub: "Ku celis hore", Icon: RotateCcw },
    { value: "Dareeris", title: "Dareeris", sub: "Xoojinta xifdiga", Icon: TrendingUp },
    { value: "Subac", title: "Subac", sub: "Qaybta subaca", Icon: CalendarDays },
    { value: "Akhris", title: "Aqris", sub: "Akhris iyo sixid", Icon: MessageCircle },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: COLORS.teal, color: "#fff" }}><BookOpen size={25}/></div>
          <div><h2 className="text-xl md:text-2xl font-bold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Diiwaangelinta Casharrada</h2><p className="text-xs md:text-sm" style={{ color: COLORS.inkSoft }}>Hal meel ka diiwaangeli dhammaan casharrada ardayga.</p></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm" style={{ borderColor: COLORS.line, color: COLORS.ink }}><CalendarDays size={16}/>{fmtDate(todayISO())}</div>
          <button type="button" onClick={startNew} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}><Plus size={17}/> Cashar Cusub</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5"><StatCard label="Diiwaannada Maanta" value={todayCount} tone="teal"/><StatCard label="Ardayda leh diiwaan" value={studentsCount} tone="light"/></div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <section className="lg:col-span-5 rounded-2xl border p-3 md:p-4" style={{ borderColor: COLORS.line, backgroundColor: "#FFFEFA" }}>
          <div className="relative mb-3"><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi magaca ardayga..." className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm bg-transparent" style={{ borderColor: COLORS.line }}/></div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="min-w-0 rounded-xl border px-2 py-2.5 text-xs" style={{ borderColor: COLORS.line, color: COLORS.ink }}><option>Dhammaan Fasallada</option>{classOptions.map((c) => <option key={c}>{c}</option>)}</select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="min-w-0 rounded-xl border px-2 py-2.5 text-xs" style={{ borderColor: COLORS.line, color: COLORS.ink }}><option>Dhammaan Ayatada</option>{lessonTypes.map((t) => <option key={t.value}>{t.value}</option>)}</select>
          </div>
          <div className="flex items-center justify-between mb-2 px-1"><h3 className="text-sm font-bold" style={{ color: COLORS.ink }}>Liiska Ardayda</h3><span className="text-xs" style={{ color: COLORS.inkSoft }}>{visibleStudents.length} arday</span></div>
          {loading ? <p className="text-sm text-center py-8" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p> : visibleStudents.length === 0 ? <EmptyState icon={Users} text="Arday lama helin."/> : <div className="space-y-2 max-h-[570px] overflow-y-auto pr-1">{visibleStudents.map((s) => {
            const name = (s.name || s.fullName || "Arday aan magac lahayn").trim();
            const count = records.filter((r) => r.studentName === name).length;
            const isSelected = selectedStudent === name;
            return <button type="button" key={s.id || name} onClick={() => { chooseStudent(name); setEditingId(null); }} className="w-full text-left flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors" style={{ borderColor: isSelected ? COLORS.teal : "transparent", backgroundColor: isSelected ? COLORS.teal : "#fff", color: isSelected ? "#fff" : COLORS.ink }}>
              <span className="w-8 h-8 shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: isSelected ? "rgba(255,255,255,.18)" : COLORS.sandDeep, color: isSelected ? "#fff" : COLORS.teal }}><Users size={16}/></span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold truncate">{name}</span><span className="block text-xs mt-1 truncate" style={{ color: isSelected ? "#DDEBE6" : COLORS.inkSoft }}>{[s.className || "Fasal lama gelin", `${count} diiwaan`].join(" · ")}</span></span>
              {isSelected ? <Check size={19} style={{ color: COLORS.gold }}/> : <BookOpen size={18} style={{ color: COLORS.gold }}/ >}
            </button>;
          })}</div>}
        </section>

        <section className="lg:col-span-7 rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          {selectedStudent ? <>
            <div className="px-4 md:px-5 py-4 flex items-center gap-3" style={{ background: `linear-gradient(110deg, ${COLORS.tealDeep}, ${COLORS.teal})`, color: "#fff" }}>
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,.15)" }}><Users size={23}/></div>
              <div className="min-w-0"><h3 className="font-bold truncate">{selectedStudent}</h3><p className="text-xs mt-1" style={{ color: "#D8E7E1" }}>{selectedStudentData?.className || "Fasalka lama gelin"} · {studentRecords.length} diiwaan</p></div>
            </div>
            <form onSubmit={submit} className="p-4 md:p-5 space-y-4">
              <div><h3 className="text-sm font-bold mb-3" style={{ color: COLORS.ink }}>Nooca Casharka</h3><div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">{lessonTypes.map(({ value, title, sub, Icon }) => {
                const active = form.type === value;
                return <button type="button" key={value} onClick={() => setForm((p) => ({ ...p, type: value }))} className="rounded-xl border p-3 text-center min-w-0" style={{ borderColor: active ? COLORS.teal : COLORS.line, backgroundColor: active ? COLORS.teal : "#FFFEFA", color: active ? "#fff" : COLORS.ink }}><Icon size={22} className="mx-auto mb-2"/><span className="block text-xs font-bold">{title}</span><span className="block text-[10px] mt-1" style={{ color: active ? "#D8E7E1" : COLORS.inkSoft }}>{sub}</span></button>;
              })}</div></div>
              <div><h3 className="text-sm font-bold mb-3" style={{ color: COLORS.ink }}>Faahfaahinta Casharka</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold" style={{ color: COLORS.inkSoft }}>Suuradda<input value={form.surah} onChange={(e) => setForm((p) => ({ ...p, surah: e.target.value }))} placeholder="Tusaale: Al-Baqarah" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" style={{ borderColor: COLORS.line, color: COLORS.ink }}/></label>
                <label className="text-xs font-semibold" style={{ color: COLORS.inkSoft }}>Taariikhda<input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" style={{ borderColor: COLORS.line, color: COLORS.ink }}/></label>
                <label className="text-xs font-semibold" style={{ color: COLORS.inkSoft }}>Aayadda laga bilaabay<input type="number" min="1" value={form.fromAyah} onChange={(e) => setForm((p) => ({ ...p, fromAyah: e.target.value }))} placeholder="Tusaale: 150" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" style={{ borderColor: COLORS.line, color: COLORS.ink }}/></label>
                <label className="text-xs font-semibold" style={{ color: COLORS.inkSoft }}>Aayadda lagu dhammeeyay<input type="number" min="1" value={form.toAyah} onChange={(e) => setForm((p) => ({ ...p, toAyah: e.target.value }))} placeholder="Tusaale: 163" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" style={{ borderColor: COLORS.line, color: COLORS.ink }}/></label>
              </div></div>
              <div><h3 className="text-sm font-bold mb-2" style={{ color: COLORS.ink }}>Qiimeyn / Xaalad</h3><div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{["Wanaagsan", "Dhexe", "Daciif", "Dhamaystiran"].map((rating) => <button type="button" key={rating} onClick={() => setForm((p) => ({ ...p, rating }))} className="rounded-xl border px-2 py-2.5 text-xs font-semibold" style={{ borderColor: form.rating === rating ? COLORS.teal : COLORS.line, backgroundColor: form.rating === rating ? COLORS.teal : "#fff", color: form.rating === rating ? "#fff" : COLORS.ink }}>{form.rating === rating ? "✓  " : "○  "}{rating}</button>)}</div></div>
              <label className="block text-xs font-semibold" style={{ color: COLORS.inkSoft }}>Faallo (Ikhtiyaari)<textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Tusaale: Wuu xifdiyey si wanaagsan..." className="mt-1.5 w-full rounded-xl border px-3 py-3 text-sm font-normal" style={{ borderColor: COLORS.line, color: COLORS.ink, minHeight: 76 }}/></label>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1"><button type="button" onClick={startNew} className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold" style={{ borderColor: COLORS.line, color: COLORS.ink }}><RotateCcw size={16}/> Nadiifi</button><button type="submit" disabled={saving} className="flex-1 sm:flex-none sm:min-w-[230px] flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold disabled:opacity-60" style={{ backgroundColor: COLORS.teal, color: "#fff" }}><Check size={18}/>{saving ? "Kaydinaya..." : editingId !== null ? "Kaydi Beddelka" : "Diiwaangeli Casharka"}</button></div>
            </form>
            <div className="border-t px-4 md:px-5 py-4" style={{ borderColor: COLORS.line, backgroundColor: "#FFFEFA" }}><div className="flex items-center justify-between gap-2 mb-3"><h3 className="text-sm font-bold" style={{ color: COLORS.ink }}>Diiwaannadii Ardayga</h3><span className="text-xs" style={{ color: COLORS.inkSoft }}>{filteredRecords.length} diiwaan</span></div>{filteredRecords.length === 0 ? <p className="text-xs py-3" style={{ color: COLORS.inkSoft }}>Ardaygan wali cashar looma diiwaangelin.</p> : <div className="space-y-2 max-h-56 overflow-y-auto">{filteredRecords.map((r) => <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border bg-white p-3" style={{ borderColor: COLORS.line }}><div className="min-w-0"><p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>{r.type} · {r.surah || "Suurad lama gelin"}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{r.fromAyah || r.toAyah ? `Aayado ${r.fromAyah || "?"}–${r.toAyah || "?"} · ` : ""}{fmtDate(r.date)}{r.rating ? ` · ${r.rating}` : ""}</p></div><div className="flex items-center gap-1 shrink-0"><button type="button" title="Wax ka beddel" onClick={() => editRecord(r)} className="p-2 rounded-lg" style={{ color: COLORS.tealLight }}><Pencil size={15}/></button><button type="button" title={confirmDeleteId === r.id ? "Xaqiiji tirtiridda" : "Tirtir"} onClick={() => deleteRecord(r.id)} className="p-2 rounded-lg" style={{ color: COLORS.brick, backgroundColor: confirmDeleteId === r.id ? "#F8E8E4" : "transparent" }}><Trash2 size={15}/></button></div></div>)}</div>}</div>
          </> : <div className="min-h-[420px] flex flex-col items-center justify-center text-center p-6"><div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: COLORS.sand, color: COLORS.teal }}><BookOpen size={30}/></div><h3 className="font-bold" style={{ color: COLORS.ink }}>Dooro ardayga</h3><p className="text-sm mt-2 max-w-xs" style={{ color: COLORS.inkSoft }}>Liiska bidix ka dooro arday si aad ugu diiwaangeliso casharkiisa cusub ama dib-u-celiska.</p></div>}
        </section>
      </div>
    </div>
  );
}
/* =========================================================
   App Shell
========================================================= */
function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const clearMessages = () => {
    setError("");
    setResetMessage("");
    setSuccessMessage("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) setError("Email-ka ama furaha sirta ah waa khalad.");
    } catch (err) {
      setError(err?.message || "Soo gelitaanka waa fashilmay.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    clearMessages();
    const cleanSchoolName = schoolName.trim();
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanSchoolName || cleanSchoolName.length > 120) {
      setError("Geli magaca madrasadda (1 ilaa 120 xaraf).");
      return;
    }
    if (!cleanName) {
      setError("Geli magacaaga oo buuxa.");
      return;
    }
    if (password.length < 6) {
      setError("Furaha sirta ah waa inuu ahaadaa ugu yaraan 6 xaraf.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            nibraas_school_name: cleanSchoolName,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (signupError) {
        setError(signupError.message || "Akoonka lama abuuri karin.");
        return;
      }

      if (data?.session) {
        setSuccessMessage("Akoonka waa la abuuray. NIBRAAS wuxuu diyaarinayaa madrasaddaada.");
      } else {
        setSuccessMessage("Akoonka waa la bilaabay. Fadlan ka xaqiiji email-kaaga, dabadeed ku soo gal email-ka iyo password-ka aad samaysay.");
        setMode("login");
      }
    } catch (err) {
      setError(err?.message || "Diiwaangelintu way fashilantay.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    clearMessages();
    if (!email.trim()) {
      setError("Marka hore geli email-ka.");
      return;
    }
    setResetLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: window.location.origin }
      );
      if (resetError) {
        setError(resetError.message || "Email-ka reset-ka lama dirin.");
      } else {
        setResetMessage("Email-ka password reset-ka waa la diray. Ka eeg Gmail-ka.");
      }
    } catch (err) {
      setError(err?.message || "Email-ka reset-ka lama dirin.");
    } finally {
      setResetLoading(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 sm:p-8"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 overflow-hidden bg-white">
            <img
              src={logo}
              alt="Astaanta NIBRAAS"
              className="w-full h-full object-contain"
            />
          </div>
          <h1
            className="text-2xl font-bold text-center"
            style={{ fontFamily: DISPLAY_FONT, color: COLORS.tealDeep }}
          >
            {isSignup ? "Diiwaangeli Madrasad" : "Gal NIBRAAS"}
          </h1>
          <p className="text-sm mt-2 text-center" style={{ color: COLORS.inkSoft }}>
            Nidaamka Maareynta Madrasada
          </p>
        </div>

        <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
          {isSignup && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
                  Magaca madrasadda
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Tusaale: Madrasada Al-Huda"
                  maxLength={120}
                  required
                  className="w-full rounded-lg px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
                  Magacaaga oo buuxa
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Magacaaga"
                  required
                  autoComplete="name"
                  className="w-full rounded-lg px-3 py-2.5 outline-none"
                  style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
              Email-ka
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
              Furaha sirta ah
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={isSignup ? "new-password" : "current-password"}
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
            />
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}>
              {error}
            </div>
          )}
          {resetMessage && (
            <div className="rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#E8F5F1", color: COLORS.tealDeep }}>
              {resetMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg px-3 py-2.5 text-sm" style={{ backgroundColor: "#E8F5F1", color: COLORS.tealDeep }}>
              {successMessage}
            </div>
          )}

          {!isSignup && (
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={resetLoading}
              className="w-full text-sm font-semibold py-1"
              style={{ color: COLORS.teal }}
            >
              {resetLoading ? "Email-ka diraya..." : "Furaha sirta ah waan ilaaway"}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-semibold transition"
            style={{ backgroundColor: loading ? COLORS.inkSoft : COLORS.teal, color: "#fff" }}
          >
            {loading
              ? "Fadlan sug..."
              : isSignup
                ? "Samee Akoon & Madrasad"
                : "Soo Gal"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm" style={{ color: COLORS.inkSoft }}>
          {isSignup ? "Akoon ma leedahay? " : "Madrasad cusub? "}
          <button
            type="button"
            onClick={() => {
              clearMessages();
              setMode(isSignup ? "login" : "signup");
            }}
            className="font-bold underline underline-offset-2"
            style={{ color: COLORS.teal }}
          >
            {isSignup ? "Soo gal" : "Isdiiwaangeli"}
          </button>
        </div>
      </div>
    </div>
  );
}
function RecoveryScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Furaha sirta ah ugu yaraan 6 xaraf ha noqdo.");
      return;
    }
    if (password !== confirm) {
      setError("Labada furaha sirta ah isma laha.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message || "Furaha sirta ah lama cusboonaysiin.");
      return;
    }

    setDone(true);
    setTimeout(() => onDone(), 1200);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div className="text-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: COLORS.gold }}
          >
            <span
              style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 32, color: COLORS.tealDeep }}
            >
              N
            </span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: DISPLAY_FONT, color: COLORS.tealDeep }}
          >
            Cusboonaysii Furaha
          </h1>
          <p className="text-sm mt-2" style={{ color: COLORS.inkSoft }}>
            NIBRAAS
          </p>
        </div>

        {done ? (
          <div
            className="rounded-lg px-4 py-3 text-sm text-center"
            style={{ backgroundColor: "#E8F5F1", color: COLORS.tealDeep }}
          >
            Furaha sirta ah waa la beddelay. NIBRAAS ayaa kuu furmaya...
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
                Furaha cusub
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3 py-2.5 outline-none"
                style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: COLORS.ink }}>
                Ku celi furaha cusub
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-lg px-3 py-2.5 outline-none"
                style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
              />
            </div>

            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 font-semibold"
              style={{ backgroundColor: loading ? COLORS.inkSoft : COLORS.teal, color: "#fff" }}
            >
              {loading ? "Kaydinaya..." : "Beddel Furaha"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


/* =========================================================
   Timetable / Jadwalka Casharrada
========================================================= */
function ScheduleScreen() {
  const DAYS = ["Sabti", "Axad", "Isniin", "Talaado", "Arbaco", "Khamiis"];
  const emptyForm = {
    day: "Sabti",
    start: "08:00",
    end: "09:00",
    className: "",
    subject: "",
    teacher: "",
    room: "",
    note: "",
  };
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [filterDay, setFilterDay] = useState("Dhammaan");

  const scheduleKey = "timetable-data";

  useEffect(() => {
    let alive = true;
    loadArr(scheduleKey).then((data) => {
      if (!alive) return;
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const persist = async (next) => {
    const ok = await persistList(scheduleKey, next, setItems);
    if (!ok) return false;
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    return true;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.className.trim() || !form.teacher.trim()) return;

    const record = {
      ...form,
      subject: form.subject.trim(),
      className: form.className.trim(),
      teacher: form.teacher.trim(),
      room: form.room.trim(),
      note: form.note.trim(),
    };

    const next = editingId
      ? items.map((it) => it.id === editingId ? { ...it, ...record, updatedAt: new Date().toISOString() } : it)
      : [{ id: crypto.randomUUID(), ...record, createdAt: new Date().toISOString() }, ...items];

    if (!(await persist(next))) return;
    resetForm();
  };

  const editItem = (it) => {
    setEditingId(it.id);
    setForm({
      day: it.day || "Sabti",
      start: it.start || "08:00",
      end: it.end || "09:00",
      className: it.className || "",
      subject: it.subject || "",
      teacher: it.teacher || "",
      room: it.room || "",
      note: it.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeItem = async (id) => {
    if (!(await askConfirm("Ma hubtaa inaad ka saarto casharkan jadwalka?", { confirmLabel: "Ka saar", danger: true }))) return;
    if (!(await persist(items.filter((it) => it.id !== id)))) return;
    if (editingId === id) resetForm();
  };

  const filtered = filterDay === "Dhammaan" ? items : items.filter((it) => it.day === filterDay);
  const ordered = [...filtered].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff) return dayDiff;
    return String(a.start || "").localeCompare(String(b.start || ""));
  });

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          Jadwalka Casharrada
        </h2>
        <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
          Samee oo maamul jadwalka toddobaadlaha ah ee fasallada iyo macallimiinta.
        </p>
      </div>

      <div className="rounded-2xl border p-4 md:p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="font-semibold" style={{ color: COLORS.ink }}>
              {editingId ? "Wax ka beddel casharka" : "Ku dar cashar cusub"}
            </p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
              Buuxi fasalka, maadada iyo macallinka.
            </p>
          </div>
          {editingId && (
            <button onClick={resetForm} className="rounded-lg px-3 py-2 text-sm" style={{ color: COLORS.inkSoft, backgroundColor: COLORS.sandDeep }}>
              Jooji
            </button>
          )}
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Maalinta</span>
            <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }}>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Bilowga</span>
            <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Dhammaadka</span>
            <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Fasalka *</span>
            <input required value={form.className} onChange={(e) => setForm({ ...form, className: e.target.value })} placeholder="Tusaale: Fasalka 1" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="block mb-1.5 font-medium">Maadada *</span>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Tusaale: Qur'aan" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Macallinka *</span>
            <input required value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} placeholder="Magaca macallinka" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm">
            <span className="block mb-1.5 font-medium">Qolka</span>
            <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="Qolka 2" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <label className="text-sm md:col-span-3">
            <span className="block mb-1.5 font-medium">Faallo</span>
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Faallo haddii loo baahdo" className="w-full rounded-lg border px-3 py-2.5" style={{ borderColor: COLORS.line }} />
          </label>
          <div className="flex items-end">
            <button type="submit" className="w-full rounded-lg px-4 py-2.5 font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
              <Plus size={17} /> {editingId ? "Cusboonaysii" : "Ku dar Jadwalka"}
            </button>
          </div>
        </form>
        {saved && <p className="text-xs mt-3" style={{ color: COLORS.teal }}>✓ Jadwalka waa la kaydiyey.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {["Dhammaan", ...DAYS].map((day) => (
          <button key={day} onClick={() => setFilterDay(day)} className="rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: filterDay === day ? COLORS.teal : "#fff", color: filterDay === day ? "#fff" : COLORS.inkSoft, border: `1px solid ${COLORS.line}` }}>
            {day}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-10 text-sm" style={{ color: COLORS.inkSoft }}>Soo dejinaya jadwalka...</p>
      ) : ordered.length === 0 ? (
        <EmptyState icon={CalendarClock} text="Wali lama gelin casharro jadwalka." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ordered.map((it) => (
            <div key={it.id} className="rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: COLORS.gold }}>{it.day} · {it.start}–{it.end}</p>
                  <h3 className="text-base font-semibold mt-1" style={{ color: COLORS.ink }}>{it.subject}</h3>
                  <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>{it.className} · {it.teacher}</p>
                  {it.room && <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Qol: {it.room}</p>}
                  {it.note && <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{it.note}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => editItem(it)} className="p-2 rounded-lg" style={{ color: COLORS.tealLight }} title="Wax ka beddel"><Pencil size={16} /></button>
                  <button onClick={() => removeItem(it.id)} className="p-2 rounded-lg" style={{ color: COLORS.brick }} title="Tirtir"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


/* =========================================================
   Production Readiness & Security Screen
========================================================= */

/* =========================================================
   Excel / CSV Import & Export
   - Uses UTF-8 CSV so Excel opens the files directly.
   - Student import supports preview + duplicate update.
   - All storage calls remain tenant/branch scoped through load/save helpers.
========================================================= */
function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadCsv(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return true;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ""));
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeImportedStudent(row) {
  const get = (...names) => {
    const wanted = names.map(normalizeHeader);
    const key = Object.keys(row).find((k) => wanted.includes(normalizeHeader(k)));
    return key ? String(row[key] ?? "").trim() : "";
  };
  return {
    id: get("id") || undefined,
    name: get("name", "magaca", "magaca oo buuxa"),
    className: get("className", "class", "fasalka"),
    age: get("age", "daada") || undefined,
    parentName: get("parentName", "parent", "magaca waalidka"),
    parentPhone: get("parentPhone", "phone", "parent phone", "lambarka waalidka"),
    status: get("status", "xaalada") || "Firfircoon",
  };
}


/* =========================================================
   V30 — Jadwalka Maalinlaha & Hawlaha Maamulka
========================================================= */
function DailyScheduleScreen() {
  const todayISO = () => new Date().toISOString().slice(0, 10);
  const dayMap = { 0: "Axad", 1: "Isniin", 2: "Talaado", 3: "Arbaco", 4: "Khamiis", 5: "Jimco", 6: "Sabti" };
  const DAYS = ["Sabti", "Axad", "Isniin", "Talaado", "Arbaco", "Khamiis"];
  const [items, setItems] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskTime, setTaskTime] = useState("08:00");
  const [taskDate, setTaskDate] = useState(todayISO());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([loadArr("timetable-data"), loadArr("daily-tasks-data")]).then(([schedule, savedTasks]) => {
      if (!alive) return;
      setItems(Array.isArray(schedule) ? schedule : []);
      setTasks(Array.isArray(savedTasks) ? savedTasks : []);
      setLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const persistTasks = async (next) => {
    const ok = await persistList("daily-tasks-data", next, setTasks);
    if (!ok) return false;
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
    return true;
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    const next = [{
      id: crypto.randomUUID(),
      title: taskText.trim(),
      date: taskDate,
      time: taskTime,
      done: false,
      createdAt: new Date().toISOString(),
    }, ...tasks];
    if (await persistTasks(next)) setTaskText("");
  };

  const toggleTask = async (id) => {
    await persistTasks(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = async (id) => {
    if (!(await askConfirm("Ma hubtaa inaad tirtirto hawshan?", { confirmLabel: "Tirtir", danger: true }))) return;
    await persistTasks(tasks.filter((t) => t.id !== id));
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      notify("Browser-kan ma taageero ogeysiisyada.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      notify(result === "granted" ? "Ogeysiisyada browser-ka waa la oggolaaday." : "Ogeysiisyada lama oggola.");
    } catch {
      notify("Ogeysiisyada lama diyaarin.", "error");
    }
  };

  const today = todayISO();
  const todayName = dayMap[new Date().getDay()];
  const todaySchedule = [...items]
    .filter((it) => it.day === todayName)
    .sort((a, b) => String(a.start || "").localeCompare(String(b.start || "")));
  const todayTasks = tasks.filter((t) => t.date === today).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  const upcomingTasks = tasks.filter((t) => t.date > today && !t.done).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>V30</p>
          <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Jadwalka Maalinlaha</h2>
          <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>Hal meel ka eeg casharrada maanta iyo hawlaha maamulka.</p>
        </div>
        <button onClick={enableNotifications} className="rounded-lg px-4 py-2.5 text-sm font-semibold border" style={{ borderColor: COLORS.line, backgroundColor: "#fff", color: COLORS.teal }}>
          🔔 Oggolow Ogeysiisyada
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="font-semibold" style={{ color: COLORS.ink }}>Casharrada Maanta</h3><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{todayName} · {today}</p></div>
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: COLORS.sandDeep, color: COLORS.teal }}>{todaySchedule.length} cashar</span>
          </div>
          {!loaded ? <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p> : todaySchedule.length === 0 ? <EmptyState icon={CalendarClock} text="Maanta cashar jadwalka kuma jiro." /> : (
            <div className="space-y-2">
              {todaySchedule.map((it) => (
                <div key={it.id} className="rounded-xl border p-3 flex items-center gap-3" style={{ borderColor: COLORS.line }}>
                  <div className="w-20 text-center shrink-0"><p className="font-bold text-sm" style={{ color: COLORS.teal }}>{it.start}</p><p className="text-[11px]" style={{ color: COLORS.inkSoft }}>{it.end}</p></div>
                  <div className="h-9 w-px" style={{ backgroundColor: COLORS.line }} />
                  <div className="min-w-0"><p className="font-semibold truncate" style={{ color: COLORS.ink }}>{it.subject}</p><p className="text-xs mt-1 truncate" style={{ color: COLORS.inkSoft }}>{it.className} · {it.teacher}{it.room ? ` · ${it.room}` : ""}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <h3 className="font-semibold" style={{ color: COLORS.ink }}>Hawl Cusub</h3>
          <form onSubmit={addTask} className="space-y-3 mt-3">
            <input value={taskText} onChange={(e) => setTaskText(e.target.value)} placeholder="Tusaale: Hubi xaadirinta" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={taskDate} onChange={(e) => setTaskDate(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
              <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            </div>
            <button type="submit" className="w-full rounded-lg px-4 py-2.5 font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>+ Ku dar Hawl</button>
          </form>
          {saved && <p className="text-xs mt-2" style={{ color: COLORS.teal }}>✓ Waa la kaydiyey.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <div className="flex items-center justify-between mb-3"><h3 className="font-semibold" style={{ color: COLORS.ink }}>Hawlaha Maanta</h3><span className="text-xs" style={{ color: COLORS.inkSoft }}>{todayTasks.filter((t) => t.done).length}/{todayTasks.length} la dhammeeyey</span></div>
          {todayTasks.length === 0 ? <p className="text-sm py-6 text-center" style={{ color: COLORS.inkSoft }}>Hawl maanta lama gelin.</p> : <div className="space-y-2">{todayTasks.map((t) => <div key={t.id} className="flex items-center gap-2 rounded-xl border p-3" style={{ borderColor: COLORS.line }}><button onClick={() => toggleTask(t.id)} className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0" style={{ borderColor: COLORS.teal, backgroundColor: t.done ? COLORS.teal : "#fff", color: t.done ? "#fff" : COLORS.teal }}>{t.done ? "✓" : ""}</button><div className="min-w-0 flex-1"><p className={`text-sm font-medium ${t.done ? "line-through opacity-60" : ""}`} style={{ color: COLORS.ink }}>{t.title}</p><p className="text-xs" style={{ color: COLORS.inkSoft }}>{t.time}</p></div><button onClick={() => removeTask(t.id)} className="p-1.5" style={{ color: COLORS.brick }}><Trash2 size={16} /></button></div>)}</div>}
        </div>
        <div className="rounded-2xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <h3 className="font-semibold mb-3" style={{ color: COLORS.ink }}>Hawlaha Soo Socda</h3>
          {upcomingTasks.length === 0 ? <p className="text-sm py-6 text-center" style={{ color: COLORS.inkSoft }}>Ma jiraan hawlo soo socda.</p> : <div className="space-y-2">{upcomingTasks.map((t) => <div key={t.id} className="rounded-xl border p-3" style={{ borderColor: COLORS.line }}><p className="text-sm font-medium" style={{ color: COLORS.ink }}>{t.title}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{t.date} · {t.time}</p></div>)}</div>}
        </div>
      </div>
    </div>
  );
}

function ExcelScreen() {
  const [section, setSection] = useState("students");
  const [importRows, setImportRows] = useState([]);
  const [importName, setImportName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const exportDataset = async (key, filename, mapper = (x) => x) => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const res = await loadArrSafe(key);
      if (!res.ok) {
        setError("Xogta lama akhrin karin (isku xirka), sidaas darteed export lama samayn. Mar kale isku day.");
        return;
      }
      const rows = Array.isArray(res.data) ? res.data.map(mapper) : [];
      if (!rows.length) {
        setError("Xogta la doortay weli ma jirto.");
        return;
      }
      downloadCsv(`${filename}-${todayISO()}.csv`, rows);
      setMessage(`Export waa diyaar: ${rows.length} diiwaan.`);
    } catch (e) {
      console.error(e);
      setError("Export-ka lama samayn.");
    } finally {
      setBusy(false);
    }
  };

  const exportAttendance = async () => {
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const { rows: attRows, failed: attFailed } = await loadAttendanceRows("attendance-");
      if (attFailed) {
        setError(`Export-ka waa la joojiyey: ${attFailed} diiwaan xaadirin lama akhrin karin, faylku wuu ka dhiman lahaa.`);
        return;
      }
      const all = [];
      for (const rec of attRows) {
        if (!rec?.records) continue;
        rec.records.forEach((r) => all.push({
          date: rec.date || "",
          className: rec.className || "",
          studentId: r.id || "",
          studentName: r.name || "",
          status: r.status || "",
        }));
      }
      if (!all.length) {
        setError("Xaadirin la export-gareeyo ma jirto.");
        return;
      }
      downloadCsv(`attendance-${todayISO()}.csv`, all);
      setMessage(`Xaadirin export ah: ${all.length} diiwaan.`);
    } catch (e) {
      console.error(e);
      setError("Attendance export-ka lama samayn.");
    } finally {
      setBusy(false);
    }
  };

  const downloadTemplate = () => {
    downloadCsv("students-import-template.csv", [{
      id: "", name: "Axmed Cali", className: "Fasal 1", age: "10",
      parentName: "Cali Axmed", parentPhone: "0612345678", status: "Firfircoon",
    }]);
    setMessage("Template-ka ardayda waa la soo dejiyey.");
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setError("");
    setMessage("");
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError("Fadlan dooro CSV file. Excel wuxuu si toos ah u furi karaa CSV-ga NIBRAAS.");
      return;
    }
    try {
      const text = await file.text();
      const raw = parseCsv(text);
      if (raw.length < 2) throw new Error("CSV-ga xog kuma filna.");
      const headers = raw[0];
      const rows = raw.slice(1).map((values) => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
        return normalizeImportedStudent(obj);
      }).filter((r) => r.name);
      if (!rows.length) throw new Error("Magaca ardayga lama helin.");
      setImportRows(rows);
      setImportName(file.name);
      setMessage(`${rows.length} arday ayaa diyaar u ah preview.`);
    } catch (e) {
      console.error(e);
      setImportRows([]);
      setImportName("");
      setError(e.message || "CSV-ga lama akhrin.");
    }
  };

  const applyStudentImport = async () => {
    if (!importRows.length) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      // Fail closed: if the current student list cannot be read, nothing is written.
      const current = await loadArrSafe("students-data");
      if (!current.ok || !Array.isArray(current.data)) {
        setError("Liiska ardayda hadda jira lama akhrin karin, sidaas darteed import-ka waa la joojiyey. Xogtii hore waa ammaan. Hubi internet-ka kadibna mar kale isku day.");
        return;
      }
      const list = current.data;
      let added = 0;
      let updated = 0;
      const next = [...list];

      importRows.forEach((incoming) => {
        const byId = incoming.id ? next.findIndex((s) => String(s.id) === String(incoming.id)) : -1;
        const byContact = incoming.parentPhone
          ? next.findIndex((s) => sameText(s.name, incoming.name) && String(s.parentPhone || "").trim() === incoming.parentPhone.trim())
          : next.findIndex((s) => sameText(s.name, incoming.name));
        const index = byId >= 0 ? byId : byContact;
        const clean = { ...incoming };
        if (!clean.id) delete clean.id;
        if (clean.age !== undefined && clean.age !== "") clean.age = Number(clean.age) || clean.age;

        if (index >= 0) {
          next[index] = { ...next[index], ...clean, id: next[index].id };
          updated += 1;
        } else {
          next.unshift({ ...clean, id: Date.now() + added, createdAt: new Date().toISOString() });
          added += 1;
        }
      });

      const importSaved = await saveArr("students-data", next, { silent: true });
      if (!importSaved) {
        setError("Import-ka lama kaydin; xogtii hore waa ammaan oo waxba lama beddelin. Dib u fur bogga kadibna mar kale isku day.");
        return;
      }
      setImportRows([]);
      setImportName("");
      setMessage(`Import waa guuleystay: ${added} cusub, ${updated} la cusboonaysiiyey.`);
    } catch (e) {
      console.error(e);
      setError("Import-ka lama kaydin.");
    } finally {
      setBusy(false);
    }
  };

  const exportButtons = [
    { label: "Ardayda", key: "students-data", file: "students" },
    { label: "Shaqaalaha", key: "employees-data", file: "employees" },
    { label: "Fasallada", key: "classes-data", file: "classes" },
    { label: "Maaliyadda", key: "finance-data", file: "finance" },
    { label: "Imtixaannada", key: "exams-data", file: "exams" },
    { label: "Natiijooyinka Imtixaanka", key: "exam-results-data", file: "exam-results" },
    { label: "Horumarka", key: "progress-data", file: "progress" },
    { label: "Qur'aan / Xifdhi", key: "quran-progress-data", file: "quran-progress" },
    { label: "Waalidiinta", key: "parents-data", file: "parents" },
    { label: "Mushaharka", key: "payroll-data", file: "payroll" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>NIBRAAS V24</p>
        <h1 className="text-2xl font-semibold mt-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Excel / Import & Export</h1>
        <p className="text-sm mt-2" style={{ color: COLORS.inkSoft }}>Xogta Excel-ka waxaad u adeegsan kartaa CSV oo Excel si toos ah u furo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setSection("students")} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: section === "students" ? COLORS.teal : "#fff", color: section === "students" ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Ardayda Import</button>
        <button onClick={() => setSection("export")} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: section === "export" ? COLORS.teal : "#fff", color: section === "export" ? "#fff" : COLORS.ink, border: `1px solid ${COLORS.line}` }}>Export Xogta</button>
      </div>

      {section === "students" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border p-5 bg-white" style={{ borderColor: COLORS.line }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.goldSoft, color: COLORS.teal }}><Upload size={20} /></div>
              <div><h2 className="font-semibold" style={{ color: COLORS.ink }}>Import Ardayda</h2><p className="text-xs" style={{ color: COLORS.inkSoft }}>CSV → NIBRAAS</p></div>
            </div>
            <p className="text-sm leading-6" style={{ color: COLORS.inkSoft }}>Dooro CSV. NIBRAAS wuxuu kuu soo bandhigayaa preview ka hor inta aan xogta la kaydin.</p>
            <label className="mt-4 flex items-center justify-center gap-2 rounded-lg py-3 cursor-pointer font-semibold text-sm" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
              <Upload size={17} /> Dooro CSV
              <input type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
            </label>
            <button onClick={downloadTemplate} className="w-full mt-2 rounded-lg py-2.5 text-sm font-semibold border" style={{ borderColor: COLORS.line, color: COLORS.teal }}>Soo dejiso Template</button>
          </div>

          <div className="rounded-2xl border p-5 bg-white" style={{ borderColor: COLORS.line }}>
            <h2 className="font-semibold" style={{ color: COLORS.ink }}>Qaabka CSV-ga</h2>
            <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>Columns: name, className, age, parentName, parentPhone, status. ID waa optional.</p>
            <div className="mt-4 rounded-lg p-3 text-xs overflow-x-auto" style={{ backgroundColor: COLORS.sand, color: COLORS.ink }}>
              name, className, age, parentName, parentPhone, status
            </div>
            <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>Haddii ID ama magaca + lambarka waalidka la helo, diiwaanka jira waa la cusboonaysiinayaa halkii duplicate cusub laga abuuri lahaa.</p>
          </div>
        </div>
      )}

      {section === "students" && importRows.length > 0 && (
        <div className="rounded-2xl border bg-white overflow-hidden" style={{ borderColor: COLORS.line }}>
          <div className="p-5 border-b flex items-center justify-between gap-3" style={{ borderColor: COLORS.line }}>
            <div><h2 className="font-semibold" style={{ color: COLORS.ink }}>Preview: {importName}</h2><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{importRows.length} arday</p></div>
            <button disabled={busy} onClick={applyStudentImport} className="rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff", opacity: busy ? .6 : 1 }}>Kaydi Import-ka</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]"><thead style={{ backgroundColor: COLORS.sand }}><tr>{["Magac","Fasal","Da'","Waalid","Telefoon","Xaalad"].map((h) => <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{h}</th>)}</tr></thead><tbody>{importRows.slice(0, 50).map((r, i) => <tr key={i} className="border-t" style={{ borderColor: COLORS.line }}><td className="px-4 py-3">{r.name}</td><td className="px-4 py-3">{r.className}</td><td className="px-4 py-3">{r.age}</td><td className="px-4 py-3">{r.parentName}</td><td className="px-4 py-3">{r.parentPhone}</td><td className="px-4 py-3">{r.status}</td></tr>)}</tbody></table>
          </div>
          {importRows.length > 50 && <p className="p-3 text-xs" style={{ color: COLORS.inkSoft }}>Waxaa la tusayaa 50-ka hore; dhammaan {importRows.length} waa la kaydin karaa.</p>}
        </div>
      )}

      {section === "export" && (
        <div className="rounded-2xl border p-5 bg-white" style={{ borderColor: COLORS.line }}>
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.goldSoft, color: COLORS.teal }}><Download size={20} /></div><div><h2 className="font-semibold" style={{ color: COLORS.ink }}>Export Xogta</h2><p className="text-xs" style={{ color: COLORS.inkSoft }}>CSV files oo Excel lagu furi karo</p></div></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {exportButtons.map((b) => <button key={b.key} disabled={busy} onClick={() => exportDataset(b.key, b.file)} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold text-left" style={{ borderColor: COLORS.line, color: COLORS.ink, opacity: busy ? .6 : 1 }}><span>{b.label}</span><Download size={16} style={{ color: COLORS.teal }} /></button>)}
            <button disabled={busy} onClick={exportAttendance} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold text-left" style={{ borderColor: COLORS.line, color: COLORS.ink, opacity: busy ? .6 : 1 }}><span>Xaadirinta</span><Download size={16} style={{ color: COLORS.teal }} /></button>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#FDECEC", color: COLORS.brick }}>{error}</div>}
      {message && <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "#EAF5EF", color: COLORS.teal }}>{message}</div>}
    </div>
  );
}

function AchievementsScreen() {
  const [tab, setTab] = useState("leaderboard");
  const [students, setStudents] = useState([]);
  const [progress, setProgress] = useState([]);
  const [quran, setQuran] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ studentName: "", title: "", type: "Shahaado", date: todayISO(), note: "" });

  useEffect(() => {
    Promise.all([loadArr("students-data"), loadArr("academic-progress-data"), loadArr("quran-progress-data"), loadArr("achievements-data")]).then(([studentList, progressList, quranList, achievementList]) => {
      setStudents(Array.isArray(studentList) ? studentList : []);
      setProgress(Array.isArray(progressList) ? progressList : []);
      setQuran(Array.isArray(quranList) ? quranList : []);
      setAchievements(Array.isArray(achievementList) ? achievementList : []);
      setLoading(false);
    });
  }, []);

  const persistAchievements = (next) => persistList("achievements-data", next, setAchievements);

  const addAchievement = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.title.trim()) return;
    setSaving(true);
    const item = { id: Date.now(), studentName: form.studentName.trim(), title: form.title.trim(), type: form.type, date: form.date, note: form.note.trim(), createdAt: new Date().toISOString() };
    const savedAch = await persistAchievements([item, ...achievements]);
    setSaving(false);
    if (!savedAch) return;
    setForm({ studentName: "", title: "", type: "Shahaado", date: todayISO(), note: "" });
    setTab("achievements");
  };

  const removeAchievement = async (id) => { await persistAchievements(achievements.filter((a) => a.id !== id)); };

  const leaderboard = students.map((student) => {
    const rows = progress.filter((r) => sameText(r.studentName, student.name) && typeof r.score === "number" && !Number.isNaN(r.score));
    const average = rows.length ? Math.round(rows.reduce((sum, r) => sum + Number(r.score), 0) / rows.length) : 0;
    const quranCount = quran.filter((r) => sameText(r.studentName, student.name)).length;
    const awards = achievements.filter((a) => sameText(a.studentName, student.name)).length;
    return { ...student, average, progressCount: rows.length, quranCount, awards };
  }).filter((s) => s.progressCount > 0 || s.quranCount > 0 || s.awards > 0).sort((a, b) => b.average - a.average || b.quranCount - a.quranCount || b.awards - a.awards);

  const podium = leaderboard.slice(0, 3);

  if (loading) return <p className="text-sm py-10 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-sm font-semibold mb-1" style={{ color: COLORS.gold }}>GUULAHA ARDAYDA</p><h2 className="text-2xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Guulaha & Tartanka</h2><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>La soco ardayda hormuudka ah oo diiwaangeli shahaadooyinka iyo guulaha.</p></div>
        <button onClick={() => setTab(tab === "form" ? "leaderboard" : "form")} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16} /> {tab === "form" ? "Tartanka" : "Ku dar Guul"}</button>
      </div>
      <SignatureChain />
      <div className="flex flex-wrap gap-2">{[["leaderboard", "Leaderboard"], ["achievements", "Guulaha"], ["form", "Diiwaangeli"]].map(([id, label]) => <button key={id} onClick={() => setTab(id)} className="rounded-full px-4 py-2 text-xs font-semibold border" style={{ borderColor: COLORS.line, backgroundColor: tab === id ? COLORS.teal : "#fff", color: tab === id ? "#fff" : COLORS.ink }}>{label}</button>)}</div>

      {tab === "leaderboard" && <>
        <div className="grid md:grid-cols-3 gap-3">{podium.map((s, index) => <div key={s.id} className="rounded-2xl border p-5 text-center" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: index === 0 ? COLORS.goldSoft : COLORS.sandDeep, color: COLORS.teal }}><Trophy size={22} /></div><p className="text-xs font-bold mb-1" style={{ color: COLORS.gold }}>#{index + 1}</p><p className="font-semibold" style={{ color: COLORS.ink }}>{s.name}</p><p className="text-2xl font-bold mt-2" style={{ color: COLORS.teal }}>{s.average}%</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{s.progressCount} natiijo · {s.quranCount} Qur'aan</p></div>)}{podium.length === 0 && <div className="md:col-span-3"><EmptyState icon={Trophy} text="Wali xog ku filan oo leaderboard ah ma jirto." /></div>}</div>
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><div className="px-5 py-4 border-b" style={{ borderColor: COLORS.line }}><p className="font-semibold" style={{ color: COLORS.ink }}>Kala Sarreynta Ardayda</p></div>{leaderboard.length === 0 ? <EmptyState icon={TrendingUp} text="Geli Horumarka ardayda si leaderboard-ku u shaqeeyo." /> : <div className="overflow-x-auto"><table className="w-full text-sm min-w-[700px]"><thead style={{ backgroundColor: COLORS.sand }}><tr>{["#", "Ardayga", "Celcelis %", "Natiijooyin", "Qur'aan", "Guulo"].map((h) => <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{h}</th>)}</tr></thead><tbody>{leaderboard.map((s, i) => <tr key={s.id} className="border-t" style={{ borderColor: COLORS.line }}><td className="px-4 py-3 font-bold" style={{ color: COLORS.gold }}>{i + 1}</td><td className="px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{s.name}</td><td className="px-4 py-3 font-bold" style={{ color: COLORS.teal }}>{s.average}%</td><td className="px-4 py-3">{s.progressCount}</td><td className="px-4 py-3">{s.quranCount}</td><td className="px-4 py-3">{s.awards}</td></tr>)}</tbody></table></div>}</div>
      </>}

      {tab === "achievements" && <div className="rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: COLORS.line }}><div><p className="font-semibold" style={{ color: COLORS.ink }}>Guulaha & Shahaadooyinka</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{achievements.length} diiwaan</p></div><Trophy size={20} style={{ color: COLORS.gold }} /></div>{achievements.length === 0 ? <EmptyState icon={Trophy} text="Wali guul lama diiwaangelin." /> : <div>{achievements.map((a) => <div key={a.id} className="flex items-center justify-between gap-3 px-5 py-4 border-b last:border-b-0" style={{ borderColor: COLORS.line }}><div><p className="font-semibold text-sm" style={{ color: COLORS.ink }}>{a.studentName}</p><p className="text-sm mt-1" style={{ color: COLORS.teal }}>{a.title}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{[a.type, fmtDate(a.date), a.note].filter(Boolean).join(" · ")}</p></div><button onClick={() => removeAchievement(a.id)} className="p-2 rounded-lg" style={{ color: COLORS.brick, backgroundColor: "#FDECEC" }}><Trash2 size={15} /></button></div>)}</div>}</div>}

      {tab === "form" && <form onSubmit={addAchievement} className="max-w-2xl mx-auto rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><h3 className="font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Diiwaangeli Guul</h3><p className="text-xs mb-5" style={{ color: COLORS.inkSoft }}>Tusaale: Shahaado, Tartanka Qur'aanka, Akhlaaq, Imaansho wanaagsan.</p><div className="space-y-4"><StudentSearchSelect students={students} value={form.studentName} onChange={(v) => setForm((p) => ({ ...p, studentName: v }))} placeholder="Raadi magaca ardayga..." style={{ borderColor: COLORS.line }} /><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Magaca guusha / shahaadada *" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /><div className="grid md:grid-cols-2 gap-3"><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}><option>Shahaado</option><option>Tartan</option><option>Qur'aan</option><option>Akhlaaq</option><option>Imaansho</option><option>Kale</option></select><input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /></div><textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Faallo (ikhtiyaari)" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, minHeight: 90 }} /><button disabled={saving || !students.length} className="w-full rounded-lg py-3 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>{saving ? "Kaydinaya..." : "Kaydi Guusha"}</button>{!students.length && <p className="text-xs text-center" style={{ color: COLORS.inkSoft }}>Marka hore Ardayda ku dar arday.</p>}</div></form>}
    </div>
  );
}

function ProductionReadinessScreen({ session, currentRole, tenantReady, tenantError, config }) {
  const [configCheck, setConfigCheck] = useState("pending");
  const [checkedAt, setCheckedAt] = useState(null);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const loadAuditLog = async () => {
    if (!CURRENT_TENANT_ID || !["Admin", "Maamule"].includes(currentRole)) return;
    setAuditLoading(true);
    setAuditError("");
    try {
      const { data, error } = await supabase
        .from("nibraas_audit_log")
        .select("id, tenant_id, branch_id, user_id, action, table_name, record_key, created_at")
        .eq("tenant_id", CURRENT_TENANT_ID)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setAuditRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Audit log load error:", e);
      setAuditError(e?.message || "Audit Log lama akhrin karin.");
    } finally {
      setAuditLoading(false);
    }
  };

  const runChecks = async () => {
    setConfigCheck("checking");
    try {
      const result = await loadObj("config-data", null);
      setConfigCheck(result ? "ok" : "empty");
    } catch {
      setConfigCheck("error");
    }
    setCheckedAt(new Date());
  };

  useEffect(() => {
    runChecks();
    loadAuditLog();
  }, [currentRole, tenantReady]);

  const checks = [
    {
      label: "Supabase Auth session",
      status: session?.user?.id ? "ok" : "error",
      detail: session?.user?.email || "Login lama helin",
    },
    {
      label: "Tenant bootstrap",
      status: tenantReady ? "ok" : tenantError ? "error" : "checking",
      detail: tenantError || (tenantReady ? "Tenant-ka waa diyaar" : "Sugaya..."),
    },
    {
      label: "Role & permissions",
      status: currentRole ? "ok" : "error",
      detail: currentRole || "Role lama helin",
    },
    {
      label: "Branch context",
      status: CURRENT_BRANCH_ID ? "ok" : "error",
      detail: CURRENT_BRANCH_ID || "Branch lama helin",
    },
    {
      label: "Scoped storage configuration",
      status: configCheck === "ok" ? "ok" : configCheck === "checking" ? "checking" : "warning",
      detail:
        configCheck === "ok"
          ? "Xogta config-ka waa la akhriyey tenant scope-ka hadda jira"
          : configCheck === "empty"
          ? "Config weli lama dejin"
          : configCheck === "error"
          ? "Akhriska config-ka wuu fashilmay"
          : "Hubinaya...",
    },
  ];

  const statusMeta = {
    ok: { icon: "✓", color: COLORS.teal, bg: "#E7F3EF", text: "OK" },
    warning: { icon: "!", color: COLORS.gold, bg: COLORS.goldSoft, text: "Hubi" },
    error: { icon: "×", color: COLORS.brick, bg: "#F8E7E3", text: "Dhibaato" },
    checking: { icon: "…", color: COLORS.inkSoft, bg: COLORS.sandDeep, text: "Hubinaya" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-2xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          Production Readiness
        </h2>
        <p className="text-sm mt-1" style={{ color: COLORS.inkSoft }}>
          Hubin gudaha app-ka ah oo kaa caawinaya in NIBRAAS loo diyaariyo isticmaal dhab ah.
        </p>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>System Health</p>
            <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>
              Hubintani ma beddelayso RLS policies; waxay soo bandhigaysaa xaaladda app-ka ee hadda.
            </p>
          </div>
          <button
            type="button"
            onClick={runChecks}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: COLORS.teal, color: "#fff" }}
          >
            <RotateCcw size={16} /> Mar kale hubi
          </button>
        </div>

        <div className="space-y-2">
          {checks.map((check) => {
            const meta = statusMeta[check.status];
            return (
              <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl border p-3" style={{ borderColor: COLORS.line }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>{check.label}</p>
                  <p className="text-xs mt-0.5 break-words" style={{ color: COLORS.inkSoft }}>{check.detail}</p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: meta.color, backgroundColor: meta.bg }}>
                  {meta.icon} {meta.text}
                </span>
              </div>
            );
          })}
        </div>

        {checkedAt && (
          <p className="text-[11px] mt-4" style={{ color: COLORS.inkSoft }}>
            Hubintii ugu dambaysay: {checkedAt.toLocaleString("so-SO")}
          </p>
        )}
      </div>

      {["Admin", "Maamule"].includes(currentRole) && (
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: COLORS.line }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>Audit Log</p>
              <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Diiwaanka isbeddellada app_storage ee tenant-kan.</p>
            </div>
            <button
              type="button"
              onClick={loadAuditLog}
              disabled={auditLoading}
              className="rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-2"
              style={{ backgroundColor: COLORS.sandDeep, color: COLORS.teal }}
            >
              <RotateCcw size={14} /> {auditLoading ? "Soo dejinaya..." : "Cusboonaysii"}
            </button>
          </div>
          {auditError ? (
            <div className="p-5 text-sm" style={{ color: COLORS.brick }}>{auditError}</div>
          ) : auditLoading && auditRows.length === 0 ? (
            <div className="p-5 text-sm" style={{ color: COLORS.inkSoft }}>Audit Log soo dejinaya...</div>
          ) : auditRows.length === 0 ? (
            <div className="p-5 text-sm" style={{ color: COLORS.inkSoft }}>Wali wax audit event ah lama diiwaangelin.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead style={{ backgroundColor: COLORS.sand }}>
                  <tr>
                    {["Action", "Branch", "Table", "Record", "User", "Waqti"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold" style={{ color: COLORS.ink }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((row) => (
                    <tr key={row.id} className="border-t" style={{ borderColor: COLORS.line }}>
                      <td className="px-4 py-3 font-semibold" style={{ color: row.action === "DELETE" ? COLORS.brick : row.action === "INSERT" ? COLORS.teal : COLORS.gold }}>{row.action}</td>
                      <td className="px-4 py-3">{row.branch_id || "main"}</td>
                      <td className="px-4 py-3">{row.table_name || ""}</td>
                      <td className="px-4 py-3 max-w-[260px] truncate" title={row.record_key || ""}>{row.record_key || ""}</td>
                      <td className="px-4 py-3 max-w-[220px] truncate" title={row.user_id || ""}>{row.user_id || ""}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleString("so-SO") : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>Waxyaabaha la hubiyey</p>
          <ul className="space-y-2 text-sm" style={{ color: COLORS.inkSoft }}>
            <li>✓ Login / Auth session</li>
            <li>✓ Tenant bootstrap</li>
            <li>✓ Membership role</li>
            <li>✓ Branch context</li>
            <li>✓ Tenant-scoped app storage read</li>
          </ul>
        </div>
        <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: COLORS.ink }}>Production checklist</p>
          <ul className="space-y-2 text-sm" style={{ color: COLORS.inkSoft }}>
            <li>• Supabase RLS policies final review</li>
            <li>• Backup & restore test</li>
            <li>• Production environment variables</li>
            <li>• Domain + HTTPS deployment</li>
            <li>• Real madrasah pilot test</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: COLORS.goldSoft }}>
        <p className="text-sm font-semibold" style={{ color: COLORS.ink }}>Xusuusin</p>
        <p className="text-xs mt-1 leading-5" style={{ color: COLORS.inkSoft }}>
          Screen-kan waa health check. Ma sheeganayo in Supabase RLS, domain-ka ama deployment-ka production si toos ah loo xaqiijiyey; kuwaas waxay u baahan yihiin hubin dhinaca Supabase/deployment-ka ah.
        </p>
      </div>
    </div>
  );
}

function AppInner() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);
const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [tenantReady, setTenantReady] = useState(false);
  const [tenantError, setTenantError] = useState("");
  useIdleLogout(Boolean(session?.user?.id));

useEffect(() => {
  let mounted = true;

  supabase.auth.getSession().then(({ data }) => {
    if (mounted) {
      setSession(data.session);
      setAuthLoading(false);
    }
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      setIsRecovery(true);
    }
    setSession(session);
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

const userId = session?.user?.id || null;
  const sessionRef = React.useRef(session);
  sessionRef.current = session;
  const [verifyNonce, setVerifyNonce] = useState(0);
  const [tenantErrorKind, setTenantErrorKind] = useState("");
  const [tenantNote, setTenantNote] = useState("");
  const [roleError, setRoleError] = useState("");
  const [roleNonce, setRoleNonce] = useState(0);

  // Tenant verification is keyed on the USER ID, not the session object. A token refresh or a
  // tab returning to the foreground produces a new session object for the same user; that must
  // not tear the app down and re-verify, otherwise open forms are rebuilt and unsaved input is lost.
  useEffect(() => {
    let alive = true;
    if (!userId) {
      setTenantReady(false);
      setRoleLoading(true);
      setCurrentRole(null);
      setTenantError("");
      setTenantErrorKind("");
      setTenantNote("");
      setRoleError("");
      setStorageTenant(null);
      setStorageBranch("main");
      resetStorageSync();
      resetStorageSync();
      return () => { alive = false; };
    }

    setTenantReady(false);
    setRoleLoading(true);
    setCurrentRole(null);
    setTenantError("");
    setTenantErrorKind("");
    (async () => {
      const MAX_AUTO_RETRIES = 5;
      let attempt = 0;
      while (alive) {
        const result = await verifyTenantOnce(sessionRef.current?.user || { id: userId });
        if (!alive) return;
        if (result.ok) {
          setStorageTenant(result.tenant);
          setTenantNote("");
          setTenantReady(true);
          return;
        }
        if ((result.kind === "transient" || result.kind === "auth") && attempt < MAX_AUTO_RETRIES) {
          attempt += 1;
          if (result.kind === "auth") {
            try { await supabase.auth.getSession(); } catch (e) { console.warn("Session refresh failed:", e); }
          }
          setTenantNote(`Isku xirka waa daciif yahay. Dib ayaa loo isku dayayaa (${attempt}/${MAX_AUTO_RETRIES})...`);
          await wait(Math.min(1000 * 2 ** attempt, 15000));
          continue;
        }
        setTenantNote("");
        setTenantErrorKind(result.kind === "auth" ? "transient" : result.kind);
        setTenantError(result.message);
        return;
      }
    })();

    return () => { alive = false; };
  }, [userId, verifyNonce]);

  // When the phone comes back online or the app returns to the foreground after a failed check,
  // try again automatically. A real "denied"/"setup" answer is never retried automatically.
  useEffect(() => {
    if (!userId || tenantErrorKind !== "transient") return undefined;
    const retry = () => {
      if (document.visibilityState === "hidden") return;
      setVerifyNonce((n) => n + 1);
    };
    window.addEventListener("online", retry);
    document.addEventListener("visibilitychange", retry);
    return () => {
      window.removeEventListener("online", retry);
      document.removeEventListener("visibilitychange", retry);
    };
  }, [userId, tenantErrorKind]);

  useEffect(() => {
    if (!userId || !tenantReady) return undefined;
    let alive = true;
    setRoleError("");
    (async () => {
      for (let attempt = 0; alive && attempt < 4; attempt++) {
        // Role is read straight from memberships; authorization never comes from user-profiles.
        const { data, error } = await supabase
          .from("nibraas_memberships")
          .select("tenant_id, role")
          .eq("user_id", userId)
          .eq("tenant_id", CURRENT_TENANT_ID)
          .maybeSingle();
        if (!alive) return;
        if (error) {
          console.error("Role load error:", error);
          if (classifyTenantError(error) === "denied") {
            setRoleError("Doorkaaga lama akhrin karin.");
            setRoleLoading(false);
            return;
          }
          await wait(Math.min(1000 * 2 ** (attempt + 1), 8000));
          continue;
        }
        const role = data?.role;
        if (!USER_ROLES.includes(role)) {
          console.error("Invalid or missing NIBRAAS role:", role);
          setRoleError("Akoonkan door ma laha madrasaddan. La xiriir Admin-ka madrasadda.");
          setCurrentRole(null);
          setRoleLoading(false);
          return;
        }
        setCurrentRole(role);
        setRoleLoading(false);
        return;
      }
      if (alive) {
        setRoleError("Doorkaaga lama akhrin karin (isku xirka). Mar kale isku day.");
        setRoleLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, tenantReady, roleNonce]);
// NOTE (v43): App-level students/finance state and the auto-save effects were removed.
// Each screen (Ardayda, Maaliyadda...) loads and saves its own data. The old App-level copy was
// never updated by those screens, but it was written back to the database whenever the auth session
// object changed (token refresh / tab focus), overwriting newer finance records with a stale copy.
  useBrandFonts();
  useEffect(() => {
    if (document.getElementById("nibraas-pwa-meta")) return;
    const meta = document.createElement("meta");
    meta.id = "nibraas-pwa-meta";
    meta.name = "theme-color";
    meta.content = COLORS.teal;
    document.head.appendChild(meta);

    const mobile = document.createElement("meta");
    mobile.name = "viewport";
    mobile.content = "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover";
    document.head.appendChild(mobile);

    const apple = document.createElement("meta");
    apple.name = "apple-mobile-web-app-capable";
    apple.content = "yes";
    document.head.appendChild(apple);

    const appleStatus = document.createElement("meta");
    appleStatus.name = "apple-mobile-web-app-status-bar-style";
    appleStatus.content = "default";
    document.head.appendChild(appleStatus);

    const appleTitle = document.createElement("meta");
    appleTitle.name = "apple-mobile-web-app-title";
    appleTitle.content = "NIBRAAS";
    document.head.appendChild(appleTitle);

    document.body.style.margin = "0";
    document.body.style.minWidth = "320px";
    document.body.style.overflowX = "hidden";
  }, []);

  useEffect(() => {
    const styleId = "nibraas-mobile-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      html, body, #root { min-height: 100%; width: 100%; }
      * { box-sizing: border-box; }
      button, input, select, textarea { font-size: 16px; }
      input, select, textarea { max-width: 100%; }
      button, [role="button"], input, select { touch-action: manipulation; }
      :focus-visible { outline: 3px solid ${COLORS.gold}; outline-offset: 2px; }
      @media (max-width: 768px) {
        body { overflow-x: hidden; }
        main, aside, section { min-width: 0; }
        .nibraas-mobile-scroll { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { min-width: 600px; }
        .nibraas-mobile-card { width: 100% !important; max-width: 100% !important; }
        button { min-height: 40px; }
        input, select, textarea { min-width: 0; }
        .grid { grid-template-columns: minmax(0, 1fr) !important; }
      }
      @media (max-width: 420px) {
        table { min-width: 560px; }
        h1 { overflow-wrap: anywhere; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const [active, setActive] = useState("home");
  const [language, setLanguage] = useState(() => localStorage.getItem("nibraas-language") || "so");
  const DEFAULT_BRANCHES = [{ id: "main", name: "Laanta 1" }];
  // Branch list and active branch are NOT read from global localStorage keys any more: they come
  // from this tenant's own `branches-data` row, and the remembered selection is scoped per tenant.
  const [branches, setBranches] = useState(DEFAULT_BRANCHES);
  const [activeBranchId, setActiveBranchId] = useState("main");
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [branchesError, setBranchesError] = useState("");
  const [branchNonce, setBranchNonce] = useState(0);
  const savedBranchesRef = React.useRef("");
  const [mobileTip, setMobileTip] = useState(() => { try { return localStorage.getItem("nibraas-mobile-tip") !== "hidden"; } catch { return true; } });
  const dismissMobileTip = () => {
    try { localStorage.setItem("nibraas-mobile-tip", "hidden"); } catch (e) { console.warn("localStorage write failed:", e); }
    setMobileTip(false);
  };

  const [newBranchName, setNewBranchName] = useState("");

  const switchBranch = (nextId) => {
    if (!nextId) return;
    setStorageBranch(nextId);
    setActiveBranchId(nextId);
    writeTenantLocal("nibraas-active-branch", nextId);
  };

  useEffect(() => {
    if (!tenantReady) {
      setBranchesLoaded(false);
      setBranchesError("");
      setBranches(DEFAULT_BRANCHES);
      setActiveBranchId("main");
      savedBranchesRef.current = "";
      return undefined;
    }
    let alive = true;
    setBranchesLoaded(false);
    setBranchesError("");
    (async () => {
      let res = null;
      for (let attempt = 0; alive && attempt < 4; attempt++) {
        res = await loadArrSafe("branches-data");
        if (!alive) return;
        if (res.ok) break;
        await wait(Math.min(1000 * 2 ** (attempt + 1), 8000));
      }
      if (!alive) return;
      if (!res || !res.ok) {
        // Fail closed: without the real branch list the app must not guess a branch.
        setBranchesError("Liiska laamaha lama akhrin karin. Hubi internet-ka kadibna mar kale isku day.");
        return;
      }
      const list = Array.isArray(res.data) && res.data.length ? res.data : DEFAULT_BRANCHES;
      let legacy = null;
      try { legacy = localStorage.getItem("nibraas-active-branch"); } catch (e) { console.warn("localStorage read failed:", e); }
      const remembered = readTenantLocal("nibraas-active-branch");
      // A remembered/legacy id is only trusted if it exists in THIS tenant's branch list.
      const next = [remembered, legacy].find((id) => id && list.some((b) => b.id === id)) || list[0].id;
      savedBranchesRef.current = JSON.stringify(list);
      setStorageBranch(next);
      setBranches(list);
      setActiveBranchId(next);
      writeTenantLocal("nibraas-active-branch", next);
      setBranchesLoaded(true);
    })();
    return () => { alive = false; };
  }, [tenantReady, branchNonce]);

  // Persist only real changes, merging with what is stored so another device's new branch is kept.
  useEffect(() => {
    if (!tenantReady || !branchesLoaded || !branches.length) return;
    if (JSON.stringify(branches) === savedBranchesRef.current) return;
    let alive = true;
    (async () => {
      const fresh = await loadArrSafe("branches-data");
      if (!alive) return;
      if (!fresh.ok) { notify("Laanta cusub lama kaydin karin (isku xirka). Mar kale isku day.", "error"); return; }
      const stored = Array.isArray(fresh.data) ? fresh.data : [];
      const merged = [...stored, ...branches.filter((b) => !stored.some((x) => x.id === b.id))];
      const ok = await saveArr("branches-data", merged);
      if (!alive) return;
      if (!ok) { notify("Laanta cusub lama kaydin.", "error"); return; }
      savedBranchesRef.current = JSON.stringify(branches);
    })();
    return () => { alive = false; };
  }, [branches, tenantReady, branchesLoaded]);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0];
  const branchContext = activeBranch?.name || "";


  const T = {
    so: {
      home: "Hoyga", students: "Ardayda", employees: "Shaqaalaha", classes: "Fasallada",
      attendance: "Xaadirinta", daily: "Jadwalka Maalinlaha", activities: "Hawlaha", complaints: "Cabashooyinka",
      progress: "Horumarka", exams: "Imtixaannada", quran: "Qur'aan / Xifdhi",
      subjects: "Maadooyinka", finance: "Maaliyadda", invoices: "Biilasha & Khidmadaha", payroll: "Mushaharka",
      reports: "Warbixinno", sms: "SMS & Ogeysiisyo", parents: "Waalidiinta", communication: "Xiriirka Waalidiinta",
      idcards: "ID Cards & QR", users: "Users", excel: "Excel / Import & Export", achievements: "Guulaha & Tartanka", config: "Dejinta",
      language: "Luqadda", branches: "Laamaha", branch: "Laan", addBranch: "Ku dar Laan", branchName: "Magaca laanta", save: "Kaydi", logout: "Ka bax",
    },
    ar: {
      home: "الرئيسية", students: "الطلاب", employees: "الموظفون", classes: "الفصول",
      attendance: "الجدول اليومي", daily: "الجدول اليومي", activities: "الأنشطة", complaints: "الشكاوى",
      progress: "التقدم", exams: "الامتحانات", quran: "القرآن / الحفظ",
      subjects: "المواد", finance: "المالية", invoices: "الفواتير والرسوم", payroll: "الرواتب",
      reports: "التقارير", sms: "الرسائل والتنبيهات", parents: "أولياء الأمور", communication: "تواصل أولياء الأمور",
      idcards: "بطاقات الهوية و QR", users: "المستخدمون", excel: "Excel / استيراد وتصدير", achievements: "الإنجازات والترتيب", config: "الإعدادات",
      language: "اللغة", branches: "الفروع", branch: "الفرع", addBranch: "إضافة فرع", branchName: "اسم الفرع", save: "حفظ", logout: "تسجيل الخروج",
    },
    en: {
      home: "Home", students: "Students", employees: "Employees", classes: "Classes",
      attendance: "Attendance", daily: "Daily Schedule", activities: "Activities", complaints: "Complaints",
      progress: "Progress", exams: "Exams", quran: "Quran / Hifdh",
      subjects: "Subjects", finance: "Finance", invoices: "Invoices & Fees", payroll: "Payroll",
      reports: "Reports", sms: "SMS & Notifications", parents: "Parents", communication: "Parent Communication",
      idcards: "ID Cards & QR", users: "Users", excel: "Excel / Import & Export", achievements: "Achievements & Leaderboard", config: "Settings",
      language: "Language", branches: "Branches", branch: "Branch", addBranch: "Add Branch", branchName: "Branch name", save: "Save", logout: "Log out",
    },
  };

  const tr = T[language] || T.so;

  const navLabel = (id, fallback) => tr[id] || fallback;

  useEffect(() => {
    localStorage.setItem("nibraas-language", language);
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language]);
  const [moreOpen, setMoreOpen] = useState(false);
  // Keep NIBRAAS as the product brand, while using the registered school name
  // as the initial school label when available. The saved Supabase config-data
  // is still loaded below and remains the source of truth for existing schools.
  const [config, setConfig] = useState({
    schoolName: String(session?.user?.user_metadata?.nibraas_school_name || "").trim() || "NIBRAAS",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    currency: "$",
  });

  useEffect(() => {
    if (!session?.user?.id) return;

    // Prefer the registered school name when saved config still contains the
    // generic product label "NIBRAAS". Keep a real saved school name if one
    // has already been configured in Settings.
    const registeredSchoolName = String(
      session.user.user_metadata?.nibraas_school_name || ""
    ).trim();

    let alive = true;
    loadObj("config-data", null).then((c) => {
      if (!alive) return;
      const savedConfig = c && typeof c === "object" ? c : {};
      const savedSchoolName = String(savedConfig.schoolName || "").trim();
      const savedNameIsGeneric =
        !savedSchoolName || savedSchoolName.toLowerCase() === "nibraas";

      setConfig((previous) => ({
        ...previous,
        ...savedConfig,
        schoolName: savedNameIsGeneric
          ? (registeredSchoolName || savedSchoolName || previous.schoolName || "NIBRAAS")
          : savedSchoolName,
      }));
    }).catch((error) => {
      console.error("School config load error:", error);
    });

    return () => { alive = false; };
  }, [session]);

  const goTo = (id) => {
    setActive(id);
    setMoreOpen(false);
  };

  const renderScreen = () => {
    if (!canAccess(currentRole, active)) {
      return (
        <div className="max-w-xl mx-auto text-center py-16">
          <ShieldCheck size={42} className="mx-auto mb-4" style={{ color: COLORS.teal }} />
          <h1 className="text-2xl font-semibold mb-2" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
            Ogolaansho ma lihid
          </h1>
          <p className="text-sm" style={{ color: COLORS.inkSoft }}>
            Doorkaaga ({currentRole}) ma laha ogolaanshaha qaybtaan.
          </p>
        </div>
      );
    }
    if (active === "home") return <HomeScreen config={config} goTo={goTo} currentRole={currentRole} tr={tr} />;
    if (active === "attendance") return <AttendanceScreen />;
    if (active === "jadwal") return <ScheduleScreen />;
    if (active === "daily") return <DailyScheduleScreen />;
    if (active === "progress") return <ProgressScreen />;
    if (active === "quran") return <QuranScreen />;
    if (active === "exams") return <ExamsScreen />;
    if (active === "finance") return <FinanceScreen config={config} />;
    if (active === "invoices") return <InvoicesScreen config={config} tr={tr} />;
    if (active === "payroll") return <PayrollScreen config={config} />;
    if (active === "sms") return <SmsScreen tr={tr} />;
    if (active === "users") return <UsersScreen currentRole={currentRole} />;
    if (active === "reports") return <ReportsScreen config={config} />;
    if (active === "parents") return <ParentsScreen />;
    if (active === "communication") return <ParentCommunicationScreen />;
    if (active === "idcards") return <IdCardsScreen config={config} />;
    if (active === "security") return <ProductionReadinessScreen session={session} currentRole={currentRole} tenantReady={tenantReady} tenantError={tenantError} config={config} />;
    if (active === "excel") return <ExcelScreen />;
    if (active === "achievements") return <AchievementsScreen />;
    if (active === "config") return <ConfigScreen config={config} setConfig={setConfig} />;
    if (ENTITY_SCHEMAS[active]) return <EntityScreen schema={ENTITY_SCHEMAS[active]} />;
    return null;
  };

  const canManageBranches = ["Admin", "Maamule"].includes(currentRole);
  const visibleNav = NAV.filter((n) => canAccess(currentRole, n.id));
  const moreItems = visibleNav.filter((n) => !PRIMARY_TABS.includes(n.id) && n.id !== "home");

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}
      >
        <div className="text-sm font-medium" style={{ color: COLORS.teal }}>
          NIBRAAS waa soo furmayaa...
        </div>
      </div>
    );
  }

  if (isRecovery) {
    return <RecoveryScreen onDone={() => setIsRecovery(false)} />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (!tenantReady || roleLoading || !currentRole || !branchesLoaded) {
    const problem = tenantError || roleError || branchesError;
    const kind = tenantError ? tenantErrorKind : "transient";
    const retry = () => {
      if (tenantError) setVerifyNonce((n) => n + 1);
      else if (roleError) { setRoleLoading(true); setRoleNonce((n) => n + 1); }
      else setBranchNonce((n) => n + 1);
    };
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}>
        <div className="max-w-md w-full rounded-2xl border p-6 text-center" role="status" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          {problem ? (
            <>
              <p className="font-semibold mb-2" style={{ color: COLORS.brick }}>
                {kind === "setup" ? "Supabase-ka weli ma diyaarsana." : kind === "denied" ? "Akoonkan lama xaqiijin karin." : "Isku xirka lama dhammaystirin."}
              </p>
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>{problem}</p>
              {kind === "transient" && <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>Xogtaada waa ammaan; wax lama beddelin. Hubi internet-ka kadibna riix "Mar kale isku day".</p>}
              {kind === "setup" && <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>Function-ka database-ka ma helin. Maamulaha nidaamka ha hubiyo SQL-ka ku jira folder-ka supabase/migrations.</p>}
              {kind === "denied" && <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>Haddii aad rumaysan tahay inaad xubin tahay, la xiriir Admin-ka madrasadda.</p>}
              <div className="mt-4 flex gap-2 justify-center">
                <button type="button" onClick={retry} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>Mar kale isku day</button>
                <button type="button" onClick={() => supabase.auth.signOut()} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: COLORS.line, color: COLORS.ink }}>Ka bax</button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: COLORS.teal }}>NIBRAAS amnigiisa iyo doorkaaga waa la hubinayaa...</p>
              {tenantNote && <p className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{tenantNote}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir={language === "ar" ? "rtl" : "ltr"} style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0" style={{ backgroundColor: COLORS.tealDeep }}>
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white p-0.5 overflow-hidden">
            <img src={config.logoUrl || logo} alt="NIBRAAS" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
          <div>
            <span className="text-lg font-semibold block" style={{ fontFamily: DISPLAY_FONT, color: "#fff" }}>
              NIBRAAS
            </span>
            <span className="text-[10px]" style={{ color: COLORS.goldSoft }}>{currentRole}</span>
          </div>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
          {visibleNav.map((n) => {
            const isActive = active === n.id;
            return (
              <button
                key={n.id}
                onClick={() => goTo(n.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
                style={{
                  backgroundColor: isActive ? "rgba(201,162,39,0.15)" : "transparent",
                  color: isActive ? COLORS.gold : "rgba(247,243,234,0.75)",
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0"
                  style={{ backgroundColor: isActive ? "rgba(201,162,39,0.22)" : "rgba(255,255,255,0.07)" }}
                >
                  <n.icon size={16} />
                </span>
                {navLabel(n.id, n.label)}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 relative">
          {canManageBranches && showBranchManager && (
            <div
              className="absolute left-3 right-3 bottom-16 z-50 rounded-xl border p-4 shadow-lg"
              style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}
            >
              <p className="font-semibold mb-3" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>
                {tr.branches}
              </p>
              <div className="space-y-2 mb-3">
                {branches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-lg border px-3 py-2" style={{ borderColor: COLORS.line }}>
                    <span style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>{b.name}</span>
                    <button
                      type="button"
                      onClick={() => switchBranch(b.id)}
                      className="text-xs font-semibold"
                      style={{ color: COLORS.teal, fontFamily: BODY_FONT }}
                    >
                      {activeBranchId === b.id ? "✓" : tr.branch}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder={tr.branchName}
                  className="flex-1 rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: COLORS.line, color: COLORS.ink }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newBranchName.trim();
                    if (!name) return;
                    const id = "branch-" + Date.now();
                    setBranches((prev) => [...prev, { id, name }]);
                    switchBranch(id);
                    setNewBranchName("");
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{ backgroundColor: COLORS.teal, color: "#fff", fontFamily: BODY_FONT }}
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <select
              value={activeBranchId}
              onChange={(e) => switchBranch(e.target.value)}
              aria-label={tr.branch}
              className="rounded-lg border px-2 py-2 text-sm flex-1 min-w-0"
              style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff", fontFamily: BODY_FONT }}
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {canManageBranches && <button
              type="button"
              onClick={() => setShowBranchManager((v) => !v)}
              className="rounded-lg border px-2 py-2 text-sm"
              style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff", fontFamily: BODY_FONT }}
            >
              {tr.branches}
            </button>}
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label={tr.language}
              className="rounded-lg border px-2 py-2 text-sm"
              style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff", fontFamily: BODY_FONT }}
            >
              <option value="so">🇸🇴 Somali</option>
              <option value="ar">🇸🇦 العربية</option>
              <option value="en">🇬🇧 English</option>
            </select>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition"
              style={{ backgroundColor: COLORS.brick, color: "#fff", fontFamily: BODY_FONT }}
              aria-label={tr.logout}
              title={tr.logout}
            >
              <LogOut size={17} />
              <span>{tr.logout || "Ka bax"}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3.5"
          style={{ backgroundColor: COLORS.tealDeep }}
        >
          <div className="flex items-center gap-2">
            <img
              src={config.logoUrl || logo}
              alt="NIBRAAS logo"
              className="w-7 h-7 rounded-md object-contain"
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = logo; }}
            />
            <span className="text-base font-semibold" style={{ fontFamily: DISPLAY_FONT, color: "#fff" }}>
              {config.schoolName || "NIBRAAS"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold"
            style={{ backgroundColor: COLORS.brick, color: "#fff", fontFamily: BODY_FONT }}
            aria-label={tr.logout}
            title={tr.logout}
          >
            <LogOut size={17} />
            <span>{tr.logout || "Ka bax"}</span>
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 pb-24 md:pb-10 overflow-y-auto">
          {mobileTip && (
            <div
              id="nibraas-mobile-tip"
              className="mb-3 rounded-xl border p-3 text-sm flex items-center justify-between gap-3"
              style={{ borderColor: COLORS.line, backgroundColor: COLORS.goldSoft, color: COLORS.ink, fontFamily: BODY_FONT }}
            >
              <span>📱 NIBRAAS waxaa loogu talagalay inuu si fiican uga shaqeeyo telefoonka. Waxaad browser-ka ka dooran kartaa <strong>Add to Home Screen</strong>.</span>
              <button type="button" onClick={dismissMobileTip} className="font-bold" aria-label="Close">×</button>
            </div>
          )}{<div key={`${active}:${activeBranchId}`}>{renderScreen()}</div>}</main>

        {/* Mobile bottom tab bar */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 flex items-stretch justify-around border-t z-20"
          style={{ backgroundColor: "#fff", borderColor: COLORS.line }}
        >
          {PRIMARY_TABS.filter((id) => canAccess(currentRole, id)).map((id) => {
            const n = NAV.find((x) => x.id === id);
            const isActive = active === id && !moreOpen;
            return (
              <button
                key={id}
                onClick={() => goTo(id)}
                className="flex-1 flex flex-col items-center gap-0.5 py-1.5"
                style={{ color: isActive ? COLORS.teal : COLORS.inkSoft }}
              >
                <span className="inline-flex items-center justify-center h-7 w-12 rounded-full transition" style={{ backgroundColor: isActive ? "rgba(11,61,58,0.10)" : "transparent" }}>
                  <n.icon size={19} strokeWidth={isActive ? 2.4 : 2} />
                </span>
                <span className="text-[10px] font-medium" style={{ fontFamily: BODY_FONT }}>
                  {navLabel(n.id, n.label)}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5"
            style={{ color: moreOpen ? COLORS.teal : COLORS.inkSoft }}
          >
            <span className="inline-flex items-center justify-center h-7 w-12 rounded-full transition" style={{ backgroundColor: moreOpen ? "rgba(11,61,58,0.10)" : "transparent" }}>
              <Grid3x3 size={19} strokeWidth={moreOpen ? 2.4 : 2} />
            </span>
            <span className="text-[10px] font-medium" style={{ fontFamily: BODY_FONT }}>
              Kale
            </span>
          </button>
        </nav>

        {/* Mobile "more" sheet */}
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex items-end" onClick={() => setMoreOpen(false)}>
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="relative w-full rounded-t-2xl px-5 pt-5 pb-8 max-h-[70vh] overflow-y-auto"
              style={{ backgroundColor: COLORS.sand }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
                  Dhammaan Qaybaha
                </p>
                <button onClick={() => setMoreOpen(false)}>
                  <X size={18} style={{ color: COLORS.inkSoft }} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.ink }}>{tr.branch}</label>
                  <select value={activeBranchId} onChange={(e) => switchBranch(e.target.value)} aria-label={tr.branch} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff" }}>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  {canManageBranches && <button type="button" onClick={() => setShowBranchManager((v) => !v)} className="mt-2 text-sm font-semibold" style={{ color: COLORS.teal }}>{tr.branches} · {tr.addBranch}</button>}
                  {canManageBranches && showBranchManager && (
                    <div className="mt-2 rounded-lg border p-3 space-y-2" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
                      {branches.map((b) => <div key={b.id} className="flex items-center justify-between text-sm"><span>{b.name}</span><button type="button" onClick={() => switchBranch(b.id)} className="font-semibold" style={{ color: COLORS.teal }}>{activeBranchId === b.id ? "✓" : tr.branch}</button></div>)}
                      <div className="flex gap-2"><input value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} placeholder={tr.branchName} className="min-w-0 flex-1 rounded-lg border px-2 py-2 text-sm" style={{ borderColor: COLORS.line }} /><button type="button" onClick={() => { const name = newBranchName.trim(); if (!name) return; const id = "branch-" + Date.now(); setBranches((prev) => [...prev, { id, name }]); switchBranch(id); setNewBranchName(""); }} className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>+</button></div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: COLORS.ink }}>{tr.language}</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={tr.language} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff" }}>
                    <option value="so">🇸🇴 Somali</option><option value="ar">🇸🇦 العربية</option><option value="en">🇬🇧 English</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {moreItems.map((n) => (
                  <button key={n.id} onClick={() => goTo(n.id)} className="flex flex-col items-center gap-1.5">
                    <IconTile id={n.id} icon={n.icon} size={56} iconSize={22} />
                    <span className="text-[11px] text-center leading-tight" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                      {navLabel(n.id, n.label)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}


