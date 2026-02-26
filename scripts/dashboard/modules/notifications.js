(function (global) {
    "use strict";

    function calculateOrderAgeDays(orderDate, parseIsoDate) {
        const parsed = parseIsoDate(orderDate);
        if (!parsed) {
            return 0;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const msDiff = today.getTime() - parsed.getTime();
        return Math.max(0, Math.floor(msDiff / 86400000));
    }

    function isOrderOverdueForDelivery(orderDate, deliveryReminderDays, parseIsoDate) {
        const daysOpen = calculateOrderAgeDays(orderDate, parseIsoDate);
        return daysOpen > deliveryReminderDays;
    }

    function buildDeliveryReminders(items, options) {
        return (Array.isArray(items) ? items : [])
            .filter((order) => order && order.arrived === false && isOrderOverdueForDelivery(
                order.orderDate,
                options.deliveryReminderDays,
                options.parseIsoDate
            ))
            .map((order) => ({
                id: `delivery:${order.id}`,
                orderId: order.id,
                customerName: order.customerName,
                orderDate: order.orderDate,
                daysOpen: calculateOrderAgeDays(order.orderDate, options.parseIsoDate)
            }))
            .sort((a, b) => b.daysOpen - a.daysOpen || Date.parse(a.orderDate) - Date.parse(b.orderDate))
            .slice(0, options.maxItems);
    }

    function getDeliveryReminderFingerprint(items) {
        const ids = (Array.isArray(items) ? items : []).map((item) => String(item.id || "").trim()).filter(Boolean);
        return ids.join("|");
    }

    function shouldShowNotificationBadge(currentFingerprint, lastSeenFingerprint) {
        const current = String(currentFingerprint || "").trim();
        if (!current) {
            return false;
        }
        return current !== String(lastSeenFingerprint || "").trim();
    }

    function renderNotificationItemsHtml(reminders, options) {
        return (Array.isArray(reminders) ? reminders : [])
            .map((reminder) => `
            <article class="notification-item">
                <div class="notification-item-main">
                    <p class="notification-title">Reminder: check delivery for ${options.escapeHtml(reminder.customerName)}</p>
                    <p class="notification-meta">Order date ${options.escapeHtml(options.formatDate(reminder.orderDate))} - ${reminder.daysOpen} days open</p>
                </div>
                <button
                    type="button"
                    class="notification-open-btn"
                    data-notification-order-id="${options.escapeHtml(reminder.orderId)}"
                >
                    Open order
                </button>
            </article>
        `)
            .join("");
    }

    const api = {
        calculateOrderAgeDays,
        isOrderOverdueForDelivery,
        buildDeliveryReminders,
        getDeliveryReminderFingerprint,
        shouldShowNotificationBadge,
        renderNotificationItemsHtml
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerNotifications = Object.assign({}, global.shoprunnerNotifications || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
