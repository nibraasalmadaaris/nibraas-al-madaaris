import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "./lib/supabase";
import {
  Home, Users, UserCog, GraduationCap, ClipboardCheck, CalendarClock,
  AlertCircle, TrendingUp, ClipboardList, Wallet, BarChart3, MessageSquare,
  Settings, Plus, Search, Trash2, Pencil, ArrowLeft, X, Check, ChevronRight,
  Grid3x3, Send, RotateCcw, Circle, LogOut, ShieldCheck
} from "lucide-react";

/* ---------------------------------------------------------
   ISNAAD — Nidaamka Maareynta Madrasada
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
    if (document.getElementById("isnaad-fonts")) return;
    const link = document.createElement("link");
    link.id = "isnaad-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}
const DISPLAY_FONT = "'Fraunces', serif";
const BODY_FONT = "'Manrope', sans-serif";

/* ---------- storage helpers ---------- */

async function loadObj(key, fallback) {
  try {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
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
  try {
    const { error } = await supabase
      .from("app_storage")
      .upsert(
        {
          key: key,
          value: obj,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "key",
        }
      );

    if (error) {
      console.error("Storage error:", error);
    }
  } catch (e) {
    console.error("Storage error:", e);
  }
}
async function saveArr(key, arr) {
  return saveObj(key, arr);
}
async function deleteKey(key) {
  const { error } = await supabase
    .from("app_storage")
    .delete()
    .eq("key", key);

  if (error) {
    console.error("Delete error:", error);
  }
}
async function listKeys(prefix) {
  const { data, error } = await supabase
    .from("app_storage")
    .select("key")
    .like("key", `${prefix}%`);

  if (error) {
    console.error("List error:", error);
    return [];
  }

  return data?.map((r) => r.key) ?? [];
}

async function loadArr(key) {
  return loadObj(key, []);
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
  Maamule: ["home", "students", "employees", "classes", "attendance", "activities", "complaints", "progress", "exams", "finance", "reports", "sms", "config"],
  Macalin: ["home", "students", "classes", "attendance", "activities", "progress", "exams", "reports"],
  Xisaabiye: ["home", "finance", "reports"],
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
      setError("Email-kan hore ayaa loogu daray Users-ka Isnaad.");
      return;
    }

    setSaving(true);
    const { data: current } = await supabase.auth.getSession();
    const adminSession = current.session;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message || "User-ka lama abuuri karin.");
      setSaving(false);
      return;
    }

    // Haddii Supabase uu si toos ah u geliyo user-ka cusub, dib ugu celi admin-ka.
    if (adminSession && data.session?.user?.id !== adminSession.user?.id) {
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
    }

    const profile = {
      id: crypto.randomUUID(),
      authUserId: data.user?.id || null,
      name,
      email,
      role: form.role,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, profile]);
    setForm({ name: "", email: "", password: "", role: "Macalin" });
    setMessage(
      data.user?.id
        ? "User-ka waa la abuuray oo Supabase Auth ayaa ku xiran."
        : "User-ka waa la sameeyay; email-ka xaqiiji haddii Supabase uu dalbado."
    );
    setSaving(false);
  };

  const removeUser = async (user) => {
    // Browser-ka lama siinayo service-role key, sidaas darteed Auth user-ka lama tirtiro halkan.
    // Waxaan kaliya ka saareynaa profile-ka maamulka.
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setMessage("Profile-ka waa laga saaray liiska. Auth account-ka waxaa laga maamulaa Supabase Auth.");
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
  { id: "activities", label: "Hawlaha", icon: CalendarClock },
  { id: "complaints", label: "Cabashooyinka", icon: AlertCircle },
  { id: "progress", label: "Horumarka", icon: TrendingUp },
  { id: "exams", label: "Imtixaannada", icon: ClipboardList },
  { id: "finance", label: "Maaliyadda", icon: Wallet },
  { id: "reports", label: "Warbixinno", icon: BarChart3 },
  { id: "sms", label: "Fariimaha SMS", icon: MessageSquare },
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
   SMS Screen
========================================================= */
function SmsScreen() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [to, setTo] = useState("Dhammaan Waalidiinta");
  const [customTo, setCustomTo] = useState("");
  const [message, setMessage] = useState("");
  const [sentFlash, setSentFlash] = useState(false);

  useEffect(() => {
    loadArr("sms-log").then((arr) => {
      setLog(arr);
      setLoading(false);
    });
  }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const recipient = to === "Qof Gaar ah" ? customTo || "Qof aan la magacaabin" : to;
    const entry = { id: Date.now(), to: recipient, message, sentAt: new Date().toISOString() };
    const next = [entry, ...log];
    setLog(next);
    await saveArr("sms-log", next);
    setMessage("");
    setCustomTo("");
    setSentFlash(true);
    setTimeout(() => setSentFlash(false), 2200);
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
        Fariimaha SMS
      </h2>
      <SignatureChain className="mb-4" />

      <form onSubmit={send} className="space-y-4 mb-8 rounded-xl border p-4" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Loo Diray
          </label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          >
            <option>Dhammaan Waalidiinta</option>
            <option>Shaqaalaha</option>
            <option>Qof Gaar ah</option>
          </select>
        </div>
        {to === "Qof Gaar ah" && (
          <input
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            placeholder="Magaca ama lambarka"
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, fontFamily: BODY_FONT }}
          />
        )}
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            Fariinta
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{ borderColor: COLORS.line, minHeight: 100, fontFamily: BODY_FONT }}
          />
          <p className="text-xs mt-1 text-right" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
            {message.length} xaraf
          </p>
        </div>
        <button
          type="submit"
          className="w-full rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2"
          style={{ backgroundColor: sentFlash ? COLORS.tealLight : COLORS.teal, color: COLORS.sand, fontFamily: BODY_FONT }}
        >
          <Send size={15} /> {sentFlash ? "La Diray!" : "Dir Fariinta"}
        </button>
      </form>

      <h3 className="text-sm font-bold mb-2" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
        Taariikhda Fariimaha
      </h3>
      {loading ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
          Soo dejinaya...
        </p>
      ) : log.length === 0 ? (
        <EmptyState icon={MessageSquare} text="Wali lama dirin fariin." />
      ) : (
        <div className="space-y-2">
          {log.map((l) => (
            <div key={l.id} className="rounded-xl border px-4 py-3" style={{ borderColor: COLORS.line, backgroundColor: "#fff" }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold" style={{ color: COLORS.tealLight, fontFamily: BODY_FONT }}>
                  {l.to}
                </p>
                <p className="text-xs" style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}>
                  {new Date(l.sentAt).toLocaleString("so-SO")}
                </p>
              </div>
              <p className="text-sm" style={{ color: COLORS.ink, fontFamily: BODY_FONT }}>
                {l.message}
              </p>
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
function ReportsScreen({ config }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      const [students, employees, complaints, finance, activities] =
        await Promise.all([
          loadArr("students-data"),
          loadArr("employees-data"),
          loadArr("complaints-data"),
          loadArr("finance-data"),
          loadArr("activities-data"),
        ]);

      let attKeys = [];
      try {
        attKeys = await listKeys("attendance-");
      } catch (e) {
        attKeys = [];
      }

      const recent = attKeys.slice(0, 14);
      const attRecords = await Promise.all(
        recent.map((k) => loadObj(k, null))
      );

      let present = 0;
      let total = 0;

      attRecords.filter(Boolean).forEach((r) => {
        (r.records || []).forEach((rec) => {
          total += 1;
          if (rec.status === "Joogto") present += 1;
        });
      });

      const attendanceRate =
        total > 0 ? Math.round((present / total) * 100) : null;

      const collected = finance
        .filter((t) => t.type === "Lacag La Bixiyay")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const due = finance
        .filter((t) => t.type === "Deyn")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const openComplaints = complaints.filter(
        (c) => c.status !== "La xaliyay"
      ).length;

      const upcoming = activities.filter(
        (a) => a.date && a.date >= todayISO()
      ).length;

      setStats({
        totalStudents: students.length,
        activeStudents: students.filter(
          (s) => s.status !== "Joojiyay"
        ).length,
        totalEmployees: employees.length,
        attendanceRate,
        collected,
        due,
        openComplaints,
        upcoming,
      });
    })();
  }, []);

  const printPDF = () => {
    if (!stats) return;

    const school = config.schoolName || "Isnaad";
    const currency = config.currency || "$";
    const today = new Date().toLocaleDateString("so-SO");

    const money = (value) =>
      `${currency} ${Number(value || 0).toLocaleString()}`;

    const html = `
      <!doctype html>
      <html lang="so">
      <head>
        <meta charset="UTF-8" />
        <title>Warbixinta - ${school}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            color: #1B2E2B;
          }

          h1 {
            color: #0B3D3A;
            margin-bottom: 5px;
          }

          h2 {
            color: #0B3D3A;
            margin-top: 30px;
          }

          .date {
            color: #5B6E69;
            margin-bottom: 30px;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }

          .card {
            border: 1px solid #DED4B8;
            border-radius: 10px;
            padding: 18px;
          }

          .label {
            color: #5B6E69;
            font-size: 13px;
          }

          .value {
            font-size: 24px;
            font-weight: bold;
            margin-top: 8px;
            color: #0B3D3A;
          }

          .footer {
            margin-top: 40px;
            padding-top: 15px;
            border-top: 1px solid #DED4B8;
            color: #5B6E69;
            font-size: 12px;
          }

          @media print {
            body {
              padding: 20px;
            }
          }
        </style>
      </head>

      <body>
        <h1>${school}</h1>
        <div class="date">Warbixin Guud — ${today}</div>

        <div class="grid">
          <div class="card">
            <div class="label">Ardayda Guud</div>
            <div class="value">${stats.totalStudents}</div>
          </div>

          <div class="card">
            <div class="label">Ardayda Firfircoon</div>
            <div class="value">${stats.activeStudents}</div>
          </div>

          <div class="card">
            <div class="label">Shaqaalaha</div>
            <div class="value">${stats.totalEmployees}</div>
          </div>

          <div class="card">
            <div class="label">Heerka Xaadirinta</div>
            <div class="value">
              ${
                stats.attendanceRate != null
                  ? `${stats.attendanceRate}%`
                  : "—"
              }
            </div>
          </div>

          <div class="card">
            <div class="label">Lacagta La Ururiyay</div>
            <div class="value">${money(stats.collected)}</div>
          </div>

          <div class="card">
            <div class="label">Deynta Haray</div>
            <div class="value">${money(stats.due)}</div>
          </div>

          <div class="card">
            <div class="label">Cabashooyin Furan</div>
            <div class="value">${stats.openComplaints}</div>
          </div>

          <div class="card">
            <div class="label">Hawlo Soo Socda</div>
            <div class="value">${stats.upcoming}</div>
          </div>
        </div>

        <div class="footer">
          Isnaad — Warbixin maamulka Madrasada
        </div>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");

    if (!win) {
      alert("Fadlan ogolow popup-ka browser-ka.");
      return;
    }

    win.document.open();
    win.document.write(html);
    win.document.close();

    setTimeout(() => {
      win.focus();
      win.print();
    }, 400);
  };

  if (!stats) {
    return (
      <p
        className="text-sm py-8 text-center"
        style={{ color: COLORS.inkSoft, fontFamily: BODY_FONT }}
      >
        Soo dejinaya...
      </p>
    );
  }

  const cards = [
    {
      label: "Ardayda Guud",
      value: stats.totalStudents,
      icon: Users,
    },
    {
      label: "Ardayda Firfircoon",
      value: stats.activeStudents,
      icon: Check,
    },
    {
      label: "Shaqaalaha",
      value: stats.totalEmployees,
      icon: UserCog,
    },
    {
      label: "Heerka Xaadirinta",
      value:
        stats.attendanceRate != null
          ? `${stats.attendanceRate}%`
          : "—",
      icon: ClipboardCheck,
    },
    {
      label: "Lacagta La Ururiyay",
      value: fmtMoney(stats.collected, config.currency),
      icon: Wallet,
    },
    {
      label: "Deynta Haray",
      value: fmtMoney(stats.due, config.currency),
      icon: AlertCircle,
    },
    {
      label: "Cabashooyin Furan",
      value: stats.openComplaints,
      icon: AlertCircle,
    },
    {
      label: "Hawlo Soo Socda",
      value: stats.upcoming,
      icon: CalendarClock,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          <h2
            className="text-xl font-semibold"
            style={{
              fontFamily: DISPLAY_FONT,
              color: COLORS.ink,
            }}
          >
            Warbixinno Guud
          </h2>
        </div>

        <button
          onClick={printPDF}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: COLORS.teal,
            color: COLORS.sand,
            fontFamily: BODY_FONT,
          }}
        >
          🖨️ Daabac PDF
        </button>
      </div>

      <SignatureChain className="mb-5" />

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border p-4"
            style={{
              borderColor: COLORS.line,
              backgroundColor: "#fff",
            }}
          >
            <c.icon
              size={18}
              style={{ color: COLORS.gold }}
            />

            <p
              className="text-lg font-bold mt-2"
              style={{
                color: COLORS.ink,
                fontFamily: DISPLAY_FONT,
              }}
            >
              {c.value}
            </p>

            <p
              className="text-xs mt-0.5"
              style={{
                color: COLORS.inkSoft,
                fontFamily: BODY_FONT,
              }}
            >
              {c.label}
            </p>
          </div>
        ))}
      </div>
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
      .select("key, value, updated_at, created_at");

    if (error) throw error;

    const backup = {
      app: "Isnaad",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: data || [],
    };

    const blob = new Blob(
      [JSON.stringify(backup, null, 2)],
      { type: "application/json" }
    );

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

    if (
      backup?.app !== "Isnaad" ||
      !Array.isArray(backup?.data)
    ) {
      throw new Error("Backup file aan sax ahayn.");
    }

    for (const row of backup.data) {
      if (!row?.key) continue;

      const { error } = await supabase
        .from("app_storage")
        .upsert(
          {
            key: row.key,
            value: row.value,
            updated_at:
              row.updated_at || new Date().toISOString(),
            created_at:
              row.created_at || new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      if (error) throw error;
    }

    alert("Restore waa lagu guuleystay. Isnaad waa dib loo furayaa.");
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
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: COLORS.tealDeep }}>I</span>
            </div>
          )}
          <div>
            <p className="font-semibold" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>{form.schoolName || "Isnaad"}</p>
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
  );
}

/* =========================================================
   Home / Dashboard Screen
========================================================= */
function HomeScreen({ config, goTo }) {
  const [stats, setStats] = useState({
    students: 0,
    activeStudents: 0,
    employees: 0,
    presentToday: null,
    collected: 0,
    due: 0,
    complaints: 0,
    upcoming: 0,
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    try {
      const [students, employees, finance, complaints, activities] = await Promise.all([
        loadArr("students-data"),
        loadArr("employees-data"),
        loadArr("finance-data"),
        loadArr("complaints-data"),
        loadArr("activities-data"),
      ]);

      const today = todayISO();
      let attKeys = [];
      try {
        attKeys = await listKeys(`attendance-${today}`);
      } catch (e) {
        attKeys = [];
      }

      let present = 0;
      let total = 0;
      const recs = await Promise.all(attKeys.map((k) => loadObj(k, null)));
      recs.filter(Boolean).forEach((r) => {
        (r.records || []).forEach((rec) => {
          total += 1;
          if (rec.status === "Joogto") present += 1;
        });
      });

      const collected = finance
        .filter((t) => t.type === "Lacag La Bixiyay")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const due = finance
        .filter((t) => t.type === "Deyn")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const openComplaints = complaints.filter((c) => c.status !== "La xaliyay").length;
      const upcomingActivities = activities
        .filter((a) => a.date && a.date >= today)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));

      setStats({
        students: students.length,
        activeStudents: students.filter((s) => s.status !== "Joojiyay").length,
        employees: employees.length,
        presentToday: total > 0 ? Math.round((present / total) * 100) : null,
        collected,
        due,
        complaints: openComplaints,
        upcoming: upcomingActivities.length,
        recentActivities: upcomingActivities.slice(0, 4),
      });
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

  const quick = NAV.filter((n) => n.id !== "home" && canAccess(currentRole, n.id));
  const cards = [
    { label: "Ardayda Guud", value: stats.students, icon: Users, tone: "teal" },
    { label: "Ardayda Firfircoon", value: stats.activeStudents, icon: Check, tone: "gold" },
    { label: "Shaqaalaha", value: stats.employees, icon: UserCog, tone: "light" },
    { label: "Xaadirinta Maanta", value: stats.presentToday != null ? `${stats.presentToday}%` : "—", icon: ClipboardCheck, tone: "tealLight" },
    { label: "Lacagta La Ururiyay", value: fmtMoney(stats.collected, config.currency), icon: Wallet, tone: "light" },
    { label: "Deynta Haray", value: fmtMoney(stats.due, config.currency), icon: AlertCircle, tone: "brick" },
    { label: "Cabashooyin Furan", value: stats.complaints, icon: MessageSquare, tone: "light" },
    { label: "Hawlo Soo Socda", value: stats.upcoming, icon: CalendarClock, tone: "light" },
  ];

  const toneStyle = (tone) => {
    if (tone === "teal") return { backgroundColor: COLORS.teal, color: "#fff", icon: COLORS.gold, sub: COLORS.goldSoft };
    if (tone === "tealLight") return { backgroundColor: COLORS.tealLight, color: "#fff", icon: COLORS.gold, sub: COLORS.goldSoft };
    if (tone === "gold") return { backgroundColor: COLORS.goldSoft, color: COLORS.ink, icon: COLORS.teal, sub: COLORS.inkSoft };
    if (tone === "brick") return { backgroundColor: "#F8ECE8", color: COLORS.ink, icon: COLORS.brick, sub: COLORS.inkSoft };
    return { backgroundColor: "#fff", color: COLORS.ink, icon: COLORS.tealLight, sub: COLORS.inkSoft };
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-7">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: COLORS.gold, fontFamily: BODY_FONT }}>
            Dashboard-ka Isnaad
          </p>
          <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: DISPLAY_FONT, color: COLORS.ink }}>
            {config.schoolName || "Isnaad"}
          </h1>
          <p className="text-sm" style={{ color: COLORS.inkSoft }}>
            Dulmar guud oo ku saabsan xaaladda madrasada maanta.
          </p>
        </div>
        <button
          onClick={refreshDashboard}
          className="self-start md:self-auto rounded-lg px-4 py-2.5 text-sm font-semibold transition"
          style={{ backgroundColor: COLORS.teal, color: "#fff" }}
        >
          {loading ? "Soo dejinaya..." : "Cusboonaysii"}
        </button>
      </div>

      <SignatureChain className="mb-7" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {cards.map((card) => {
          const tone = toneStyle(card.tone);
          return (
            <div key={card.label} className="rounded-2xl p-4" style={{ backgroundColor: tone.backgroundColor, border: `1px solid ${card.tone === "light" ? COLORS.line : "transparent"}` }}>
              <div className="flex items-center justify-between gap-2">
                <card.icon size={18} style={{ color: tone.icon }} />
                {card.label === "Xaadirinta Maanta" && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.gold }} />}
              </div>
              <p className="text-2xl font-bold mt-3 truncate" style={{ color: tone.color, fontFamily: DISPLAY_FONT }}>
                {card.value}
              </p>
              <p className="text-xs mt-1" style={{ color: tone.sub }}>
                {card.label}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-5 mb-8">
        <section className="rounded-2xl p-5" style={{ backgroundColor: "#fff", border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Jadwal</p>
              <h2 className="text-lg font-semibold mt-1" style={{ color: COLORS.ink, fontFamily: DISPLAY_FONT }}>Hawlaha soo socda</h2>
            </div>
            {canAccess(currentRole, "activities") && (
              <button onClick={() => goTo("activities")} className="text-xs font-semibold" style={{ color: COLORS.teal }}>Eeg dhammaan</button>
            )}
          </div>
          {stats.recentActivities.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: COLORS.inkSoft }}>Ma jiraan hawlo soo socda.</p>
          ) : (
            <div className="space-y-2">
              {stats.recentActivities.map((activity, index) => (
                <div key={activity.id || `${activity.title}-${index}`} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ backgroundColor: COLORS.sand }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: COLORS.goldSoft }}>
                    <CalendarClock size={18} style={{ color: COLORS.teal }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: COLORS.ink }}>{activity.title || "Hawl"}</p>
                    <p className="text-xs mt-0.5" style={{ color: COLORS.inkSoft }}>
                      {[fmtDate(activity.date), activity.location].filter(Boolean).join(" · ") || "Taariikh lama gelin"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl p-5" style={{ backgroundColor: COLORS.teal, color: "#fff" }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: COLORS.gold }}>Falcelin degdeg ah</p>
          <h2 className="text-lg font-semibold mt-1 mb-4" style={{ fontFamily: DISPLAY_FONT }}>Qaybaha muhiimka ah</h2>
          <div className="grid grid-cols-2 gap-2">
            {quick.slice(0, 6).map((n) => (
              <button key={n.id} onClick={() => goTo(n.id)} className="rounded-xl p-3 text-left transition" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                <n.icon size={17} style={{ color: COLORS.gold }} />
                <span className="block text-xs mt-2" style={{ color: "#fff" }}>{n.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: COLORS.inkSoft }}>
        Dhammaan Qaybaha
      </p>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
        {quick.map((n) => (
          <button key={n.id} onClick={() => goTo(n.id)} className="flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: COLORS.sandDeep, border: `1px solid ${COLORS.line}` }}>
              <n.icon size={20} style={{ color: COLORS.teal }} />
            </div>
            <span className="text-[11px] text-center leading-tight" style={{ color: COLORS.ink }}>{n.label}</span>
          </button>
        ))}
      </div>
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
           Gal NIBRAAS AL-MADAARIS
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
export default function App() {
  const [session, setSession] = useState(null);
const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState("Admin");

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
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

useEffect(() => {
  if (!session?.user?.id) return;

  loadArr("user-profiles").then((profiles) => {
    const profile = Array.isArray(profiles)
      ? profiles.find((u) => u.authUserId === session.user.id || u.email?.toLowerCase() === session.user.email?.toLowerCase())
      : null;
    setCurrentRole(profile?.role || "Admin");
  });
}, [session]);
// 1. Kaydinta xogta Ardayda
const [students, setStudents] = useState([]);
const [txns, setTxns] = useState([]);

const [studentsLoaded, setStudentsLoaded] = useState(false);
const [financeLoaded, setFinanceLoaded] = useState(false);

// Supabase ka soo akhri marka app-ku furmo
useEffect(() => {
  loadArr("students-data").then((data) => {
    setStudents(Array.isArray(data) ? data : []);
    setStudentsLoaded(true);
  });

  loadArr("finance-data").then((data) => {
    setTxns(Array.isArray(data) ? data : []);
    setFinanceLoaded(true);
  });
}, []);

// Ardayda kaydi
useEffect(() => {
  if (studentsLoaded) {
    saveArr("students-data", students);
  }
}, [students, studentsLoaded]);

// Maaliyadda kaydi
useEffect(() => {
  if (financeLoaded) {
    saveArr("finance-data", txns);
  }
}, [txns, financeLoaded]);
  useBrandFonts();
  const [active, setActive] = useState("home");
  const [moreOpen, setMoreOpen] = useState(false);
  const [config, setConfig] = useState({ schoolName: "Isnaad", logoUrl: "", address: "", phone: "", email: "", currency: "$" });

  useEffect(() => {
    loadObj("config-data", null).then((c) => {
      if (c) setConfig(c);
    });
  }, []);

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
    if (active === "home") return <HomeScreen config={config} goTo={goTo} currentRole={currentRole} />;
    if (active === "attendance") return <AttendanceScreen />;
    if (active === "finance") return <FinanceScreen config={config} />;
    if (active === "sms") return <SmsScreen />;
    if (active === "users") return <UsersScreen />;
    if (active === "reports") return <ReportsScreen config={config} />;
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
          ISNAAD waa soo furmayaa...
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: COLORS.sand, fontFamily: BODY_FONT }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0" style={{ backgroundColor: COLORS.tealDeep }}>
        <div className="px-6 py-6 flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.gold }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, color: COLORS.tealDeep }}>I</span>
          </div>
          <div>
            <span className="text-lg font-semibold block" style={{ fontFamily: DISPLAY_FONT, color: "#fff" }}>
              Isnaad
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
                {n.label}
              </button>
            );
          })}
        </nav>

        <div className="px-3 pb-5">
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition"
            style={{ color: "rgba(247,243,234,0.75)" }}
          >
            <LogOut size={17} />
            Ka Bax
          </button>
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
                <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 13, color: COLORS.tealDeep }}>I</span>
              </div>
            )}
            <span className="text-base font-semibold" style={{ fontFamily: DISPLAY_FONT, color: "#fff" }}>
              {config.schoolName || "Isnaad"}
            </span>
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="p-2 rounded-lg"
            aria-label="Ka Bax"
            title="Ka Bax"
          >
            <LogOut size={18} style={{ color: "#fff" }} />
          </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-10 md:py-10 pb-24 md:pb-10 overflow-y-auto">{renderScreen()}</main>

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
                  {n.label}
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
                      {n.label}
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
