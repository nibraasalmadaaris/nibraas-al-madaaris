import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  const target = normalizeEmail(email);
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find(
      (user) => normalizeEmail(user.email ?? "") === target,
    );

    if (found) return found;
    if (users.length < perPage) return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase server configuration is incomplete" }, 500);
    }

    // Verify the caller's JWT using the normal user-facing client.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Not authenticated" }, 401);
    }

    // The service-role/secret key is used only inside this server function.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();
    const tenant_id = String(body?.tenant_id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");
    const role = String(body?.role ?? "").trim();

    if (!tenant_id) return json({ error: "tenant_id waa qasab" }, 400);
    if (!name) return json({ error: "Magaca waa qasab" }, 400);
    if (!email || !email.includes("@")) {
      return json({ error: "Email sax ah geli" }, 400);
    }
    if (password.length < 6) {
      return json({ error: "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf" }, 400);
    }
    if (!role) return json({ error: "Role-ka waa qasab" }, 400);

    // Only Admin/Maamule can create or link users for this tenant.
    const { data: membership, error: membershipError } = await admin
      .from("nibraas_memberships")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (membershipError) {
      return json({ error: membershipError.message }, 500);
    }

    if (!membership || !["Admin", "Maamule"].includes(membership.role)) {
      return json({ error: "Uma lihid awood aad user ku abuurto" }, 403);
    }

    // Supabase JS does not provide auth.admin.getUserByEmail().
    // We use the supported paginated listUsers() API and compare emails.
    const existingUser = await findUserByEmail(admin, email);

    let userId: string;
    let existing = false;

    if (existingUser) {
      existing = true;
      userId = existingUser.id;

      const { error: updateError } = await admin.auth.admin.updateUserById(
        userId,
        {
          password,
          email_confirm: true,
          user_metadata: {
            ...(existingUser.user_metadata ?? {}),
            name,
          },
        },
      );

      if (updateError) {
        return json({ error: updateError.message }, 400);
      }
    } else {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

      if (createError || !created.user) {
        return json(
          { error: createError?.message ?? "User lama abuuri karin" },
          400,
        );
      }

      userId = created.user.id;
    }

    // Link the Auth user to this NIBRAAS tenant/role.
    const { error: membershipUpsertError } = await admin
      .from("nibraas_memberships")
      .upsert(
        {
          tenant_id,
          user_id: userId,
          role,
        },
        { onConflict: "tenant_id,user_id" },
      );

    if (membershipUpsertError) {
      return json({ error: membershipUpsertError.message }, 500);
    }

    return json({
      ok: true,
      user_id: userId,
      existing,
      name,
      email,
      role,
    });
  } catch (error) {
    console.error("nibraas-admin-create-user error:", error);
    return json(
      {
        error: error instanceof Error ? error.message : "Server error",
      },
      500,
    );
  }
});
