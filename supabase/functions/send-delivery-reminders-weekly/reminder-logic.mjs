export function normalizeReminderEmail(value) {
  const trimmed = String(value || "").trim().toLowerCase();
  if (!trimmed) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "";
  return trimmed;
}

export function normalizeReminderName(value) {
  return String(value || "").trim();
}

export function buildReminderGreeting(recipientName) {
  const normalized = normalizeReminderName(recipientName);
  return normalized ? `Beste ${normalized},` : "Beste,";
}

export function resolveReminderRecipient(ownerId, ownerProfiles, fallback) {
  const owner = ownerId ? ownerProfiles.get(String(ownerId).trim()) : undefined;
  const recipientEmail = normalizeReminderEmail(owner?.email || fallback?.email || "");
  const recipientName = normalizeReminderName(owner?.name || fallback?.name || "");

  return { recipientEmail, recipientName };
}

export function getReminderFingerprint(reminders) {
  return reminders
    .slice()
    .sort((a, b) => String(a.orderId || "").localeCompare(String(b.orderId || "")))
    .map((reminder) => `${reminder.orderId}:${reminder.orderDate}`)
    .join("|");
}

function sortReminders(reminders) {
  return reminders
    .slice()
    .sort((a, b) => b.daysOpen - a.daysOpen || a.orderDate.localeCompare(b.orderDate));
}

export function groupReminderRuns(userId, weekKey, reminders, ownerProfiles, fallback) {
  const grouped = new Map();

  for (const item of reminders) {
    const recipient = resolveReminderRecipient(item.ownerId, ownerProfiles, fallback);
    if (!recipient.recipientEmail) continue;

    const current = grouped.get(recipient.recipientEmail) || { recipientName: "", reminders: [] };
    current.reminders.push({
      orderId: item.orderId,
      customerName: item.customerName,
      orderDate: item.orderDate,
      itemName: item.itemName,
      itemLinks: item.itemLinks,
      daysOpen: item.daysOpen,
    });
    if (!current.recipientName && recipient.recipientName) current.recipientName = recipient.recipientName;
    grouped.set(recipient.recipientEmail, current);
  }

  const runs = [];
  for (const [recipientEmail, value] of grouped.entries()) {
    const sortedReminders = sortReminders(value.reminders);
    runs.push({
      userId,
      recipientEmail,
      recipientName: value.recipientName,
      reminders: sortedReminders,
      weekKey,
      fingerprint: getReminderFingerprint(sortedReminders),
    });
  }

  return runs;
}
