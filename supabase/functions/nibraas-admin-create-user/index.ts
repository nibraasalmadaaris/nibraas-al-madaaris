
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_ROLES = [
  "Admin",
  "Maamule",
  "Macalin",
  "Xisaabiye",
  "Shaqaale",
] as const;

type UserRole = (typeof USER_ROLES)[number];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

async function findUserByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
) {
  const target = normalizeEmail(email);
  const perPage = 1000;

  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw new Error("User-ka lama hubin karin.");
    }

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
    // 1. Hubi Authorization header.
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
      return json(
        { error: "Supabase server configuration is incomplete" },
        500,
      );
    }

    // 2. JWT-ga caller-ka ku xaqiiji Supabase Auth.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();

    if (callerError || !caller) {
      return json({ error: "Not authenticated" }, 401);
    }

    // 3. Service-role key-ga wuxuu ku shaqaynayaa server-ka oo keliya.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Akhri xogta request-ka.
    let body: Record<string, unknown>;

    try {
      body = await req.json();
    } catch {
      return json({ error: "Request body sax ma aha" }, 400);
    }

    const tenant_id = String(body?.tenant_id ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");
    const role = String(body?.role ?? "").trim();

    if (!tenant_id) {
      return json({ error: "tenant_id waa qasab" }, 400);
    }

    if (!name) {
      return json({ error: "Magaca waa qasab" }, 400);
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Email sax ah geli" }, 400);
    }

    if (password.length < 6) {
      return json(
        { error: "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf" },
        400,
      );
    }

    // 5. Role kasta oo aan NIBRAAS aqoonsanayn waa la diidayaa.
    if (!isValidRole(role)) {
      return json({ error: "Role-ka la doortay lama oggola" }, 400);
    }

    // 6. Hubi in caller-ku Admin/Maamule ka yahay tenant-kan.
    const { data: membership, error: membershipError } = await admin
      .from("nibraas_memberships")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", caller.id)
      .maybeSingle();

    if (membershipError) {
      console.error("Membership lookup failed:", membershipError);
      return json({ error: "Membership-ka lama xaqiijin karin" }, 500);
    }

    if (
      !membership ||
      !["Admin", "Maamule"].includes(membership.role)
    ) {
      return json(
        { error: "Uma lihid awood aad user ku abuurto" },
        403,
      );
    }

    // 7. Admin cusub waxaa abuuri kara Admin-ka hadda jira oo keliya.
    if (role === "Admin" && membership.role !== "Admin") {
      return json(
        { error: "Admin cusub waxaa abuuri kara Admin-ka hadda jira oo keliya." },
        403,
      );
    }

    // 8. Raadi user-ka email-kan leh.
    const existingUser = await findUserByEmail(admin, email);

    let userId: string;
    let existing = false;

    if (existingUser) {
      // User hore ayuu u jiray.
      // MUHIIM: password-kiisa lama beddelayo.
      // Email-kiisa dib looma xaqiijinayo.
      // user_metadata-giisa lama beddelayo.
      existing = true;
      userId = existingUser.id;
    } else {
      // 9. User cusub oo keliya ayaa Auth account loo abuurayaa.
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

      if (createError || !created.user) {
        console.error("Auth user creation failed:", createError);

        return json(
          { error: "User lama abuuri karin. Hubi xogta la geliyey." },
          400,
        );
      }

      userId = created.user.id;
    }

    // 10. Ku xiriiri user-ka tenant-ka iyo role-ka la xaqiijiyey.
    const { error: membershipUpsertError } = await admin
      .from("nibraas_memberships")
      .upsert(
        {
          tenant_id,
          user_id: userId,
          role,
        },
        {
          onConflict: "tenant_id,user_id",
        },
      );

    if (membershipUpsertError) {
      console.error(
        "Membership upsert failed:",
        membershipUpsertError,
      );

      return json(
        {
          error:
            "User-ka waa la helay/abuurey, laakiin tenant-ka laguma xiriirin karin.",
        },
        500,
      );
    }

    // 11. Jawaabta guusha.
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
      { error: "Khalad server-ka ah ayaa dhacay." },
      500,
    );
  }
});
