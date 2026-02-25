import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const REMINDER_THRESHOLD_DAYS = 7;
const REMINDER_TIMEZONE = "America/Paramaribo";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type OrderRow = {
  id: string;
  user_id: string;
  customer_name: string | null;
  order_date: string;
  arrived: boolean;
};

type OrderReminder = {
  orderId: string;
  customerName: string;
  orderDate: string;
  daysOpen: number;
};

type SendRun = {
  userId: string;
  recipientEmail: string;
  reminders: OrderReminder[];
  weekKey: string;
  fingerprint: string;
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase environment is not configured." }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const authCheck = await isAuthorizedCronRequest(request, admin);
  if (!authCheck.ok) {
    return jsonResponse({ error: authCheck.error }, authCheck.status);
  }

  const resendApiKey = await getResendApiKey(admin);
  const fromEmail = await getFromEmail(admin);
  const appBaseUrl = await getAppBaseUrl(admin);

  if (!resendApiKey || !fromEmail) {
    return jsonResponse(
      {
        error:
          "Missing Vault secrets: delivery_reminder_resend_api_key or delivery_reminder_from_email.",
      },
      500,
    );
  }

  const todayIso = getLocalDateIso(new Date(), REMINDER_TIMEZONE);
  const weekKey = getIsoWeekKey(todayIso);
  const remindersByUser = await loadOverdueReminders(admin, todayIso);

  if (!remindersByUser.size) {
    return jsonResponse({
      sent: 0,
      skipped: 0,
      failed: 0,
      users: 0,
      weekKey,
    });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const [userId, reminders] of remindersByUser.entries()) {
    const normalizedReminders = reminders
      .slice()
      .sort((a, b) => b.daysOpen - a.daysOpen || a.orderDate.localeCompare(b.orderDate));

    const recipientEmail = await getUserEmail(admin, userId);
    const fingerprint = getReminderFingerprint(normalizedReminders);
    const run: SendRun = {
      userId,
      recipientEmail,
      reminders: normalizedReminders,
      weekKey,
      fingerprint,
    };

    if (!recipientEmail) {
      failed += 1;
      await insertRunLog(admin, run, "failed", "", "Missing recipient email for user.");
      continue;
    }

    const alreadySent = await wasAlreadySent(admin, run);
    if (alreadySent) {
      skipped += 1;
      continue;
    }

    try {
      const providerMessageId = await sendReminderEmail(
        resendApiKey,
        fromEmail,
        appBaseUrl,
        recipientEmail,
        normalizedReminders,
      );
      sent += 1;
      await insertRunLog(admin, run, "sent", providerMessageId, "");
    } catch (error) {
      failed += 1;
      await insertRunLog(
        admin,
        run,
        "failed",
        "",
        String(error instanceof Error ? error.message : error || "Unknown email error."),
      );
    }
  }

  return jsonResponse({
    sent,
    skipped,
    failed,
    users: remindersByUser.size,
    weekKey,
  });
});

async function isAuthorizedCronRequest(
  request: Request,
  admin: SupabaseClient,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const incomingSecret = String(request.headers.get("x-reminder-cron-secret") || "").trim();
  if (!incomingSecret) {
    return { ok: false, status: 401, error: "Missing x-reminder-cron-secret header." };
  }

  const { data, error } = await admin.rpc("get_delivery_reminder_cron_secret");
  if (error) {
    return { ok: false, status: 500, error: `Could not read cron secret: ${error.message}` };
  }

  const expectedSecret = String(data || "").trim();
  if (!expectedSecret) {
    return { ok: false, status: 500, error: "Cron secret is not configured." };
  }

  if (incomingSecret !== expectedSecret) {
    return { ok: false, status: 401, error: "Invalid cron secret." };
  }

  return { ok: true };
}

async function getResendApiKey(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.rpc("get_delivery_reminder_resend_api_key");
  if (error) {
    throw new Error(`Could not read secret via get_delivery_reminder_resend_api_key: ${error.message}`);
  }
  return String(data || "").trim();
}

async function getFromEmail(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.rpc("get_delivery_reminder_from_email");
  if (error) {
    throw new Error(`Could not read secret via get_delivery_reminder_from_email: ${error.message}`);
  }
  return String(data || "").trim();
}

async function getAppBaseUrl(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.rpc("get_delivery_reminder_app_base_url");
  if (error) {
    throw new Error(`Could not read secret via get_delivery_reminder_app_base_url: ${error.message}`);
  }
  const value = String(data || "").trim();
  return value || "https://shoprunner.dev";
}

async function loadOverdueReminders(
  admin: SupabaseClient,
  todayIso: string,
): Promise<Map<string, OrderReminder[]>> {
  const { data, error } = await admin
    .from("orders")
    .select("id,user_id,customer_name,order_date,arrived")
    .eq("arrived", false)
    .order("order_date", { ascending: true });

  if (error) {
    throw new Error(`Could not load orders: ${error.message}`);
  }

  const grouped = new Map<string, OrderReminder[]>();
  for (const row of (data || []) as OrderRow[]) {
    const userId = String(row.user_id || "").trim();
    if (!userId) {
      continue;
    }

    const daysOpen = calculateDaysOpen(todayIso, row.order_date);
    if (daysOpen <= REMINDER_THRESHOLD_DAYS) {
      continue;
    }

    const entry: OrderReminder = {
      orderId: String(row.id || "").trim(),
      customerName: String(row.customer_name || "Customer").trim() || "Customer",
      orderDate: String(row.order_date || ""),
      daysOpen,
    };

    if (!entry.orderId || !/^\d{4}-\d{2}-\d{2}$/.test(entry.orderDate)) {
      continue;
    }

    const existing = grouped.get(userId) || [];
    existing.push(entry);
    grouped.set(userId, existing);
  }

  return grouped;
}

function calculateDaysOpen(todayIso: string, orderDateIso: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(todayIso) || !/^\d{4}-\d{2}-\d{2}$/.test(orderDateIso)) {
    return 0;
  }

  const todayUtc = isoDateToUtcMs(todayIso);
  const orderUtc = isoDateToUtcMs(orderDateIso);
  if (todayUtc === null || orderUtc === null) {
    return 0;
  }

  return Math.max(0, Math.floor((todayUtc - orderUtc) / 86_400_000));
}

function isoDateToUtcMs(isoDate: string): number | null {
  const parts = isoDate.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return Date.UTC(year, month - 1, day);
}

function getLocalDateIso(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function getIsoWeekKey(localIsoDate: string): string {
  const utcMs = isoDateToUtcMs(localIsoDate);
  if (utcMs === null) {
    return "unknown-week";
  }

  const date = new Date(utcMs);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);

  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getReminderFingerprint(reminders: OrderReminder[]): string {
  return reminders
    .slice()
    .sort((a, b) => a.orderId.localeCompare(b.orderId))
    .map((item) => `${item.orderId}:${item.orderDate}`)
    .join("|");
}

async function getUserEmail(admin: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data || !data.user) {
    return "";
  }
  return String(data.user.email || "").trim();
}

async function wasAlreadySent(admin: SupabaseClient, run: SendRun): Promise<boolean> {
  const { count, error } = await admin
    .from("delivery_reminder_email_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", run.userId)
    .eq("week_key", run.weekKey)
    .eq("reminder_fingerprint", run.fingerprint)
    .eq("status", "sent");

  if (error) {
    throw new Error(`Could not check prior reminder runs: ${error.message}`);
  }

  return Number(count || 0) > 0;
}

async function sendReminderEmail(
  resendApiKey: string,
  fromEmail: string,
  appBaseUrl: string,
  recipientEmail: string,
  reminders: OrderReminder[],
): Promise<string> {
  const subject = `Shoprunner reminder: ${reminders.length} overdue ${
    reminders.length === 1 ? "order" : "orders"
  }`;
  const appUrl = `${String(appBaseUrl || "").replace(/\/+$/, "")}/app`;

  const lines = reminders.map((item) =>
    `- ${item.customerName}: ${item.orderDate} (${item.daysOpen} days open)`
  );
  const textBody = [
    "You have overdue orders that are still marked as not arrived.",
    "",
    ...lines,
    "",
    `Open dashboard: ${appUrl}`,
  ].join("\n");

  const htmlItems = reminders.map((item) =>
    `<li><strong>${escapeHtml(item.customerName)}</strong> - ${escapeHtml(item.orderDate)} (${item.daysOpen} days open)</li>`
  );
  const htmlBody = [
    "<p>You have overdue orders that are still marked as not arrived.</p>",
    `<ul>${htmlItems.join("")}</ul>`,
    `<p><a href="${escapeHtml(appUrl)}">Open dashboard</a></p>`,
  ].join("");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [recipientEmail],
      subject,
      text: textBody,
      html: htmlBody,
    }),
  });

  const payload = await response.text();
  if (!response.ok) {
    throw new Error(`Resend request failed (${response.status}): ${payload.slice(0, 400)}`);
  }

  try {
    const parsed = JSON.parse(payload) as { id?: string };
    return String(parsed.id || "").trim();
  } catch (_error) {
    return "";
  }
}

async function insertRunLog(
  admin: SupabaseClient,
  run: SendRun,
  status: "sent" | "failed",
  providerMessageId: string,
  errorMessage: string,
): Promise<void> {
  const payload = {
    user_id: run.userId,
    week_key: run.weekKey,
    reminder_fingerprint: run.fingerprint,
    recipient_email: run.recipientEmail,
    order_count: run.reminders.length,
    status,
    provider_message_id: providerMessageId || null,
    error_message: errorMessage || null,
  };

  const { error } = await admin.from("delivery_reminder_email_runs").insert(payload);
  if (error) {
    throw new Error(`Could not store reminder run log: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
