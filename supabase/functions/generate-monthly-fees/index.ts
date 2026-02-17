import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get all the latest fee record per student (most recent by created_at)
    const { data: allFees, error: feesError } = await adminClient
      .from("fee_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (feesError) throw feesError;

    const MONTHS = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    // Group by student_id, find the latest fee record for each student
    const latestByStudent = new Map<string, typeof allFees[0]>();
    for (const fee of allFees || []) {
      if (!latestByStudent.has(fee.student_id)) {
        latestByStudent.set(fee.student_id, fee);
      }
    }

    const now = new Date();
    let createdCount = 0;

    for (const [studentId, latestFee] of latestByStudent) {
      // Check if 30 days have passed since the latest fee was created
      const feeCreatedAt = new Date(latestFee.created_at);
      const daysSince = Math.floor((now.getTime() - feeCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince < 30) continue;

      // Calculate next month/year
      const currentMonthIndex = MONTHS.indexOf(latestFee.month);
      if (currentMonthIndex === -1) continue;

      const nextMonthIndex = (currentMonthIndex + 1) % 12;
      const nextYear = nextMonthIndex === 0 ? latestFee.year + 1 : latestFee.year;
      const nextMonth = MONTHS[nextMonthIndex];

      // Check if a fee for next month already exists
      const { data: existing } = await adminClient
        .from("fee_records")
        .select("id")
        .eq("student_id", studentId)
        .eq("month", nextMonth)
        .eq("year", nextYear)
        .maybeSingle();

      if (existing) continue;

      // Create the new fee record with the same amount
      const dueDate = new Date(nextYear, nextMonthIndex, 15).toISOString().split("T")[0];

      const { error: insertError } = await adminClient.from("fee_records").insert({
        student_id: studentId,
        amount: latestFee.amount,
        month: nextMonth,
        year: nextYear,
        due_date: dueDate,
        status: "unpaid",
      });

      if (!insertError) createdCount++;
    }

    return new Response(
      JSON.stringify({ success: true, message: `Generated ${createdCount} new fee records` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
