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

    // Verify caller is systemadmin
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await userClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!roleData || roleData.role !== "systemadmin") {
      return new Response(JSON.stringify({ error: "Only systemadmin can view storage stats" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get database size
    const { data: dbSize, error: dbSizeError } = await adminClient.rpc('get_database_size' as any);
    
    // Get table sizes using a direct query approach
    // Since we can't run raw SQL via the JS client, we'll count rows per table
    const tables = [
      'profiles', 'user_roles', 'schools', 'classes', 'sections', 'subjects',
      'student_enrollments', 'teacher_assignments', 'attendance', 'fee_records',
      'fee_payment_receipts', 'homework', 'homework_submissions', 'exams',
      'exam_results', 'announcements', 'events', 'messages', 'notifications',
      'activity_logs', 'study_materials', 'timetable', 'ai_chat_history',
      'parent_students', 'system_settings'
    ];

    const tableStats = [];
    for (const table of tables) {
      const { count } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true });
      tableStats.push({ table, rows: count || 0 });
    }

    // Get total auth users count
    const { data: authUsers } = await adminClient.auth.admin.listUsers({ perPage: 1, page: 1 });
    const totalAuthUsers = authUsers?.users?.length !== undefined 
      ? (authUsers as any)?.total || authUsers?.users?.length 
      : 0;

    // Sort by row count descending
    tableStats.sort((a, b) => b.rows - a.rows);
    const totalRows = tableStats.reduce((sum, t) => sum + t.rows, 0);

    // Get storage bucket info
    const { data: buckets } = await adminClient.storage.listBuckets();

    return new Response(
      JSON.stringify({
        totalRows,
        totalAuthUsers,
        tableStats,
        storageBuckets: buckets || [],
        databaseSizeBytes: null, // Would need a DB function for exact size
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
