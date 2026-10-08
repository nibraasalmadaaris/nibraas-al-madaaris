import { createClient } from "npm:@supabase/supabase-js@2";

type Body = {
  tenant_id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
};

const allowedRoles = new Set([
  "Admin",
  "Maamule",
  "Macalin",
  "Xisaabiye",
  "Shaqaale",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Login ayaa loo baahan yahay." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const secretKey =
      secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Supabase secret key lama helin." }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Client-kan wuxuu aqoonsanayaa qofka hadda galay.
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")
        ? JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")!).default
        : Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } },
      },
    );

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Session-ka login-ka ma ansaxayo." }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, secretKey);

    const body = (await req.json()) as Body;
    const tenantId = body.tenant_id?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password || "";
    const role = body.role || "Macalin";

    if (!tenantId || !name || !email || !password) {
      return new Response(JSON.stringify({
        error: "Tenant, magaca, email-ka iyo password-ka waa loo baahan yahay.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({
        error: "Password-ku waa inuu ahaadaa ugu yaraan 6 xaraf.",
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!allowedRoles.has(role)) {
      return new Response(JSON.stringify({ error: "Role-ka la doortay ma ansaxayo." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Server-side authorization: qofka hadda galay waa inuu Admin ama Maamule
    // ka yahay tenant-kan. Tani waa xadka amniga; UI permission keliya kuma filna.
    const { data: membership, error: membershipCheckError } = await admin
      .from("nibraas_memberships")
      .select("role")
      .eq("tenant_id", tenantId)
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (membershipCheckError) {
      return new Response(JSON.stringify({ error: membershipCheckError.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!membership || !["Admin", "Maamule"].includes(membership.role)) {
      return new Response(JSON.stringify({
        error: "Kaliya Admin ama Maamule ayaa ku dari kara user cusub.",
      }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Haddii email-kan hore u jiray (tusaale user Dashboard-ka Supabase lagu sameeyey),
    // waxaan qaadaneynaa Auth account-kaas oo waxaan ku xireynaa NIBRAAS.
    let targetUserId: string | null = null;
    let existing = false;

    const { data: existingUserData } = await admin.auth.admin.getUserByEmail(email);
    if (existingUserData?.user) {
      targetUserId = existingUserData.user.id;
      existing = true;

      // Password-ka cusub waxaa lagu dejinayaa Auth account-kaas; secret-ku
      // waligiis browser-ka kuma jiro.
      const { error: updateError } = await admin.auth.admin.updateUserById(
        targetUserId,
        { password, email_confirm: true },
      );

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

      if (createError || !created.user) {
        return new Response(JSON.stringify({
          error: createError?.message || "User-ka lama abuuri karin.",
        }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      }

      targetUserId = created.user.id;
    }

    const { error: membershipError } = await admin
      .from("nibraas_memberships")
      .upsert(
        {
          tenant_id: tenantId,
          user_id: targetUserId,
          role,
        },
        { onConflict: "tenant_id,user_id" },
      );

    if (membershipError) {
      return new Response(JSON.stringify({
        error: membershipError.message,
      }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      user_id: targetUserId,
      existing,
      name,
      email,
      role,
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Server error",
    }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
