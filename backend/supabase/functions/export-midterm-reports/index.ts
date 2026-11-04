import { createClient } from "npm:@supabase/supabase-js@2";
import { generateMidtermReportPdf } from "../_shared/midtermReportPdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Cache-Control": "no-store, private",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeFileName(value: unknown) {
  return String(value ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 60) || "midterm-reports";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: "Server configuration error." }, 500);
  }
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required." }, 401);
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return jsonResponse({ error: "Your session is invalid." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: user, error: userError } = await admin
      .from("users")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (userError || !user || !["dean_of_studies", "headteacher", "it"].includes(String(user.role))) {
      return jsonResponse({ error: "You are not authorized." }, 403);
    }

    const body = await req.json() as { report_ids?: unknown[] };
    const reportIds = Array.isArray(body.report_ids)
      ? [...new Set(body.report_ids.filter((id): id is string => typeof id === "string"))]
      : [];
    if (reportIds.length === 0 || reportIds.length > 200) {
      return jsonResponse({ error: "Provide between 1 and 200 report IDs." }, 400);
    }

    const { data: reports, error: reportsError } = await admin
      .from("midterm_reports")
      .select("id, period_id, student_name, class_name, average, report_data, is_deleted")
      .in("id", reportIds)
      .eq("is_deleted", false);
    if (reportsError) return jsonResponse({ error: "Unable to load reports." }, 500);
    if (!reports || reports.length !== reportIds.length) {
      return jsonResponse({ error: "One or more reports not found." }, 404);
    }

    const periodId = reports[0].period_id;
    if (reports.some((report) => report.period_id !== periodId)) {
      return jsonResponse({ error: "Reports must belong to one assessment period." }, 400);
    }

    const { data: period, error: periodError } = await admin
      .from("midterm_periods")
      .select("name, official_date")
      .eq("id", periodId)
      .maybeSingle();
    if (periodError || !period) return jsonResponse({ error: "Assessment period not found." }, 404);

    const { data: averages } = await admin
      .from("midterm_reports")
      .select("average")
      .eq("period_id", periodId)
      .eq("is_deleted", false);

    const pdfBytes = await generateMidtermReportPdf(
      reports,
      String(period.name ?? "Mid-Term"),
      new Date(period.official_date).toLocaleDateString("en-GB"),
      (averages ?? []).map((row) => Number(row.average)).filter(Number.isFinite),
    );

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        // Supabase's Functions client treats octet-stream as a Blob. PDF is
        // still identified by the filename and Content-Disposition header.
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeFileName(period.name)}-midterm-reports.pdf"`,
      },
    });
  } catch (error) {
    console.error("Report export failed:", error);
    return jsonResponse({ error: "Unable to prepare the report export." }, 500);
  }
});
