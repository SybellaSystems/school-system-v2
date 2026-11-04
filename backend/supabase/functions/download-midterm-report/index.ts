import { createClient } from "npm:@supabase/supabase-js@2";
import { generateMidtermReportPdf } from "../_shared/midtermReportPdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Cache-Control": "no-store, private",
  "X-Content-Type-Options": "nosniff",
};

function response(message: string, status: number) {
  return new Response(message, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return response("Method not allowed.", 405);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") ?? "";
    if (!/^[a-f0-9]{64}$/i.test(token)) return response("This download link is invalid or expired.", 404);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return response("Unable to prepare the download.", 500);

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const tokenHash = await hashToken(token);

    const { data: report, error } = await supabase
      .from("midterm_reports")
      .select("id, period_id, period, student_name, class_name, average, report_data, generated_at, access_token_expires_at, published_at")
      .eq("access_token_hash", tokenHash)
      .not("published_at", "is", null)
      .maybeSingle();

    if (error) {
      console.error("Report lookup failed:", error.message);
      return response("Unable to prepare the download.", 500);
    }
    if (!report) return response("This download link is invalid or expired.", 404);
    if (!report.access_token_expires_at || new Date(report.access_token_expires_at).getTime() <= Date.now()) {
      return response("This download link is invalid or expired.", 404);
    }

    // Fetch period info for name/date + all averages for position
    let periodName = safeText(report.period || "Mid-Term");
    let periodDate = report.generated_at ? new Date(report.generated_at).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
    let allAverages: number[] = [];

    if (report.period_id) {
      const [periodRes, reportsRes] = await Promise.all([
        supabase.from("midterm_periods").select("name, official_date").eq("id", report.period_id).maybeSingle(),
        supabase.from("midterm_reports").select("average").eq("period_id", report.period_id),
      ]);
      if (periodRes.data) {
        periodName = safeText(periodRes.data.name) || periodName;
        if (periodRes.data.official_date) periodDate = new Date(periodRes.data.official_date).toLocaleDateString("en-GB");
      }
      if (reportsRes.data) allAverages = reportsRes.data.map((r: any) => Number(r.average)).filter((n) => Number.isFinite(n));
    }

    const pdfBytes = await generateMidtermReportPdf(
      report,
      periodName,
      periodDate,
      allAverages,
    );
    const safeName = safeText(report.student_name).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60) || "student";

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}-midterm-report.pdf"`,
      },
    });
  } catch (e) {
    console.error("Report download failed:", e);
    return response("Unable to prepare the download.", 500);
  }
});