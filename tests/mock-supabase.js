// Controllable in-memory Supabase mock for tests (NOT part of the product).
const M = (window.__mock = window.__mock || {
  rows: new Map(),           // key -> {key,tenant_id,branch_id,value}
  memberships: [],           // {tenant_id,user_id,role}
  calls: { bootstrap: 0, membership: 0, role: 0, storageReads: 0, storageWrites: 0 },
  offline: false, failRpc: null, failMembership: null, failStorageRead: null, failStorageWrite: null,
  session: null, listeners: [], bootstrapTenant: "T1", tenantSeq: 0,
});
const netErr = () => ({ message: "TypeError: Failed to fetch", status: 0 });
function builder(table) {
  const q = { table, op: "select", filters: [], payload: null, single: false, lim: null };
  const api = {
    select() { return api; }, order() { return api; },
    range(a, b) { q.range = [a, b]; return api; },
    limit(n) { q.lim = n; return api; },
    eq(c, v) { q.filters.push(["eq", c, v]); return api; },
    gte(c, v) { q.filters.push(["gte", c, v]); return api; },
    lt(c, v) { q.filters.push(["lt", c, v]); return api; },
    maybeSingle() { q.single = true; return api; },
    upsert(p) { q.op = "upsert"; q.payload = p; return api; },
    insert(p) { q.op = "insert"; q.payload = p; return api; },
    delete() { q.op = "delete"; return api; },
    then(res, rej) { return run(q).then(res, rej); },
  };
  return api;
}
async function run(q) {
  await new Promise((r) => setTimeout(r, 5));
  if (M.offline) return { data: null, error: netErr() };
  const match = (row) => q.filters.every(([op, c, v]) => op === "eq" ? row[c] === v : op === "gte" ? row[c] >= v : row[c] < v);
  if (q.table === "nibraas_memberships") {
    M.calls.membership++;
    if (M.failMembership) { const e = M.failMembership; if (e.once) M.failMembership = null; return { data: null, error: e.err }; }
    let d = M.memberships.filter(match);
    if (q.lim) d = d.slice(0, q.lim);
    if (q.filters.some((f) => f[1] === "tenant_id")) M.calls.role++;
    return { data: q.single ? (d[0] || null) : d, error: null };
  }
  if (q.table === "app_storage") {
    if (q.op === "select") {
      M.calls.storageReads++;
      if (M.failStorageRead) return { data: null, error: M.failStorageRead };
      let d = [...M.rows.values()].filter(match).sort((a, b) => a.key < b.key ? -1 : 1);
      if (q.range) d = d.slice(q.range[0], q.range[1] + 1);
      return { data: q.single ? (d[0] || null) : d, error: null };
    }
    if (q.op === "upsert") {
      M.calls.storageWrites++;
      if (M.failStorageWrite) return { data: null, error: M.failStorageWrite };
      (Array.isArray(q.payload) ? q.payload : [q.payload]).forEach((r) => M.rows.set(r.key, { ...r }));
      return { data: null, error: null };
    }
    if (q.op === "delete") { for (const r of [...M.rows.values()]) if (match(r)) M.rows.delete(r.key); return { data: null, error: null }; }
  }
  return { data: q.single ? null : [], error: null };
}
export const supabase = {
  from: (t) => builder(t),
  rpc: async function (name) {
    await new Promise((r) => setTimeout(r, 5));
    if (M.offline) return { data: null, error: netErr() };
    if (name === "nibraas_register_tenant") {
      const u = M.session?.user?.id;
      const exists = M.memberships.find((m) => m.user_id === u);
      if (exists) return { data: exists.tenant_id, error: null };
      const tid = "TN" + (++M.tenantSeq);
      M.memberships.push({ tenant_id: tid, user_id: u, role: "Admin" });
      M.registered = (M.registered || []).concat([{ tid, name: arguments[1]?.p_name }]);
      return { data: tid, error: null };
    }
    if (name === "nibraas_bootstrap") {
      M.calls.bootstrap++;
      if (M.failRpc) { const e = M.failRpc; if (e.once) M.failRpc = null; return { data: null, error: e.err }; }
      const u = M.session?.user?.id;
      const mem = M.memberships.find((m) => m.user_id === u);
      if (!mem) return { data: null, error: { message: "not a member", code: "P0001", status: 400 } };
      return { data: mem.tenant_id, error: null };
    }
    return { data: null, error: { message: "unknown rpc " + name } };
  },
  functions: { invoke: async () => ({ data: null, error: { message: "mock" } }) },
  auth: {
    getSession: async () => ({ data: { session: M.session } }),
    onAuthStateChange: (cb) => { M.listeners.push(cb); return { data: { subscription: { unsubscribe() { M.listeners = M.listeners.filter((x) => x !== cb); } } } }; },
    signOut: async () => { M.session = null; M.listeners.forEach((l) => l("SIGNED_OUT", null)); return { error: null }; },
    signInWithPassword: async () => ({ error: null }), signUp: async (args) => {
      M.lastSignUp = args;
      const id = "user-" + args.email;
      const session = { access_token: "tok", user: { id, email: args.email, user_metadata: args.options?.data || {} } };
      setTimeout(() => M.emit("SIGNED_IN", session), 20);
      return { data: { session }, error: null };
    },
    resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null }),
  },
};
// test driver
M.emit = (event, session) => { M.session = session; M.listeners.forEach((l) => l(event, session)); };
M.mkSession = (id, token) => ({ access_token: token, user: { id, email: id + "@x.test", user_metadata: {} } });
