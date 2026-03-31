/**
 * Weekly digest generator for PeerGraph.ai
 *
 * Queries Supabase for activity from the past 7 days and generates
 * an email-ready digest. Can be run via GitHub Actions on a schedule.
 *
 * Usage:
 *   npx ts-node scripts/weekly-digest.ts
 *   npx ts-node scripts/weekly-digest.ts --send  (actually send emails)
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY in .env.local
 * For sending: RESEND_API_KEY (https://resend.com — free 100 emails/day)
 */

import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(supabaseUrl!, serviceKey!, { auth: { persistSession: false } });

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch recent additions
  const [{ data: newResearchers }, { data: newBuilders }, { data: newLinks }, { data: subscribers }] = await Promise.all([
    db.from("researchers").select("name, institution").gte("created_at", oneWeekAgo).order("created_at", { ascending: false }),
    db.from("builders").select("name, city").gte("created_at", oneWeekAgo).order("created_at", { ascending: false }),
    db.from("project_papers").select("project_id, paper_id, added_at").gte("added_at", oneWeekAgo).order("added_at", { ascending: false }).limit(10),
    db.from("subscribers").select("email"),
  ]);

  // Fetch project/paper names for links
  const linkDetails = [];
  for (const link of (newLinks ?? [])) {
    const [{ data: proj }, { data: paper }] = await Promise.all([
      db.from("projects").select("name").eq("id", link.project_id).maybeSingle(),
      db.from("papers").select("title").eq("id", link.paper_id).maybeSingle(),
    ]);
    if (proj && paper) {
      linkDetails.push({ project: proj.name, paper: paper.title });
    }
  }

  // Platform stats
  const [{ count: rCount }, { count: bCount }, { count: pCount }] = await Promise.all([
    db.from("researchers").select("id", { count: "exact", head: true }),
    db.from("builders").select("id", { count: "exact", head: true }),
    db.from("papers").select("id", { count: "exact", head: true }),
  ]);

  // Generate digest
  const digest = {
    subject: `This week on PeerGraph.ai — ${(newResearchers?.length ?? 0) + (newBuilders?.length ?? 0)} new profiles`,
    stats: { researchers: rCount, builders: bCount, papers: pCount },
    newResearchers: (newResearchers ?? []).slice(0, 5),
    newBuilders: (newBuilders ?? []).slice(0, 5),
    newLinks: linkDetails.slice(0, 5),
    subscriberCount: subscribers?.length ?? 0,
  };

  console.log("=== Weekly Digest ===\n");
  console.log(`Subject: ${digest.subject}\n`);
  console.log(`Platform: ${digest.stats.researchers} researchers, ${digest.stats.builders} builders, ${digest.stats.papers} papers\n`);

  if (digest.newResearchers.length > 0) {
    console.log("New researchers:");
    digest.newResearchers.forEach((r: any) => console.log(`  + ${r.name} (${r.institution})`));
    console.log();
  }

  if (digest.newBuilders.length > 0) {
    console.log("New builders:");
    digest.newBuilders.forEach((b: any) => console.log(`  + ${b.name} (${b.city})`));
    console.log();
  }

  if (digest.newLinks.length > 0) {
    console.log("New paper→product links:");
    digest.newLinks.forEach((l: any) => console.log(`  ${l.project} → ${l.paper}`));
    console.log();
  }

  console.log(`Would send to ${digest.subscriberCount} subscribers.\n`);

  // Send emails if --send flag
  if (process.argv.includes("--send")) {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("RESEND_API_KEY not set. Get one free at https://resend.com");
      process.exit(1);
    }

    const html = generateHTML(digest);

    for (const sub of (subscribers ?? [])) {
      console.log(`Sending to ${sub.email}...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "PeerGraph.ai <updates@peergraph.ai>",
          to: sub.email,
          subject: digest.subject,
          html,
        }),
      });
      if (!res.ok) console.error(`  Failed: ${await res.text()}`);
      else console.log("  Sent.");
    }
  }
}

function generateHTML(digest: any): string {
  return `
<div style="max-width:600px;margin:0 auto;font-family:system-ui,sans-serif;color:#e0e0e0;background:#0a0a0f;padding:32px;">
  <h1 style="font-size:20px;margin-bottom:4px;">This week on PeerGraph.ai</h1>
  <p style="color:#888;font-size:13px;margin-bottom:24px;">
    ${digest.stats.researchers} researchers · ${digest.stats.builders} builders · ${digest.stats.papers} papers
  </p>

  ${digest.newResearchers.length > 0 ? `
  <h2 style="font-size:14px;color:#60A5FA;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">New Researchers</h2>
  ${digest.newResearchers.map((r: any) => `<p style="margin:4px 0;font-size:14px;">+ ${r.name} <span style="color:#666;">(${r.institution})</span></p>`).join("")}
  <br/>` : ""}

  ${digest.newBuilders.length > 0 ? `
  <h2 style="font-size:14px;color:#34D399;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">New Builders</h2>
  ${digest.newBuilders.map((b: any) => `<p style="margin:4px 0;font-size:14px;">+ ${b.name} <span style="color:#666;">(${b.city})</span></p>`).join("")}
  <br/>` : ""}

  ${digest.newLinks.length > 0 ? `
  <h2 style="font-size:14px;color:#FBBF24;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">New Research → Product Links</h2>
  ${digest.newLinks.map((l: any) => `<p style="margin:4px 0;font-size:14px;">${l.project} → <span style="color:#888;">${l.paper}</span></p>`).join("")}
  <br/>` : ""}

  <a href="https://peergraph.ai" style="display:inline-block;padding:10px 24px;background:#fff;color:#000;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Explore the Graph →</a>

  <p style="color:#444;font-size:11px;margin-top:32px;">
    You're receiving this because you subscribed at peergraph.ai.<br/>
    <a href="mailto:ogkranthi22@gmail.com" style="color:#666;">Unsubscribe</a>
  </p>
</div>`;
}

main().catch(console.error);
