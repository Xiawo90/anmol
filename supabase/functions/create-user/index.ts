import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: callerUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerRole } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    if (!callerRole || !["systemadmin", "admin"].includes(callerRole.role)) {
      return new Response(JSON.stringify({ error: "Only systemadmin and admin can create users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, password, full_name, role, phone, roll_number, class_id, school_id, teacher_code } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate teacher_code for teacher role
    if (role === "teacher") {
      if (!teacher_code || !/^\d{5}$/.test(teacher_code)) {
        return new Response(JSON.stringify({ error: "Teacher code must be a 5-digit number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (callerRole.role === "admin" && !["teacher", "student", "parent", "accountant"].includes(role)) {
      return new Response(JSON.stringify({ error: "Admin can only create teacher, student, parent, and accountant accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (callerRole.role === "systemadmin" && !["admin", "systemadmin", "admindirector"].includes(role)) {
      return new Response(JSON.stringify({ error: "System Admin can only create admin, admindirector, and systemadmin accounts" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if teacher_code is unique
    if (role === "teacher" && teacher_code) {
      const { data: existing } = await adminClient
        .from("profiles")
        .select("id")
        .eq("teacher_code", teacher_code)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ error: "Teacher code already in use. Please choose a different code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      return new Response(JSON.stringify({ error: "User created but role assignment failed: " + roleError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine school_id: use provided one (systemadmin creating admin) or caller's school
    let assignedSchoolId = school_id || null;
    if (!assignedSchoolId && callerRole.role === "admin") {
      const { data: callerProfile } = await adminClient
        .from("profiles")
        .select("school_id")
        .eq("user_id", callerUser.id)
        .maybeSingle();
      assignedSchoolId = callerProfile?.school_id || null;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: newUser.user.id,
        email: newUser.user.email || email,
        full_name,
        approval_status: "approved",
        is_active: true,
        phone: phone || null,
        school_id: assignedSchoolId,
        teacher_code: role === "teacher" ? teacher_code : null,
      }, { onConflict: "user_id" });

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // If student and roll_number or class_id provided, create enrollment
    if (role === "student" && class_id) {
      const { error: enrollError } = await adminClient
        .from("student_enrollments")
        .insert({
          student_id: newUser.user.id,
          class_id,
          roll_number: roll_number || null,
          academic_year: new Date().getFullYear().toString(),
          school_id: assignedSchoolId,
        });

      if (enrollError) {
        console.error("Enrollment error:", enrollError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: newUser.user.email },
        message: `User ${full_name} created successfully with role: ${role}`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
