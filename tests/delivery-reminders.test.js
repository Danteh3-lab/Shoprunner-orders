import { describe, expect, it } from "vitest";
import {
    buildReminderGreeting,
    groupReminderRuns,
    resolveReminderRecipient
} from "../supabase/functions/send-delivery-reminders-weekly/reminder-logic.mjs";

function createReminder(overrides = {}) {
    return {
        orderId: "order-1",
        ownerId: "owner-1",
        customerName: "Ashley",
        orderDate: "2026-02-11",
        itemName: "Koonie Desk Fan",
        itemLinks: ["https://example.com/item"],
        daysOpen: 10,
        ...overrides
    };
}

describe("delivery reminder recipient logic", () => {
    it("prefers the assigned owner email and greeting when available", () => {
        const ownerProfiles = new Map([
            ["owner-1", { email: "armand@example.com", name: "Armand" }]
        ]);

        const recipient = resolveReminderRecipient("owner-1", ownerProfiles, {
            email: "account@example.com",
            name: "Danick"
        });

        expect(recipient).toEqual({
            recipientEmail: "armand@example.com",
            recipientName: "Armand"
        });
        expect(buildReminderGreeting(recipient.recipientName)).toBe("Beste Armand,");
    });

    it("falls back to the main account when the owner has no email", () => {
        const recipient = resolveReminderRecipient("owner-1", new Map(), {
            email: "account@example.com",
            name: "Danick"
        });

        expect(recipient).toEqual({
            recipientEmail: "account@example.com",
            recipientName: "Danick"
        });
        expect(buildReminderGreeting(recipient.recipientName)).toBe("Beste Danick,");
    });

    it("groups multiple overdue orders for the same owner into one run", () => {
        const ownerProfiles = new Map([
            ["owner-1", { email: "armand@example.com", name: "Armand" }]
        ]);

        const runs = groupReminderRuns(
            "user-1",
            "2026-W11",
            [
                createReminder({ orderId: "order-1", daysOpen: 15, orderDate: "2026-02-26" }),
                createReminder({ orderId: "order-2", daysOpen: 12, orderDate: "2026-03-01" })
            ],
            ownerProfiles,
            { email: "account@example.com", name: "Danick" }
        );

        expect(runs).toHaveLength(1);
        expect(runs[0].recipientEmail).toBe("armand@example.com");
        expect(runs[0].recipientName).toBe("Armand");
        expect(runs[0].reminders).toHaveLength(2);
        expect(runs[0].fingerprint).toBe("order-1:2026-02-26|order-2:2026-03-01");
    });

    it("creates separate runs for different owners with their own emails", () => {
        const ownerProfiles = new Map([
            ["owner-1", { email: "armand@example.com", name: "Armand" }],
            ["owner-2", { email: "penelope@example.com", name: "Penelope" }]
        ]);

        const runs = groupReminderRuns(
            "user-1",
            "2026-W11",
            [
                createReminder({ orderId: "order-1", ownerId: "owner-1" }),
                createReminder({ orderId: "order-2", ownerId: "owner-2", customerName: "Roger" })
            ],
            ownerProfiles,
            { email: "account@example.com", name: "Danick" }
        );

        expect(runs).toHaveLength(2);
        expect(runs.map((run) => run.recipientEmail).sort()).toEqual([
            "armand@example.com",
            "penelope@example.com"
        ]);
    });

    it("falls back to the main account when no owner is assigned", () => {
        const runs = groupReminderRuns(
            "user-1",
            "2026-W11",
            [createReminder({ orderId: "order-1", ownerId: "" })],
            new Map(),
            { email: "account@example.com", name: "Danick" }
        );

        expect(runs).toHaveLength(1);
        expect(runs[0].recipientEmail).toBe("account@example.com");
        expect(runs[0].recipientName).toBe("Danick");
        expect(buildReminderGreeting(runs[0].recipientName)).toBe("Beste Danick,");
    });
});
