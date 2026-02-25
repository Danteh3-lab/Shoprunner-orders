import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const THRESHOLD_DAYS = 7;
const TZ = "America/Paramaribo";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type OrderRow = {
  id: string;
  user_id: string;
  owner_id: string | null;
  customer_name: string | null;
  order_date: string;
  item_name: string | null;
  item_links: unknown;
  arrived: boolean;
};

type Reminder = {
  orderId: string;
  customerName: string;
  orderDate: string;
  itemName: string;
  itemLinks: string[];
  daysOpen: number;
};

type Run = {
  userId: string;
  recipientEmail: string;
  recipientName: string;
  reminders: Reminder[];
  weekKey: string;
  fingerprint: string;
};

type TeamProfile = { email: string; name: string };
type UserProfile = { email: string; name: string };

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase env missing." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const auth = await isAuthorized(request, admin);
  if (!auth.ok) return json({ error: auth.error }, auth.status);

  const resendApiKey = await getSecret(admin, "get_delivery_reminder_resend_api_key");
  const fromEmail = await getSecret(admin, "get_delivery_reminder_from_email");
  const appBaseUrl = (await getSecret(admin, "get_delivery_reminder_app_base_url")) || "https://shoprunner.dev";

  if (!resendApiKey || !fromEmail) return json({ error: "Missing reminder secrets." }, 500);

  const todayIso = getLocalDateIso(new Date(), TZ);
  const weekKey = getIsoWeekKey(todayIso);
  const remindersByUser = await loadOverdueReminders(admin, todayIso);

  if (!remindersByUser.size) return json({ sent: 0, skipped: 0, failed: 0, users: 0, weekKey });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, reminders] of remindersByUser.entries()) {
    const sorted = reminders.slice().sort((a, b) => b.daysOpen - a.daysOpen || a.orderDate.localeCompare(b.orderDate));
    const fallback = await getUserProfile(admin, userId);
    const ownerProfiles = await loadTeamProfiles(admin, userId);
    const runs = groupRuns(userId, weekKey, sorted, ownerProfiles, fallback);

    if (!runs.length) {
      failed += 1;
      await insertRun(admin, {
        userId,
        recipientEmail: fallback.email,
        recipientName: fallback.name,
        reminders: [],
        weekKey,
        fingerprint: "",
      }, "failed", "", "No recipient email.");
      continue;
    }

    for (const run of runs) {
      if (await wasAlreadySent(admin, run)) {
        skipped += 1;
        continue;
      }
      try {
        const messageId = await sendReminderEmail(
          resendApiKey,
          fromEmail,
          appBaseUrl,
          run.recipientEmail,
          run.recipientName,
          run.reminders,
        );
        sent += 1;
        await insertRun(admin, run, "sent", messageId, "");
      } catch (error) {
        failed += 1;
        await insertRun(
          admin,
          run,
          "failed",
          "",
          String(error instanceof Error ? error.message : error || "Unknown email error."),
        );
      }
    }
  }

  return json({ sent, skipped, failed, users: remindersByUser.size, weekKey });
});

async function isAuthorized(
  request: Request,
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const incoming = String(request.headers.get("x-reminder-cron-secret") || "").trim();
  if (!incoming) return { ok: false, status: 401, error: "Missing x-reminder-cron-secret header." };

  const expected = await getSecret(admin, "get_delivery_reminder_cron_secret");
  if (!expected) return { ok: false, status: 500, error: "Cron secret is not configured." };
  if (incoming !== expected) return { ok: false, status: 401, error: "Invalid cron secret." };

  return { ok: true };
}

async function getSecret(admin: SupabaseClient, rpcName: string): Promise<string> {
  const { data, error } = await admin.rpc(rpcName);
  if (error) throw new Error(`Secret read failed (${rpcName}): ${error.message}`);
  return String(data || "").trim();
}

async function loadOverdueReminders(
  admin: SupabaseClient,
  todayIso: string,
): Promise<Map<string, Array<Reminder & { ownerId: string }>>> {
  const { data, error } = await admin
    .from("orders")
    .select("id,user_id,owner_id,customer_name,order_date,item_name,item_links,arrived")
    .eq("arrived", false)
    .order("order_date", { ascending: true });

  if (error) throw new Error(`Could not load orders: ${error.message}`);

  const grouped = new Map<string, Array<Reminder & { ownerId: string }>>();
  for (const row of (data || []) as OrderRow[]) {
    const userId = String(row.user_id || "").trim();
    if (!userId) continue;

    const daysOpen = calculateDaysOpen(todayIso, row.order_date);
    if (daysOpen <= THRESHOLD_DAYS) continue;

    const reminder = {
      orderId: String(row.id || "").trim(),
      ownerId: String(row.owner_id || "").trim(),
      customerName: String(row.customer_name || "Customer").trim() || "Customer",
      orderDate: String(row.order_date || ""),
      itemName: String(row.item_name || "Item").trim() || "Item",
      itemLinks: normalizeItemLinksForEmail(row.item_links),
      daysOpen,
    };

    if (!reminder.orderId || !/^\d{4}-\d{2}-\d{2}$/.test(reminder.orderDate)) continue;

    const list = grouped.get(userId) || [];
    list.push(reminder);
    grouped.set(userId, list);
  }

  return grouped;
}

function groupRuns(
  userId: string,
  weekKey: string,
  reminders: Array<Reminder & { ownerId: string }>,
  ownerProfiles: Map<string, TeamProfile>,
  fallback: UserProfile,
): Run[] {
  const grouped = new Map<string, { recipientName: string; reminders: Reminder[] }>();

  for (const item of reminders) {
    const owner = item.ownerId ? ownerProfiles.get(item.ownerId) : undefined;
    const recipientEmail = normalizeEmail(owner?.email || fallback.email);
    if (!recipientEmail) continue;

    const recipientName = normalizeName(owner?.name || fallback.name);
    const current = grouped.get(recipientEmail) || { recipientName: "", reminders: [] };
    current.reminders.push({
      orderId: item.orderId,
      customerName: item.customerName,
      orderDate: item.orderDate,
      itemName: item.itemName,
      itemLinks: item.itemLinks,
      daysOpen: item.daysOpen,
    });
    if (!current.recipientName && recipientName) current.recipientName = recipientName;
    grouped.set(recipientEmail, current);
  }

  const runs: Run[] = [];
  for (const [recipientEmail, value] of grouped.entries()) {
    const sorted = value.reminders
      .slice()
      .sort((a, b) => b.daysOpen - a.daysOpen || a.orderDate.localeCompare(b.orderDate));

    runs.push({
      userId,
      recipientEmail,
      recipientName: value.recipientName,
      reminders: sorted,
      weekKey,
      fingerprint: getFingerprint(sorted),
    });
  }

  return runs;
}

async function getUserProfile(admin: SupabaseClient, userId: string): Promise<UserProfile> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return { email: "", name: "" };

  const metadata = data.user.user_metadata || {};
  const name = normalizeName(String(metadata.full_name || metadata.name || metadata.display_name || ""));
  const email = normalizeEmail(String(data.user.email || ""));

  return { email, name };
}

async function loadTeamProfiles(admin: SupabaseClient, userId: string): Promise<Map<string, TeamProfile>> {
  const { data, error } = await admin
    .from("team_members")
    .select("id,name,email")
    .eq("user_id", userId)
    .not("email", "is", null);

  if (error) throw new Error(`Could not load team member emails: ${error.message}`);

  const map = new Map<string, TeamProfile>();
  for (const row of (data || []) as Array<{ id: string; name: string | null; email: string | null }>) {
    const id = String(row.id || "").trim();
    const email = normalizeEmail(String(row.email || ""));
    if (!id || !email) continue;
    map.set(id, { email, name: normalizeName(String(row.name || "")) });
  }

  return map;
}

async function sendReminderEmail(
  resendApiKey: string,
  fromEmail: string,
  appBaseUrl: string,
  recipientEmail: string,
  recipientName: string,
  reminders: Reminder[],
): Promise<string> {
  const subject = reminders.length === 1
    ? "Shoprunner reminder: 1 order is langer dan 7 dagen niet gearriveerd"
    : `Shoprunner reminder: ${reminders.length} orders zijn langer dan 7 dagen niet gearriveerd`;

  const appUrl = `${String(appBaseUrl || "").replace(/\/+$/, "")}/app`;
  const greeting = recipientName ? `Beste ${recipientName},` : "Beste,";

  const lines = reminders.map((r) => {
    const links = r.itemLinks
      .map((value) => normalizeHttpLink(value))
      .filter((value): value is string => Boolean(value));

    const linkLines = links.length
      ? links.map((link) => `    - ${formatLinkDisplayLabel(link)}: ${link}`)
      : ["    - geen item-links toegevoegd."];

    return [
      `- Klant: ${r.customerName}`,
      `  Item: ${r.itemName}`,
      `  Orderdatum: ${r.orderDate}`,
      `  Dagen open: ${r.daysOpen}`,
      "  Links:",
      ...linkLines,
    ].join("\n");
  });
  const text = [
    greeting,
    "",
    "Hierbij een reminder: onderstaande order(s) staan langer dan 7 dagen op niet gearriveerd.",
    "Graag een reminder om met Roopcom te checken of deze bestelling(en) al binnen is/zijn.",
    "",
    ...lines,
    "",
    `Open dashboard: ${appUrl}`,
  ].join("\n");

  const htmlItems = reminders.map((r) => {
    const links = r.itemLinks
      .map((value) => normalizeHttpLink(value))
      .filter((value): value is string => Boolean(value));

    const linkItems = links.length
      ? links.map((link) =>
        `<li><a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(formatLinkDisplayLabel(link))}</a></li>`
      ).join("")
      : "<li>geen item-links toegevoegd.</li>";

    return [
      "<li>",
      `<strong>Klant:</strong> ${escapeHtml(r.customerName)}<br/>`,
      `<strong>Item:</strong> ${escapeHtml(r.itemName)}<br/>`,
      `<strong>Orderdatum:</strong> ${escapeHtml(r.orderDate)}<br/>`,
      `<strong>Dagen open:</strong> ${r.daysOpen}<br/>`,
      "<strong>Links:</strong>",
      `<ul>${linkItems}</ul>`,
      "</li>",
    ].join("");
  }).join("");

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    "<p>Hierbij een reminder: onderstaande order(s) staan langer dan 7 dagen op niet gearriveerd.</p>",
    "<p>Graag een reminder om met Roopcom te checken of deze bestelling(en) al binnen is/zijn.</p>",
    `<ul>${htmlItems}</ul>`,
    `<p><a href=\"${escapeHtml(appUrl)}\">Open dashboard</a></p>`,
  ].join("");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromEmail, to: [recipientEmail], subject, text, html }),
  });

  const payload = await response.text();
  if (!response.ok) throw new Error(`Resend request failed (${response.status}): ${payload.slice(0, 400)}`);

  try {
    return String((JSON.parse(payload) as { id?: string }).id || "").trim();
  } catch {
    return "";
  }
}

async function wasAlreadySent(admin: SupabaseClient, run: Run): Promise<boolean> {
  const { count, error } = await admin
    .from("delivery_reminder_email_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", run.userId)
    .eq("recipient_email", run.recipientEmail)
    .eq("week_key", run.weekKey)
    .eq("reminder_fingerprint", run.fingerprint)
    .eq("status", "sent");

  if (error) throw new Error(`Could not check prior reminder runs: ${error.message}`);
  return Number(count || 0) > 0;
}

async function insertRun(
  admin: SupabaseClient,
  run: Run,
  status: "sent" | "failed",
  providerMessageId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await admin.from("delivery_reminder_email_runs").insert({
    user_id: run.userId,
    week_key: run.weekKey,
    reminder_fingerprint: run.fingerprint,
    recipient_email: run.recipientEmail,
    order_count: run.reminders.length,
    status,
    provider_message_id: providerMessageId || null,
    error_message: errorMessage || null,
  });
  if (error) throw new Error(`Could not store reminder run log: ${error.message}`);
}

function getFingerprint(reminders: Reminder[]): string {
  return reminders
    .slice()
    .sort((a, b) => a.orderId.localeCompare(b.orderId))
    .map((r) => `${r.orderId}:${r.orderDate}`)
    .join("|");
}

function calculateDaysOpen(todayIso: string, orderDateIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayIso) || !/^\d{4}-\d{2}-\d{2}$/.test(orderDateIso)) return 0;
  const today = isoToUtc(todayIso);
  const order = isoToUtc(orderDateIso);
  if (today === null || order === null) return 0;
  return Math.max(0, Math.floor((today - order) / 86_400_000));
}

function isoToUtc(isoDate: string): number | null {
  const parts = isoDate.split("-").map((v) => Number.parseInt(v, 10));
  if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) return null;
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function getLocalDateIso(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getIsoWeekKey(localIsoDate: string): string {
  const utcMs = isoToUtc(localIsoDate);
  if (utcMs === null) return "unknown-week";

  const date = new Date(utcMs);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function normalizeEmail(value: string): string {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return trimmed;
}

function normalizeName(value: string): string {
  return String(value || "").trim();
}

function normalizeItemLinksForEmail(value: unknown): string[] {
  const entries = coerceToStringArray(value);
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const rawEntry of entries) {
    const entry = String(rawEntry || "").trim();
    if (!entry || seen.has(entry)) continue;
    seen.add(entry);
    normalized.push(entry);
    if (normalized.length >= 20) break;
  }

  return normalized;
}

function coerceToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => String(entry || ""));
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((entry) => String(entry || ""));
    } catch {
      return [trimmed];
    }
  }
  return [];
}

function normalizeHttpLink(value: string): string {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function formatLinkDisplayLabel(value: string): string {
  const maxLength = 70;
  try {
    const parsed = new URL(value);
    const pathAndQuery = `${parsed.pathname || ""}${parsed.search || ""}`;
    const combined = `${parsed.hostname}${pathAndQuery}`.replace(/\/+$/, "");
    if (combined.length <= maxLength) return combined;
    return `${combined.slice(0, maxLength - 3)}...`;
  } catch {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
