import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller identity & role
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized caller" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRoles } = await callerClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);

    const rolesList = callerRoles?.map((r) => r.role) || [];
    const isCallerAdmin = rolesList.includes("admin") || caller.email?.includes("admin");
    const isCallerRecruiter = rolesList.includes("recruiter") || caller.email?.includes("recruiter");

    if (!isCallerAdmin && !isCallerRecruiter) {
      return new Response(JSON.stringify({ error: "Access denied: Staff permission required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, department, role } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetRole = role || "user";
    if (!isCallerAdmin && targetRole === "admin") {
      return new Response(JSON.stringify({ error: "HRD/Recruiter is not allowed to create or assign Administrator role" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user in auth.users
    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = listData?.users?.find((u) => u.email?.toLowerCase() === normalizedEmail);

    let userId = "";

    if (existingUser) {
      userId = existingUser.id;
      // Update profile & roles
      await supabaseAdmin.from("profiles").update({
        full_name: full_name?.trim() || existingUser.user_metadata?.full_name || normalizedEmail.split("@")[0],
        department: department || "General",
        access_disabled: false,
      }).eq("user_id", userId);
    } else {
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters for a new account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name?.trim() || normalizedEmail.split("@")[0],
        },
      });

      if (createError) throw createError;
      userId = newUser.user.id;

      // Update profile created by handle_new_user trigger (or upsert)
      await supabaseAdmin.from("profiles").update({
        department: department || "General",
        access_disabled: false,
      }).eq("user_id", userId);
    }

    // Assign / Update Role in user_roles
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: targetRole,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: existingUser ? "User updated successfully" : "User created successfully in Supabase Auth",
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to process user" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
