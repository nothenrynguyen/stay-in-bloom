import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("PROJECT_URL");
const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY");
const adminEmail = Deno.env.get("ADMIN_EMAIL");
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async () => {
  // Get yesterday's date in YYYY-MM-DD
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const yyyymmdd = now.toISOString().split("T")[0];

  // Query for pending, unnotified flowers from yesterday
  const { data: flowers, error } = await supabase
    .from("flowers")
    .select("*")
    .eq("status", "pending")
    .eq("notified", false)
    .gte("created_at", `${yyyymmdd}T00:00:00.000Z`)
    .lte("created_at", `${yyyymmdd}T23:59:59.999Z`);

  if (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }

  if (!flowers || flowers.length === 0) {
    return new Response("No new flowers to notify.", { status: 200 });
  }

  // Compose email
  const subject = "new flower submissions";
  const body = `You have ${flowers.length} new flowers! Check them out ` +
    `here: https://stay-in-bloom.vercel.app/admin`;

  // Send email via Resend
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Stay in Bloom <onboarding@resend.dev>",
      to: adminEmail,
      subject,
      text: body,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    return new Response(`Resend error: ${err}`, { status: 500 });
  }

  // Mark as notified
  const ids = flowers.map(f => f.id);
  await supabase
    .from("flowers")
    .update({ notified: true })
    .in("id", ids);

  return new Response("Notification sent.", { status: 200 });
});
