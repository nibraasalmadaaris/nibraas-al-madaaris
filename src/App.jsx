import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  Home, Users, UserCog, GraduationCap, ClipboardCheck, CalendarClock, BookOpen,
  AlertCircle, TrendingUp, ClipboardList, Wallet, BarChart3, MessageSquare,
  Settings, Plus, Search, Trash2, Pencil, ArrowLeft, X, Check, ChevronRight,
  Grid3x3, Send, RotateCcw, Circle, LogOut, ShieldCheck, Banknote, BriefcaseBusiness, IdCard,
  Download, Upload, FileSpreadsheet, Trophy
} from "lucide-react";

/* ---------------------------------------------------------
   NIBRAAS v31 — Nidaamka Maareynta Madrasada
   "Isnaad" = silsilada wadarta (chain of transmission) —
   the record-keeping backbone of the school.
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

/* ---------- secure tenant/branch storage ---------- */
const GLOBAL_STORAGE_KEYS = new Set(["user-profiles", "config-data", "branches-data"]);
let CURRENT_TENANT_ID = null;
let CURRENT_BRANCH_ID = (() => {
  try { return localStorage.getItem("nibraas-active-branch") || "main"; } catch { return "main"; }
})();

function setStorageTenant(id) {
  CURRENT_TENANT_ID = id || null;
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

async function loadObj(key, fallback) {
  const physicalKey = physicalStorageKey(key);
  if (!physicalKey) return fallback;
  try {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("tenant_id", CURRENT_TENANT_ID)
      .eq("key", physicalKey)
      .maybeSingle();

    if (error) {
      console.error("Load error:", error);
      return fallback;
    }
    return data ? data.value : fallback;
  } catch (e) {
    console.error("Load error:", e);
    return fallback;
  }
}

async function saveObj(key, obj) {
  const physicalKey = physicalStorageKey(key);
  if (!physicalKey || !CURRENT_TENANT_ID) return;
  const branchId = isGlobalStorageKey(key) ? "__global__" : (CURRENT_BRANCH_ID || "main");
  try {
    const { error } = await supabase
      .from("app_storage")
      .upsert(
        {
          key: physicalKey,
          tenant_id: CURRENT_TENANT_ID,
          branch_id: branchId,
          value: obj,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
    if (error) console.error("Storage error:", error);
  } catch (e) {
    console.error("Storage error:", e);
  }
}
async function saveArr(key, arr) {
  return saveObj(key, arr);
}
async function deleteKey(key) {
  const physicalKey = physicalStorageKey(key);
  if (!physicalKey) return;
  const { error } = await supabase
    .from("app_storage")
    .delete()
    .eq("tenant_id", CURRENT_TENANT_ID)
    .eq("key", physicalKey);
  if (error) console.error("Delete error:", error);
}
async function listKeys(prefix) {
  const physicalPrefix = physicalStorageKey(prefix);
  if (!physicalPrefix) return [];
  const { data, error } = await supabase
    .from("app_storage")
    .select("key")
    .eq("tenant_id", CURRENT_TENANT_ID)
    .like("key", `${physicalPrefix}%`);
  if (error) {
    console.error("List error:", error);
    return [];
  }
  return (data || []).map((r) => logicalStorageKey(r.key));
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

  try {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("tenant_id", CURRENT_TENANT_ID)
      .eq("key", physicalKey)
      .maybeSingle();

    if (error) {
      return { ok: false, data: null, error };
    }

    return {
      ok: true,
      data: data ? data.value : [],
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error,
    };
  }
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
  Admin: ["*"],
  Maamule: ["home", "students", "employees", "users", "classes", "attendance", "activities", "complaints", "progress", "quran", "exams", "finance", "invoices", "payroll", "reports", "sms", "parents", "communication", "idcards", "jadwal", "security", "excel", "achievements", "daily", "config"],
  Macalin: ["home", "students", "classes", "attendance", "activities", "progress", "quran", "exams", "payroll", "jadwal", "reports", "excel", "achievements", "daily"],
  Xisaabiye: ["home", "finance", "invoices", "payroll", "reports", "excel"],
  Shaqaale: ["home", "students", "attendance", "activities", "complaints"],
};

function canAccess(role, id) {
  const allowed = ROLE_PERMISSIONS[role] || ["home"];
  return allowed.includes("*") || allowed.includes(id);
}


function UsersScreen() {
  const [users, setUsers] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "Macalin" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadArr("user-profiles").then((data) => {
      setUsers(Array.isArray(data) ? data : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveArr("user-profiles", users);
  }, [users, loaded]);

  const addUser = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!name || !email || !password) {
      setError("Magaca, email-ka iyo password-ka waa loo baahan yahay.");
      return;
    }
    if (password.length < 6) {
      setError("Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.");
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
        } catch {}
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

      setUsers((prev) => [...prev, profile]);
      setForm({ name: "", email: "", password: "", role: "Macalin" });
      setMessage(
        data.existing
          ? "User-kii hore ayuu u jiray; hadda NIBRAAS ayaa lagu xidhay role-ka iyo tenant-ka."
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
      const { error } = await supabase
        .from("nibraas_memberships")
        .delete()
        .eq("tenant_id", CURRENT_TENANT_ID)
        .eq("user_id", user.authUserId);
      if (error) {
        setError(error.message || "User-ka tenant-ka lagama saari karin.");
        return;
      }
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
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
              {USER_ROLES.map((role) => <option key={role}>{role}</option>)}
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
      { key: "age", label: "Da'da", type: "number" },
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
      { key: "capacity", label: "Tirada Ardayda ee la ogol yahay", type: "number" },
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
      { key: "score", label: "Dhibcaha", type: "number" },
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
      { key: "maxScore", label: "Ugu badnaan Dhibcaha", type: "number" },
    ],
    display: (it) => ({ title: it.name, sub: [it.className, fmtDate(it.date)].filter(Boolean).join(" · ") }),
  },
};

const NAV = [
  { id: "home", label: "Guriga", icon: Home },
  { id: "students", label: "Ardayda", icon: Users },
  { id: "employees", label: "Shaqaalaha", icon: UserCog },
  { id: "users", label: "Users & Roles", icon: ShieldCheck },
  { id: "classes", label: "Fasallada", icon: GraduationCap },
  { id: "attendance", label: "Xaadirinta", icon: ClipboardCheck },
  { id: "jadwal", label: "Jadwalka Casharrada", icon: CalendarClock },
  { id: "daily", label: "Jadwalka Maalinlaha", icon: ClipboardList },
  { id: "activities", label: "Hawlaha", icon: CalendarClock },
  { id: "complaints", label: "Cabashooyinka", icon: AlertCircle },
  { id: "progress", label: "Maadooyin & Horumar", icon: TrendingUp },
  { id: "quran", label: "Qur’aan & Xifdhi", icon: BookOpen },
  { id: "exams", label: "Imtixaannada", icon: ClipboardList },
  { id: "finance", label: "Maaliyadda", icon: Wallet },
  { id: "invoices", label: "Biilasha & Khidmadaha", icon: FileSpreadsheet },
  { id: "payroll", label: "HR & Mushaharka", icon: Banknote },
  { id: "reports", label: "Warbixinno", icon: BarChart3 },
  { id: "parents", label: "Waalidiinta", icon: Users },
  { id: "communication", label: "Xiriirka Waalidiinta", icon: MessageSquare },
  { id: "idcards", label: "ID Cards", icon: IdCard },
  { id: "sms", label: "Fariimaha SMS", icon: MessageSquare },
  { id: "security", label: "Production & Security", icon: ShieldCheck },
  { id: "excel", label: "Excel / Import & Export", icon: FileSpreadsheet },
  { id: "achievements", label: "Guulaha & Tartanka", icon: Trophy },
  { id: "config", label: "Dejinta", icon: Settings },
];
const PRIMARY_TABS = ["home", "students", "attendance", "finance"];

/* =========================================================
   Generic form field
========================================================= */
function FormField({ field, value, onChange }) {
  const base =
    "w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2";
  const style = { borderColor: COLORS.line, fontFamily: BODY_FONT };
  if (field.type === "select") {
    return (
      <select
        className={base}
        style={{ ...style, "--tw-ring-color": COLORS.gold }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Dooro...</option>
        {field.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        className={base}
        style={{ ...style, "--tw-ring-color": COLORS.gold, minHeight: 80 }}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }
  return (
    <input
      type={field.type}
      className={base}
      style={{ ...style, "--tw-ring-color": COLORS.gold }}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
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

  const storeKey = `${schema.key}-data`;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadArr(storeKey).then((arr) => {
      if (alive) {
        setItems(arr);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [storeKey]);

const persist = async (next) => {
  setItems(next);
  await saveArr(storeKey, next);
};

  const openNew = () => {
    setFormData({});
    setEditingId(null);
    setView("form");
  };
  const openEdit = (it) => {
    setFormData(it);
    setEditingId(it.id);
    setView("form");
  };
  const submit = async (e) => {
    e.preventDefault();
    const required = schema.fields.filter((f) => f.required);
    for (const f of required) {
      if (!formData[f.key]) return;
    }
    if (editingId) {
      await persist(items.map((it) => (it.id === editingId ? { ...it, ...formData } : it)));
    } else {
      const newItem = { ...formData, id: Date.now(), createdAt: new Date().toISOString() };
      await persist([newItem, ...items]);
    }
    setView("list");
  };
  const remove = async (id) => {
    if (confirmId !== id) {
      setConfirmId(id);
      setTimeout(() => setConfirmId((c) => (c === id ? null : c)), 2500);
      return;
    }
    await persist(items.filter((it) => it.id !== id));
    setConfirmId(null);
  };

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const d = schema.display(it);
    return `${d.title} ${d.sub}`.toLowerCase().includes(search.toLowerCase());
  });

  const Icon = schema.icon;

  if (view === "form") {
    return (
      <div className="max-w-xl mx-auto">
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
        <form onSubmit={submit} className="space-y-4">
          {schema.fields.map((f) => (
            <div key={f.key}>
              <label
                className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}
              >
                {f.label} {f.required && <span style={{ color: COLORS.brick }}>*</span>}
              </label>
              <FormField
                field={f}
                value={formData[f.key]}
                onChange={(v) => setFormData((p) => ({ ...p, [f.key]: v }))}
              />
            </div>
          ))}
          <button
            type="submit"
            className="w-full rounded-lg py-3 font-semibold text-sm mt-2"
            style={{ backgroundColor: COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}
          >
            {editingId ? "Kaydi Beddelka" : "Kaydi"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
          {schema.title}
        </h2>
        <button
          onClick={openNew}
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

      {loading ? (
        <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Soo dejinaya...
        </p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Icon} text={`Wali lama gelin ${schema.title.toLowerCase()}`} />
      ) : (
        <div className="space-y-2">
          {filtered.map((it) => {
            const d = schema.display(it);
            return (
              <div
                key={it.id}
                className="flex items-center justify-between rounded-xl border px-4 py-3"
                style={{ borderColor: COLORS.line, backgroundColor: "#FFFFFF" }}
              >
                <button onClick={() => openEdit(it)} className="flex-1 text-left">
                  <p className="text-sm font-semibold" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                    {d.title}
                  </p>
                  {d.sub && (
                    <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                      {d.sub}
                    </p>
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
  const [date, setDate] = useState(todayISO());
  const [className, setClassName] = useState("Dhammaan");
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadArr("students-data").then((arr) => {
      setStudents(arr);
      setLoading(false);
    });
  }, []);

  const classOptions = ["Dhammaan", ...Array.from(new Set(students.map((s) => s.className).filter(Boolean)))];
  const roster = className === "Dhammaan" ? students : students.filter((s) => s.className === className);

  const attKey = `attendance-${date}__${className}`;
  useEffect(() => {
    let alive = true;
    loadObj(attKey, null).then((rec) => {
      if (!alive) return;
      if (rec && rec.records) {
        const m = {};
        rec.records.forEach((r) => (m[r.id] = r.status));
        setMarks(m);
      } else {
        setMarks({});
      }
      setSaved(false);
    });
    return () => {
      alive = false;
    };
  }, [attKey]);

  const setMark = (id, status) => setMarks((p) => ({ ...p, [id]: status }));

  const save = async () => {
    const records = roster.map((s) => ({ id: s.id, name: s.name, status: marks[s.id] || "Maqan" }));
    await saveObj(attKey, { date, className, records });
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

      {roster.length > 0 && (
        <button
          onClick={save}
          className="w-full rounded-lg py-3 font-semibold text-sm"
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

  const persist = async (next) => {
    setInvoices(next);
    await saveArr("invoices-data", next);
  };

  const chooseStudent = (id) => {
    const student = students.find((s) => String(s.id) === String(id));
    setForm((p) => ({ ...p, studentId: id, studentName: student?.name || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName || !form.amount) return;
    const item = {
      ...form,
      id: `INV-${Date.now()}`,
      amount: Number(form.amount) || 0,
      createdAt: new Date().toISOString(),
    };
    await persist([item, ...invoices]);
    setForm({ studentId: "", studentName: "", title: "Khidmad bille", amount: "", dueDate: todayISO(), status: "Aan La Bixin", note: "" });
    setView("list");
  };

  const togglePaid = async (invoice) => {
    const next = invoices.map((x) => x.id === invoice.id ? { ...x, status: x.status === "La Bixiyay" ? "Aan La Bixin" : "La Bixiyay", paidAt: x.status === "La Bixiyay" ? null : new Date().toISOString() } : x);
    await persist(next);
  };

  const removeInvoice = async (invoice) => {
    if (!window.confirm(`Ma tirtirtaa biilka ${invoice.id}?`)) return;
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
              <select value={form.studentId} onChange={(e) => chooseStudent(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}>
                <option value="">Dooro arday...</option>
                {students.map((st) => <option key={st.id} value={st.id}>{st.name}{st.className ? ` — ${st.className}` : ""}</option>)}
              </select>
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
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [form, setForm] = useState({ type: "Lacag La Bixiyay", date: todayISO() });

  useEffect(() => {
    loadArr("finance-data").then((arr) => {
      setTxns(arr);
      setLoading(false);
    });
  }, []);

  const persist = async (next) => {
    setTxns(next);
    await saveArr("finance-data", next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName || !form.amount) return;
    const newItem = { ...form, id: Date.now() };
    await persist([newItem, ...txns]);
    setForm({ type: "Lacag La Bixiyay", date: todayISO() });
    setView("list");
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
          Diiwaan Gelin Lacag
        </h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
              Magaca Ardayga *
            </label>
            <input
              value={form.studentName || ""}
              onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
            />
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
            Kaydi
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
              <p
                className="text-sm font-bold"
                style={{ color: t.type === "Deyn" ? COLORS.brick : COLORS.tealLight, fontFamily: BODY_FONT }}
              >
                {t.type === "Deyn" ? "-" : "+"}
                {fmtMoney(t.amount, config.currency)}
              </p>
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
    Promise.all([loadArr("parents-data"), loadArr("students-data")]).then(([p, s]) => {
      setParents(Array.isArray(p) ? p : []);
      setStudents(Array.isArray(s) ? s : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveArr("parents-data", parents);
  }, [parents, loaded]);

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
    setParents((prev) => [item, ...prev]);
    resetForm();
    setView("parents");
  };

  const removeParent = async (id) => {
    const next = parents.filter((p) => p.id !== id);
    setParents(next);
    if (selectedId === id) setSelectedId("");
  };

  const togglePortal = (parent) => {
    const nextStatus =
      parent.portalStatus === "Firfircoon" ? "Aan la hawlgelin" : "Firfircoon";
    setParents((prev) =>
      prev.map((p) =>
        p.id === parent.id ? { ...p, portalStatus: nextStatus } : p
      )
    );
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
            <select
              value={form.studentName}
              onChange={(e) => setForm({ ...form, studentName: e.target.value })}
              required
              className="rounded-lg border px-3 py-2.5 outline-none"
              style={{ borderColor: COLORS.line }}
            >
              <option value="">Dooro ardayga...</option>
              {students.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
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
    const student = students.find((s) => s.name === selected?.studentName);
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

  const classes = [...new Set(students.map((s) => s.className || s.class || s.fasal).filter(Boolean))];
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
    setLog(next);
    await saveArr("sms-log", next);
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
    setLog(next);
    await saveArr("sms-log", next);
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
          <Send size={15} /> {sending ? "Kaydinaya..." : sentFlash ? "La Kaydiyay!" : "Dir Fariinta"}
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
    setLogs(next);
    await saveArr("parent-communication-log", next);
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
    await saveLog(item);
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
    if (!alerts.length) { alert("Maanta lama helin maqnaansho si alert loogu sameeyo."); return; }
    const next = [...alerts, ...logs];
    setLogs(next);
    await saveArr("parent-communication-log", next);
    alert(`${alerts.length} ogeysiis waalid ayaa la diyaariyey.`);
    setMode("history");
  };

  const saveTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim() || !templateText.trim()) return;
    const item = { id: crypto.randomUUID(), name: templateName.trim(), text: templateText.trim(), createdAt: new Date().toISOString() };
    const next = [item, ...templates];
    setTemplates(next);
    await saveArr("parent-message-templates", next);
    setTemplateName(""); setTemplateText("");
  };

  const deleteTemplate = async (id) => {
    const next = templates.filter((x) => x.id !== id);
    setTemplates(next);
    await saveArr("parent-message-templates", next);
  };

  const markSent = async (id) => {
    const next = logs.map((x) => x.id === id ? { ...x, status: "La diray" } : x);
    setLogs(next);
    await saveArr("parent-communication-log", next);
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
        const keys = await listKeys("attendance-");
        const rows = await Promise.all(keys.map((key) => loadObj(key, null)));
        attendance = rows.filter(Boolean).flatMap((row) =>
          (row.records || []).map((record) => ({
            ...record,
            date: row.date,
            className: row.className,
          }))
        );
      } catch (e) {
        console.error("Reports attendance error:", e);
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
    if (selectedStudent && s.name !== selectedStudent) return false;
    if (selectedClass && s.className !== selectedClass) return false;
    return true;
  });

  const filteredAttendance = data.attendance.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedClass && r.className !== selectedClass) return false;
    if (selectedStudent && r.name !== selectedStudent) return false;
    return true;
  });

  const filteredProgress = data.progress.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedStudent && r.studentName !== selectedStudent) return false;
    if (selectedClass) {
      const student = data.students.find((s) => s.name === r.studentName);
      if (student?.className !== selectedClass) return false;
    }
    return true;
  });

  const filteredQuran = data.quran.filter((r) => {
    if (!inRange(r.date)) return false;
    if (selectedStudent && r.studentName !== selectedStudent) return false;
    if (selectedClass) {
      const student = data.students.find((s) => s.name === r.studentName);
      if (student?.className !== selectedClass) return false;
    }
    return true;
  });

  const filteredExamResults = data.examResults.filter((r) => {
    const exam = data.exams.find((e) => String(e.id) === String(r.examId));
    if (!inRange(exam?.date)) return false;
    if (selectedStudent && r.studentName !== selectedStudent) return false;
    if (selectedClass && exam?.className !== selectedClass) return false;
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

  const classes = Array.from(new Set(data.students.map((s) => s.className).filter(Boolean))).sort();
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
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const school = config.schoolName || "NIBRAAS";
    const currency = config.currency || "$";
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
    if (!win) { alert("Fadlan ogolow popup-ka browser-ka."); return; }
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
          <div><label className="block text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>Ardayga</label><select value={filters.student} onChange={(e) => setFilters((p) => ({ ...p, student: e.target.value }))} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: COLORS.line }}><option>Dhammaan</option>{studentsForFilter.map((s) => <option key={s}>{s}</option>)}</select></div>
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
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    month: new Date().toISOString().slice(0, 7),
    baseSalary: "",
    bonus: "0",
    deduction: "0",
    status: "La sugayo",
    note: "",
  });
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([loadArr("employees-data"), loadArr("payroll-data")]).then(([emps, pays]) => {
      setEmployees(Array.isArray(emps) ? emps : []);
      setRecords(Array.isArray(pays) ? pays : []);
      setLoading(false);
    });
  }, []);

  const persist = async (next) => {
    setRecords(next);
    await saveArr("payroll-data", next);
  };

  const openNew = () => {
    setForm({
      employeeId: "",
      employeeName: "",
      month,
      baseSalary: "",
      bonus: "0",
      deduction: "0",
      status: "La sugayo",
      note: "",
    });
    setView("form");
  };

  const selectEmployee = (id) => {
    const emp = employees.find((e) => String(e.id) === String(id));
    setForm((p) => ({ ...p, employeeId: id, employeeName: emp?.name || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.employeeName || !form.baseSalary) return;
    setSaving(true);
    const item = {
      id: Date.now(),
      ...form,
      baseSalary: Number(form.baseSalary) || 0,
      bonus: Number(form.bonus) || 0,
      deduction: Number(form.deduction) || 0,
      netSalary: Math.max(0, (Number(form.baseSalary) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0)),
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...records.filter((r) => !(r.employeeId === item.employeeId && r.month === item.month))];
    await persist(next);
    setSaving(false);
    setMonth(item.month);
    setView("list");
  };

  const remove = async (id) => {
    await persist(records.filter((r) => r.id !== id));
  };

  const monthRecords = records.filter((r) => r.month === month);
  const filtered = monthRecords.filter((r) => {
    if (!search.trim()) return true;
    return `${r.employeeName} ${r.status} ${r.note || ""}`.toLowerCase().includes(search.toLowerCase());
  });
  const total = monthRecords.reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const paid = monthRecords.filter((r) => r.status === "La bixiyay").reduce((sum, r) => sum + Number(r.netSalary || 0), 0);
  const pending = total - paid;
  const currency = config?.currency || "$";

  const money = (n) => `${currency} ${Number(n || 0).toLocaleString()}`;

  if (view === "form") {
    return (
      <div className="max-w-2xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm mb-4 font-semibold" style={{ color: COLORS.tealLight }}>
          <ArrowLeft size={16} /> Dib u noqo
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Ku dar Mushahar</h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className="rounded-xl border p-5 space-y-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          <select value={form.employeeId} onChange={(e) => selectEmployee(e.target.value)} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}>
            <option value="">Dooro shaqaale...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}{e.role ? ` — ${e.role}` : ""}</option>)}
          </select>
          <input type="month" value={form.month} onChange={(e) => setForm((p) => ({ ...p, month: e.target.value }))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
          <div className="grid md:grid-cols-3 gap-3">
            <input type="number" min="0" value={form.baseSalary} onChange={(e) => setForm((p) => ({ ...p, baseSalary: e.target.value }))} placeholder="Mushaharka aasaasiga" required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            <input type="number" min="0" value={form.bonus} onChange={(e) => setForm((p) => ({ ...p, bonus: e.target.value }))} placeholder="Gunno" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            <input type="number" min="0" value={form.deduction} onChange={(e) => setForm((p) => ({ ...p, deduction: e.target.value }))} placeholder="Jaritaan" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
          </div>
          <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}>
            <option>La sugayo</option><option>La bixiyay</option>
          </select>
          <textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Faallo" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, minHeight: 80 }} />
          <div className="rounded-lg p-3" style={{ backgroundColor: COLORS.sand }}>
            <p className="text-xs" style={{ color: COLORS.inkSoft }}>Mushahar saafi ah</p>
            <p className="text-xl font-bold" style={{ color: COLORS.teal }}>{money(Math.max(0, (Number(form.baseSalary) || 0) + (Number(form.bonus) || 0) - (Number(form.deduction) || 0)))}</p>
          </div>
          <button disabled={saving} className="w-full rounded-lg py-3 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>{saving ? "Kaydinaya..." : "Kaydi Mushaharka"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div><h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>HR & Mushaharka</h2><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Maamul mushaharka shaqaalaha iyo lacag-bixinta.</p></div>
        <button onClick={openNew} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16}/> Ku dar</button>
      </div>
      <SignatureChain className="mb-5" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Wadarta" value={money(total)} tone="teal" />
        <StatCard label="La bixiyay" value={money(paid)} tone="gold" />
        <StatCard label="La sugayo" value={money(pending)} tone="light" />
      </div>
      <div className="grid md:grid-cols-2 gap-3 mb-4">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
        <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi shaqaale..." className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" style={{ borderColor: COLORS.line }}/></div>
      </div>
      {loading ? <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Waa la soo dejinayaa...</p> : filtered.length === 0 ? <EmptyState icon={Banknote} text="Wali mushahar bishan lama gelin."/> : <div className="space-y-2">{filtered.map((r) => <div key={r.id} className="rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-sm" style={{ color: COLORS.ink }}>{r.employeeName}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{money(r.netSalary)} · {r.status}{r.note ? ` · ${r.note}` : ""}</p></div><div className="flex items-center gap-2"><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: r.status === "La bixiyay" ? COLORS.goldSoft : "#EEF5F3", color: COLORS.tealDeep }}>{r.status}</span><button onClick={() => remove(r.id)} className="p-2 rounded-lg" style={{ color: COLORS.brick, backgroundColor: "#FDECEC" }}><Trash2 size={15}/></button></div></div></div>)}</div>}
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
    const { data, error } = await supabase
      .from("app_storage")
      .select("key, value, updated_at, created_at, branch_id")
      .eq("tenant_id", CURRENT_TENANT_ID);
    if (error) throw error;

    const backupData = (data || []).map((row) => ({
      key: logicalStorageKey(row.key),
      value: row.value,
      updated_at: row.updated_at,
      created_at: row.created_at,
      branch_id: row.branch_id || "main",
    }));

    const backup = {
      app: "Isnaad",
      version: 2,
      exportedAt: new Date().toISOString(),
      data: backupData,
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `isnaad-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Backup error:", error);
    alert("Backup-ka lama soo dejisan.");
  } finally {
    setBackupLoading(false);
  }
};

const restoreBackup = async (event) => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  const confirmed = window.confirm(
    "Ma hubtaa inaad Restore sameyso? Xogta ku jirta backup-ka ayaa cusboonaysiin doonta xogta Isnaad."
  );
  if (!confirmed) return;

  setRestoreLoading(true);
  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    if (backup?.app !== "Isnaad" || !Array.isArray(backup?.data)) {
      throw new Error("Backup file aan sax ahayn.");
    }

    for (const row of backup.data) {
      if (!row?.key) continue;
      const logicalKey = logicalStorageKey(row.key);
      const branchId = isGlobalStorageKey(logicalKey)
        ? "__global__"
        : (row.branch_id || "main");
      const physicalKey = physicalStorageKey(logicalKey, branchId === "__global__" ? CURRENT_BRANCH_ID : branchId);
      if (!physicalKey) continue;

      const { error } = await supabase
        .from("app_storage")
        .upsert(
          {
            key: physicalKey,
            tenant_id: CURRENT_TENANT_ID,
            branch_id: branchId,
            value: row.value,
            updated_at: row.updated_at || new Date().toISOString(),
            created_at: row.created_at || new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw error;
    }

    alert("Restore waa lagu guuleystay. NIBRAAS waa dib loo furayaa.");
    window.location.reload();
  } catch (error) {
    console.error("Restore error:", error);
    alert("Restore-ka wuu fashilmay. Hubi backup file-ka.");
  } finally {
    setRestoreLoading(false);
  }
};
  useEffect(() => setForm(config), [config]);

  const save = async (e) => {
    e.preventDefault();
    await saveObj("config-data", form);
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
    for (const k of keys) {
      try {
     await deleteKey(k);
      } catch (e) {}
    }
    setResetStep(false);
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
                className="w-14 h-14 rounded-xl object-cover border"
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
            <img src={form.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border" style={{ borderColor: COLORS.line }} />
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
    Soo dejiso nuqul dhammaan xogta Isnaad ah ama
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
    const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(token)}&size=180&margin=1`;
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
          <img src={qrUrl} alt="QR" width="64" height="64" className="shrink-0" />
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
        const keys = await listKeys(`attendance-${todayISO()}`);
        const rows = await Promise.all(keys.map((key) => loadObj(key, null)));
        rows.filter(Boolean).forEach((row) => {
          (row.records || []).forEach((record) => {
            total += 1;
            if (record.status === "Joogto") present += 1;
          });
        });
      } catch (e) {
        console.error("Dashboard attendance error:", e);
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
  const payrollTotal = data.payroll.reduce((sum, p) => sum + Number(p.amount || p.salary || 0), 0);

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
            Dulmar maamulka, waxbarashada, xaadirinta iyo dhaqaalaha ee maanta.
          </p>
        </div>
        <button onClick={refreshDashboard} className="self-start md:self-auto rounded-lg px-4 py-2.5 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
          {loading ? "Soo dejinaya..." : "Cusboonaysii"}
        </button>
      </div>

      <SignatureChain className="mb-7" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((card) => {
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
                <card.icon size={18} style={{ color: tone.icon }} />
                {card.label === "Xaadirinta Maanta" && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.gold }} />}
              </div>
              <p className="text-2xl font-bold mt-3 truncate" style={{ color: tone.color, fontFamily: DISPLAY_FONT }}>{card.value}</p>
              <p className="text-xs mt-1" style={{ color: tone.sub }}>{card.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5 mb-6">
        <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Dhaqaalaha</p>
              <h2 className="text-lg font-semibold mt-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Lacagta la ururiyay — 6 bilood</h2>
            </div>
            {canAccess(currentRole, "finance") && <button onClick={() => goTo("finance")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Maaliyadda</button>}
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
            <div className="rounded-xl p-3" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><p className="text-xs">Mushahar la diiwaangeliyay</p><p className="text-sm font-bold mt-2">{fmtMoney(payrollTotal, config.currency)}</p></div>
          </div>
        </section>
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
            <button key={n.id} onClick={() => goTo(n.id)} className="rounded-xl p-3 text-left" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><n.icon size={17} style={{ color: COLORS.gold }} /><span className="block text-xs mt-2" style={{ color: "#fff" }}>{navLabel(n.id, n.label)}</span></button>
          ))}
        </div>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: COLORS.inkSoft }}>Dhammaan Qaybaha</p>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
        {quick.map((n) => (
          <button key={n.id} onClick={() => goTo(n.id)} className="flex flex-col items-center gap-1.5"><div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: COLORS.sandDeep, border: `1px solid ${COLORS.line}` }}><n.icon size={20} style={{ color: COLORS.teal }} /></div><span className="text-[11px] text-center leading-tight" style={{ color: COLORS.ink }}>{navLabel(n.id, n.label)}</span></button>
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

  const persistSubjects = async (next) => { setSubjects(next); await saveArr("subjects-data", next); };
  const persistRecords = async (next) => { setRecords(next); await saveArr("academic-progress-data", next); };

  const addSubject = async (e) => {
    e.preventDefault();
    if (!subjectForm.name.trim()) return;
    setSaving(true);
    const item = { id: Date.now(), name: subjectForm.name.trim(), teacher: subjectForm.teacher.trim(), className: subjectForm.className.trim(), createdAt: new Date().toISOString() };
    await persistSubjects([item, ...subjects]);
    setSubjectForm({ name: "", teacher: "", className: "" });
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
    await persistRecords([item, ...records]);
    setProgressForm({ studentName: "", subject: "", term: "Semester 1", score: "", date: todayISO(), teacher: "", note: "" });
    setSaving(false);
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
          <select value={progressForm.studentName} onChange={e=>setProgressForm(p=>({...p,studentName:e.target.value}))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro arday...</option>{students.map(s=><option key={s.id} value={s.name}>{s.name}{s.className?` — ${s.className}`:''}</option>)}</select>
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

  const persistExams = async (next) => {
    setExams(next);
    await saveArr("exams-data", next);
  };
  const persistResults = async (next) => {
    setResults(next);
    await saveArr("exam-results-data", next);
  };

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
    await persistExams([item, ...exams]);
    setExamForm({ name: "", subject: "", className: "", date: todayISO(), time: "", room: "", maxScore: "100" });
    setSaving(false);
    setTab("exams");
  };

  const deleteExam = async (id) => {
    await persistExams(exams.filter((e) => e.id !== id));
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
    const existing = results.find((r) => String(r.examId) === String(exam.id) && r.studentName === resultForm.studentName);
    const item = { id: existing?.id || Date.now(), examId: exam.id, studentName: resultForm.studentName, score, note: resultForm.note.trim(), updatedAt: new Date().toISOString() };
    const next = existing ? results.map((r) => (r.id === existing.id ? item : r)) : [item, ...results];
    await persistResults(next);
    setResultForm({ examId: String(exam.id), studentName: "", score: "", note: "" });
    setSaving(false);
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

  const selectedReportStudent = students.find((s) => s.name === reportStudent);
  const reportRows = results
    .filter((r) => r.studentName === reportStudent)
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
          <select value={resultForm.studentName} onChange={e=>setResultForm(p=>({...p,studentName:e.target.value}))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro arday...</option>{students.map(s=><option key={s.id} value={s.name}>{s.name}{s.className?` — ${s.className}`:''}</option>)}</select>
          <input type="number" min="0" value={resultForm.score} onChange={e=>setResultForm(p=>({...p,score:e.target.value}))} placeholder="Dhibcaha" required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}} />
          <textarea value={resultForm.note} onChange={e=>setResultForm(p=>({...p,note:e.target.value}))} placeholder="Faallo" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line,minHeight:90}} />
          <button disabled={saving || !exams.length || !students.length} className="w-full rounded-lg py-3 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>{saving?'Kaydinaya...':'Kaydi Natiijada'}</button>
        </div>
      </form>}

      {tab === "report" && <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border p-5 mb-4" style={{borderColor:COLORS.line,backgroundColor:'#fff'}}>
          <div className="flex items-center justify-between gap-3 mb-4"><div><h3 className="font-semibold" style={{color:COLORS.ink,fontFamily:DISPLAY_FONT}}>Report Card</h3><p className="text-xs mt-1" style={{color:COLORS.inkSoft}}>Dooro arday si aad u aragto natiijooyinkiisa.</p></div><button type="button" onClick={()=>window.print()} className="rounded-lg px-4 py-2 text-sm font-semibold" style={{backgroundColor:COLORS.teal,color:'#fff'}}>🖨️ Daabac</button></div>
          <select value={reportStudent} onChange={e=>setReportStudent(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{borderColor:COLORS.line}}><option value="">Dooro arday...</option>{students.map(s=><option key={s.id} value={s.name}>{s.name}{s.className?` — ${s.className}`:''}</option>)}</select>
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
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    studentName: "",
    type: "Xifdhi Cusub",
    surah: "",
    fromAyah: "",
    toAyah: "",
    date: todayISO(),
    note: "",
  });

  useEffect(() => {
    Promise.all([loadArr("quran-progress-data"), loadArr("students-data")]).then(([quran, studentList]) => {
      setRecords(Array.isArray(quran) ? quran : []);
      setStudents(Array.isArray(studentList) ? studentList : []);
      setLoading(false);
    });
  }, []);

  const persist = async (next) => {
    setRecords(next);
    await saveArr("quran-progress-data", next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim()) return;
    const item = { ...form, id: Date.now(), createdAt: new Date().toISOString() };
    await persist([item, ...records]);
    setForm({ studentName: "", type: "Xifdhi Cusub", surah: "", fromAyah: "", toAyah: "", date: todayISO(), note: "" });
    setView("list");
  };

  const filtered = records.filter((r) => {
    const text = `${r.studentName || ""} ${r.surah || ""} ${r.type || ""}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const todayCount = records.filter((r) => r.date === todayISO()).length;
  const studentsCount = new Set(records.map((r) => r.studentName).filter(Boolean)).size;

  if (view === "form") {
    return (
      <div className="max-w-xl mx-auto">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-sm mb-4 font-semibold" style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}>
          <ArrowLeft size={16} /> Dib u noqo
        </button>
        <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Qur’aan & Xifdhi</h2>
        <SignatureChain className="mb-5" />
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Ardayga *</label>
            <select value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}>
              <option value="">Dooro arday...</option>
              {students.map((s) => <option key={s.id} value={s.name}>{s.name}{s.className ? ` — ${s.className}` : ""}</option>)}
            </select>
            {students.length === 0 && <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Marka hore Ardayda ku dar arday.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Nooca</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}>
                <option>Xifdhi Cusub</option><option>Dib-u-celin</option><option>Subac</option><option>Dareeris</option><option>Akhris</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Taariikhda</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Suuradda</label>
            <input value={form.surah} onChange={(e) => setForm((p) => ({ ...p, surah: e.target.value }))} placeholder="Tusaale: Al-Baqarah" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Aayadda laga bilaabay</label><input type="number" min="1" value={form.fromAyah} onChange={(e) => setForm((p) => ({ ...p, fromAyah: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /></div>
            <div><label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Aayadda lagu dhammeeyay</label><input type="number" min="1" value={form.toAyah} onChange={(e) => setForm((p) => ({ ...p, toAyah: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /></div>
          </div>
          <div><label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft }}>Faallo</label><textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, minHeight: 80 }} /></div>
          <button type="submit" className="w-full rounded-lg py-3 font-semibold text-sm" style={{ backgroundColor: COLORS.teal, color: COLORS.sand }}>Kaydi Horumarka</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-1">
        <div><h2 className="text-xl font-semibold" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Qur’aan & Xifdhi</h2><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>Diiwaanka xifdhi, subac, dareeris iyo dib-u-celin.</p></div>
        <button onClick={() => setView("form")} className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: COLORS.gold, color: COLORS.tealDeep }}><Plus size={16} /> Ku dar</button>
      </div>
      <SignatureChain className="mb-4" />
      <div className="grid grid-cols-2 gap-3 mb-5"><StatCard label="Diiwaannada Maanta" value={todayCount} tone="teal" /><StatCard label="Ardayda leh diiwaan" value={studentsCount} tone="light" /></div>
      <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Raadi arday ama suurad..." className="w-full rounded-lg border py-2.5 pl-9 pr-3 text-sm" style={{ borderColor: COLORS.line }} /></div>
      {loading ? <p className="text-sm py-8 text-center" style={{ color: COLORS.inkSoft }}>Soo dejinaya...</p> : filtered.length === 0 ? <EmptyState icon={BookOpen} text="Wali lama gelin horumar Qur’aan." /> : <div className="space-y-2">{filtered.map((r) => <div key={r.id} className="rounded-xl border px-4 py-3" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold" style={{ color: COLORS.ink }}>{r.studentName}</p><p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{[r.type, r.surah, r.fromAyah || r.toAyah ? `Aayado ${r.fromAyah || "?"}–${r.toAyah || "?"}` : "", fmtDate(r.date)].filter(Boolean).join(" · ")}</p>{r.note && <p className="text-xs mt-1" style={{ color: COLORS.inkSoft }}>{r.note}</p>}</div><BookOpen size={18} style={{ color: COLORS.gold }} /></div></div>)}</div>}
    </div>
  );
}

/* =========================================================
   App Shell
========================================================= */
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email-ka ama furaha sirta ah waa khalad.");
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError("");
    setResetMessage("");

    if (!email.trim()) {
      setError("Marka hore geli email-ka.");
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: window.location.origin }
    );

    setResetLoading(false);

    if (error) {
      setError(error.message || "Email-ka reset-ka lama dirin.");
      return;
    }

    setResetMessage("Email-ka password reset-ka waa la diray. Ka eeg Gmail-ka.");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundColor: COLORS.sand,
        fontFamily: BODY_FONT,
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: "#fff",
          border: `1px solid ${COLORS.line}`,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: COLORS.gold }}
          >
            <span
              style={{
                fontFamily: DISPLAY_FONT,
                fontWeight: 700,
                fontSize: 32,
                color: COLORS.tealDeep,
              }}
            >
              I
            </span>
          </div>

          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: DISPLAY_FONT,
              color: COLORS.tealDeep,
            }}
          >
            Gal NIBRAAS
          </h1>

          <p
            className="text-sm mt-2 text-center"
            style={{ color: COLORS.inkSoft }}
          >
            Nidaamka Maareynta Madrasada
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: COLORS.ink }}
            >
              Email-ka
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{
                border: `1px solid ${COLORS.line}`,
                color: COLORS.ink,
              }}
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: COLORS.ink }}
            >
              Furaha sirta ah
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-lg px-3 py-2.5 outline-none"
              style={{
                border: `1px solid ${COLORS.line}`,
                color: COLORS.ink,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                backgroundColor: "#FDECEC",
                color: COLORS.brick,
              }}
            >
              {error}
            </div>
          )}

          {resetMessage && (
            <div
              className="rounded-lg px-3 py-2.5 text-sm"
              style={{
                backgroundColor: "#E8F5F1",
                color: COLORS.tealDeep,
              }}
            >
              {resetMessage}
            </div>
          )}

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetLoading}
            className="w-full text-sm font-semibold py-1"
            style={{ color: COLORS.teal }}
          >
            {resetLoading ? "Email-ka diraya..." : "Furaha sirta ah waan ilaaway"}
          </button>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-semibold transition"
            style={{
              backgroundColor: loading ? COLORS.inkSoft : COLORS.teal,
              color: "#fff",
            }}
          >
            {loading ? "Fadlan sug..." : "Soo Gal"}
          </button>
        </form>
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
    setItems(next);
    await saveArr(scheduleKey, next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
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

    await persist(next);
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
    if (!window.confirm("Ma hubtaa inaad ka saarto casharkan jadwalka?")) return;
    await persist(items.filter((it) => it.id !== id));
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
    setTasks(next);
    await saveArr("daily-tasks-data", next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
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
    await persistTasks(next);
    setTaskText("");
  };

  const toggleTask = async (id) => {
    await persistTasks(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  };

  const removeTask = async (id) => {
    if (!window.confirm("Ma hubtaa inaad tirtirto hawshan?")) return;
    await persistTasks(tasks.filter((t) => t.id !== id));
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Browser-kan ma taageero ogeysiisyada.");
      return;
    }
    try {
      const result = await Notification.requestPermission();
      alert(result === "granted" ? "Ogeysiisyada browser-ka waa la oggolaaday." : "Ogeysiisyada lama oggola.");
    } catch {
      alert("Ogeysiisyada lama diyaarin.");
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
      const data = await loadArr(key);
      const rows = Array.isArray(data) ? data.map(mapper) : [];
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
      const keys = await listKeys("attendance-");
      const all = [];
      for (const key of keys) {
        const rec = await loadObj(key, null);
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
      const existing = await loadArr("students-data");
      const list = Array.isArray(existing) ? existing : [];
      let added = 0;
      let updated = 0;
      const next = [...list];

      importRows.forEach((incoming) => {
        const byId = incoming.id ? next.findIndex((s) => String(s.id) === String(incoming.id)) : -1;
        const byContact = incoming.parentPhone
          ? next.findIndex((s) => s.name?.trim().toLowerCase() === incoming.name.trim().toLowerCase() && String(s.parentPhone || "").trim() === incoming.parentPhone.trim())
          : next.findIndex((s) => s.name?.trim().toLowerCase() === incoming.name.trim().toLowerCase());
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

      await saveArr("students-data", next);
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

  const persistAchievements = async (next) => { setAchievements(next); await saveArr("achievements-data", next); };

  const addAchievement = async (e) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.title.trim()) return;
    setSaving(true);
    const item = { id: Date.now(), studentName: form.studentName.trim(), title: form.title.trim(), type: form.type, date: form.date, note: form.note.trim(), createdAt: new Date().toISOString() };
    await persistAchievements([item, ...achievements]);
    setForm({ studentName: "", title: "", type: "Shahaado", date: todayISO(), note: "" });
    setSaving(false);
    setTab("achievements");
  };

  const removeAchievement = async (id) => { await persistAchievements(achievements.filter((a) => a.id !== id)); };

  const leaderboard = students.map((student) => {
    const rows = progress.filter((r) => r.studentName === student.name && typeof r.score === "number" && !Number.isNaN(r.score));
    const average = rows.length ? Math.round(rows.reduce((sum, r) => sum + Number(r.score), 0) / rows.length) : 0;
    const quranCount = quran.filter((r) => r.studentName === student.name).length;
    const awards = achievements.filter((a) => a.studentName === student.name).length;
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

      {tab === "form" && <form onSubmit={addAchievement} className="max-w-2xl mx-auto rounded-2xl border p-5" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}><h3 className="font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>Diiwaangeli Guul</h3><p className="text-xs mb-5" style={{ color: COLORS.inkSoft }}>Tusaale: Shahaado, Tartanka Qur'aanka, Akhlaaq, Imaansho wanaagsan.</p><div className="space-y-4"><select value={form.studentName} onChange={(e) => setForm((p) => ({ ...p, studentName: e.target.value }))} required className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}><option value="">Dooro arday...</option>{students.map((s) => <option key={s.id} value={s.name}>{s.name}{s.className ? ` — ${s.className}` : ""}</option>)}</select><input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Magaca guusha / shahaadada *" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /><div className="grid md:grid-cols-2 gap-3"><select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }}><option>Shahaado</option><option>Tartan</option><option>Qur'aan</option><option>Akhlaaq</option><option>Imaansho</option><option>Kale</option></select><input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line }} /></div><textarea value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} placeholder="Faallo (ikhtiyaari)" className="w-full rounded-lg border px-3 py-2.5 text-sm" style={{ borderColor: COLORS.line, minHeight: 90 }} /><button disabled={saving || !students.length} className="w-full rounded-lg py-3 text-sm font-semibold" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>{saving ? "Kaydinaya..." : "Kaydi Guusha"}</button>{!students.length && <p className="text-xs text-center" style={{ color: COLORS.inkSoft }}>Marka hore Ardayda ku dar arday.</p>}</div></form>}
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

export default function App() {
  const [session, setSession] = useState(null);
  const [isRecovery, setIsRecovery] = useState(false);
const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [tenantReady, setTenantReady] = useState(false);
  const [tenantError, setTenantError] = useState("");

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

useEffect(() => {
  let alive = true;
  if (!session?.user?.id) {
    setTenantReady(false);
    setRoleLoading(true);
    setCurrentRole(null);
    setTenantError("");
    setStorageTenant(null);
    return () => { alive = false; };
  }

  setTenantReady(false);
  setRoleLoading(true);
  setCurrentRole(null);
  setTenantError("");
  supabase.rpc("nibraas_bootstrap").then(({ data, error }) => {
    if (!alive) return;
    if (error || !data) {
      console.error("Tenant bootstrap error:", error);
      setTenantError(error?.message || "Tenant-ka NIBRAAS lama diyaarin.");
      return;
    }
    setStorageTenant(data);
    setTenantReady(true);
  });

  return () => { alive = false; };
}, [session]);

useEffect(() => {
  if (!session?.user?.id || !tenantReady) return;

  // Role-ka si toos ah uga akhri memberships-ka user-kan.
  // Tani waxay ka badbaado badan tahay in role-ka laga qiyaaso user-profiles.
  supabase
    .from("nibraas_memberships")
    .select("tenant_id, role")
    .eq("user_id", session.user.id)
    .eq("tenant_id", CURRENT_TENANT_ID)
    .maybeSingle()
    .then(({ data, error }) => {
      if (error) {
        console.error("Role load error:", error);
        setCurrentRole(null);
        setRoleLoading(false);
        return;
      }

      const role = data?.role;
      if (!USER_ROLES.includes(role)) {
        console.error("Invalid or missing NIBRAAS role:", role);
        setCurrentRole(null);
        setRoleLoading(false);
        return;
      }

      setCurrentRole(role);
      setRoleLoading(false);
    });
}, [session, tenantReady]);

useEffect(() => {
  if (!session?.user?.id || !tenantReady) return;

  loadArr("user-profiles").then((profiles) => {
    const profile = Array.isArray(profiles)
      ? profiles.find((u) => u.authUserId === session.user.id || u.email?.toLowerCase() === session.user.email?.toLowerCase())
      : null;
    // Display profile metadata only; authorization comes from nibraas_memberships.
  });
}, [session, tenantReady]);
// 1. Kaydinta xogta Ardayda
const [students, setStudents] = useState([]);
const [txns, setTxns] = useState([]);

const [studentsLoaded, setStudentsLoaded] = useState(false);
const [financeLoaded, setFinanceLoaded] = useState(false);

// Supabase ka soo akhri marka app-ku furmo
useEffect(() => {
  if (!session?.user?.id || !tenantReady) {
    setStudentsLoaded(false);
    setFinanceLoaded(false);
    return;
  }

  let cancelled = false;

  setStudentsLoaded(false);

  loadArrSafe("students-data").then((result) => {
    if (cancelled) return;

    if (!result.ok) {
      console.error(
        "Students load failed. Saving is paused to protect existing data:",
        result.error
      );

      setStudentsLoaded(false);
      return;
    }

    setStudents(
      Array.isArray(result.data) ? result.data : []
    );

    setStudentsLoaded(true);
  });

  loadArr("finance-data").then((data) => {
    if (cancelled) return;

    setTxns(Array.isArray(data) ? data : []);
    setFinanceLoaded(true);
  });

  return () => {
    cancelled = true;
  };
}, [session?.user?.id, tenantReady]);

// Ardayda kaydi kaliya marka xogta si guul leh loo soo akhriyey
useEffect(() => {
  if (
    session?.user?.id &&
    tenantReady &&
    studentsLoaded
  ) {
    saveArr("students-data", students);
  }
}, [students, studentsLoaded, session?.user?.id, tenantReady]);

// Maaliyadda kaydi
useEffect(() => {
  if (session?.user?.id && tenantReady && financeLoaded) {
    saveArr("finance-data", txns);
  }
}, [txns, financeLoaded, session, tenantReady]);
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
      @media (max-width: 768px) {
        .nibraas-mobile-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        table { min-width: 640px; }
        .nibraas-mobile-card { width: 100% !important; max-width: 100% !important; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  const [active, setActive] = useState("home");
  const [language, setLanguage] = useState(() => localStorage.getItem("nibraas-language") || "so");
  const [branches, setBranches] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("nibraas-branches") || "null");
      return Array.isArray(saved) && saved.length ? saved : [{ id: "main", name: "Laanta 1" }];
    } catch {
      return [{ id: "main", name: "Laanta 1" }];
    }
  });
  const [activeBranchId, setActiveBranchId] = useState(() => localStorage.getItem("nibraas-active-branch") || "main");
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [mobileTip, setMobileTip] = useState(() => localStorage.getItem("nibraas-mobile-tip") !== "hidden");
  const dismissMobileTip = () => {
    localStorage.setItem("nibraas-mobile-tip", "hidden");
    setMobileTip(false);
  };

  const [newBranchName, setNewBranchName] = useState("");

  const switchBranch = (nextId) => {
    if (!nextId) return;
    setStorageBranch(nextId);
    setActiveBranchId(nextId);
  };

  useEffect(() => {
    localStorage.setItem("nibraas-branches", JSON.stringify(branches));
  }, [branches]);

  useEffect(() => {
    localStorage.setItem("nibraas-active-branch", activeBranchId);
    setStorageBranch(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    if (!tenantReady) return;
    setBranchesLoaded(false);
    loadArr("branches-data").then((saved) => {
      if (Array.isArray(saved) && saved.length) {
        setBranches(saved);
        const savedActive = localStorage.getItem("nibraas-active-branch");
        const nextActive = savedActive && saved.some((b) => b.id === savedActive)
          ? savedActive
          : saved[0].id;
        setStorageBranch(nextActive);
        setActiveBranchId(nextActive);
      }
      setBranchesLoaded(true);
    });
  }, [tenantReady]);

  useEffect(() => {
    if (tenantReady && branchesLoaded && branches.length) saveArr("branches-data", branches);
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
  const [config, setConfig] = useState({ schoolName: "NIBRAAS", logoUrl: "", address: "", phone: "", email: "", currency: "$" });

  useEffect(() => {
    if (!session?.user?.id) return;

    loadObj("config-data", null).then((c) => {
      if (c) setConfig(c);
    });
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
    if (active === "users") return <UsersScreen />;
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

  if (!tenantReady || roleLoading || !currentRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}>
        <div className="max-w-md w-full rounded-2xl border p-6 text-center" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
          {tenantError ? (
            <>
              <p className="font-semibold mb-2" style={{ color: COLORS.brick }}>Amniga NIBRAAS lama diyaarin.</p>
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>{tenantError}</p>
              <p className="text-xs mt-3" style={{ color: COLORS.inkSoft }}>Ku orod SQL-ka v20 ee Supabase, kadibna dib u fur app-ka.</p>
            </>
          ) : (
            <p className="text-sm font-medium" style={{ color: COLORS.teal }}>NIBRAAS amnigiisa iyo doorkaaga waa la hubinayaa...</p>
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
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.gold }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: COLORS.tealDeep }}>N</span>
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
                <n.icon size={17} />
                {navLabel(n.id, n.label)}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5 relative">
          {showBranchManager && (
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
            <button
              type="button"
              onClick={() => setShowBranchManager((v) => !v)}
              className="rounded-lg border px-2 py-2 text-sm"
              style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff", fontFamily: BODY_FONT }}
            >
              {tr.branches}
            </button>
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
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="Logo" className="w-7 h-7 rounded-md object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ backgroundColor: COLORS.gold }}>
                <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 13, color: COLORS.tealDeep }}>N</span>
              </div>
            )}
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
                className="flex-1 flex flex-col items-center gap-1 py-2.5"
                style={{ color: isActive ? COLORS.teal : COLORS.inkSoft }}
              >
                <n.icon size={19} />
                <span className="text-[10px] font-medium" style={{ fontFamily: BODY_FONT }}>
                  {navLabel(n.id, n.label)}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5"
            style={{ color: moreOpen ? COLORS.teal : COLORS.inkSoft }}
          >
            <Grid3x3 size={19} />
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
              <div className="grid grid-cols-4 gap-4">
                {moreItems.map((n) => (
                  <button key={n.id} onClick={() => goTo(n.id)} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}
                    >
                      <n.icon size={20} style={{ color: COLORS.teal }} />
                    </div>
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
