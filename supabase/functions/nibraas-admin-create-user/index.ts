import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* ---------------------------------------------------------------------------
   nibraas-admin-create-user  (hardened)

   What it does: an Admin or Maamule of a tenant creates a staff login and links
   it to that tenant with a role.

   Rules enforced on the server (the browser UI is only a convenience):
   - The caller must be signed in and be Admin/Maamule of the requested tenant.
   - Role must be one of ALLOWED_ROLES. A Maamule can only grant the low roles.
   - An existing Auth account is NEVER given a new password or new metadata here.
   - An existing account is only linked when it belongs to no other school (or is
     already a member of this one). Accounts of other schools are refused.
   - Nobody can change their own membership through this function.
   - Optional env ALLOWED_ORIGINS="https://your-app.vercel.app,https://your-domain"
     restricts CORS. If it is not set, any origin is accepted (the old behaviour).
--------------------------------------------------------------------------- */

const ALLOWED_ROLES = ["Admin", "Maamule", "Macalin", "Xisaabiye", "Shaqaale"] as const;
const MAAMULE_CAN_GRANT = ["Macalin", "Xisaabiye", "Shaqaale"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72; // bcrypt limit used by Supabase Auth

function corsFor(req: Request): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (configured.length === 0) return { ...base, "Access-Control-Allow-Origin": "*" };
  const origin = req.headers.get("Origin") ?? "";
  return configured.includes(origin) ? { ...base, "Access-Control-Allow-Origin": origin } : base;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const target = normalizeEmail(email);
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u) => normalizeEmail(u.email ?? "") === target);
    if (found) return found;
    if (users.length < perPage) return null;
  }
}

function isEmailExistsError(err: { code?: string; status?: number; message?: string } | null) {
  if (!err) return false;
  return err.code === "email_exists" ||
    (err.status === 422 && /already|registered|exists/i.test(err.message ?? ""));
}

serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      console.error("nibraas-admin-create-user: server configuration is incomplete");
      return json({ error: "Server configuration is incomplete" }, 500);
    }

    // 1) Who is calling? Verify the JWT with the normal user-facing client.
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    if (callerError || !caller) return json({ error: "Not authenticated" }, 401);

    // The service-role key is used only inside this function.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2) Read and validate the request.
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Request-ku ma aha JSON sax ah" }, 400);
    }
    const tenant_id = String(body?.tenant_id ?? "").trim();
    const name = String(body?.name ?? "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");
    const role = String(body?.role ?? "").trim();

    if (!UUID_RE.test(tenant_id)) return json({ error: "tenant_id ma saxna" }, 400);
    if (!name || name.length > 120) return json({ error: "Magaca waa qasab (ugu badnaan 120 xaraf)" }, 400);
    if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Email sax ah geli" }, 400);
    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      return json({ error: `Password-ku waa inuu ahaadaa ${MIN_PASSWORD} ilaa ${MAX_PASSWORD} xaraf` }, 400);
    }
    if (!(ALLOWED_ROLES as readonly string[]).includes(role)) {
      return json({ error: "Role-kan lama oggola" }, 400);
    }

    // 3) Is the caller allowed to manage users of this tenant?
    const { data: callerMembership, error: callerMembershipError } = await admin
      .from("nibraas_memberships").select("role")
      .eq("tenant_id", tenant_id).eq("user_id", caller.id).maybeSingle();
    if (callerMembershipError) {
      console.error("caller membership lookup failed:", callerMembershipError);
      return json({ error: "Server error" }, 500);
    }
    const callerRole = callerMembership?.role as string | undefined;
    if (!callerRole || !["Admin", "Maamule"].includes(callerRole)) {
      return json({ error: "Uma lihid awood aad user ku abuurto" }, 403);
    }
    // A Maamule must not be able to create or promote anyone to Admin/Maamule.
    if (callerRole === "Maamule" && !MAAMULE_CAN_GRANT.includes(role)) {
      return json({ error: "Maamule wuxuu abuuri karaa kaliya Macalin, Xisaabiye ama Shaqaale" }, 403);
    }

    // 4) Create the account. If the email is already registered we do NOT touch it.
    let userId: string;
    let existing = false;
    let createdNow = false;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { name },
    });

    if (!createError && created?.user) {
      userId = created.user.id;
      createdNow = true;
    } else if (isEmailExistsError(createError)) {
      const existingUser = await findUserByEmail(admin, email);
      if (!existingUser) return json({ error: "Email-kan lama isticmaali karo" }, 409);
      userId = existingUser.id;
      existing = true;

      if (userId === caller.id) {
        return json({ error: "Akoonkaaga halkan kama beddeli kartid" }, 400);
      }

      const { data: theirMemberships, error: theirError } = await admin
        .from("nibraas_memberships").select("tenant_id, role").eq("user_id", userId);
      if (theirError) {
        console.error("membership lookup failed:", theirError);
        return json({ error: "Server error" }, 500);
      }
      const rows = (theirMemberships ?? []) as { tenant_id: string; role: string }[];
      if (rows.some((m) => m.tenant_id !== tenant_id)) {
        return json({ error: "Email-kan horey ayaa loogu isticmaalay madrasad kale. Isticmaal email kale." }, 409);
      }
      const here = rows.find((m) => m.tenant_id === tenant_id);
      if (here && callerRole === "Maamule" && !MAAMULE_CAN_GRANT.includes(here.role)) {
        return json({ error: "Maamule ma beddeli karo Admin ama Maamule" }, 403);
      }
      // Password and metadata of the existing account are deliberately left alone.
    } else {
      console.error("createUser failed:", createError);
      return json({ error: createError?.message ?? "User lama abuuri karin" }, 400);
    }

    // 5) Link the account to this tenant.
    const membershipWrite = createdNow
      ? admin.from("nibraas_memberships").insert({ tenant_id, user_id: userId, role })
      : admin.from("nibraas_memberships").upsert({ tenant_id, user_id: userId, role }, { onConflict: "tenant_id,user_id" });
    const { error: membershipWriteError } = await membershipWrite;

    if (membershipWriteError) {
      console.error("membership write failed:", membershipWriteError);
      if (createdNow) {
        // Do not leave an orphan login behind.
        const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
        if (cleanupError) console.error("cleanup deleteUser failed:", cleanupError);
      }
      return json({ error: "User-ka lama xidhi karo madrasadda" }, 500);
    }

    return json({ ok: true, user_id: userId, existing, name, email, role });
  } catch (error) {
    console.error("nibraas-admin-create-user error:", error);
    return json({ error: "Server error" }, 500);
  }
});
