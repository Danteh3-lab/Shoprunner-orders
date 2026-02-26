import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";

const require = createRequire(import.meta.url);
const formatters = require("../scripts/dashboard/modules/formatters.js");
const ordersView = require("../scripts/dashboard/modules/orders-view.js");
const routingState = require("../scripts/dashboard/modules/routing-state.js");
const performanceView = require("../scripts/dashboard/modules/performance-view.js");

describe("orders-view date range", () => {
    const constants = {
        DATE_RANGE_LAST_30: "last30",
        DATE_RANGE_THIS_MONTH: "thisMonth",
        DATE_RANGE_MONTH: "month",
        DATE_RANGE_ALL: "all"
    };

    const items = [
        { orderDate: "2026-01-05", customerName: "A", itemName: "Item", ownerId: "o1" },
        { orderDate: "2026-02-12", customerName: "B", itemName: "Item", ownerId: "o1" },
        { orderDate: "2026-03-01", customerName: "C", itemName: "Item", ownerId: "o2" }
    ];

    it("keeps all items when range is all", () => {
        const result = ordersView.applyDateRangeFilter(
            items,
            "all",
            "2026-02",
            constants,
            formatters.parseIsoDate,
            formatters.normalizeMonthKey
        );
        expect(result).toHaveLength(3);
    });

    it("filters by specific month", () => {
        const result = ordersView.applyDateRangeFilter(
            items,
            "month",
            "2026-02",
            constants,
            formatters.parseIsoDate,
            formatters.normalizeMonthKey
        );
        expect(result).toHaveLength(1);
        expect(result[0].orderDate).toBe("2026-02-12");
    });
});

describe("performance logic", () => {
    it("only counts paid+arrived+assigned", () => {
        const hasOwner = (id) => id === "owner-1";
        expect(performanceView.isProfitEligible(
            { paid: true, arrived: true, ownerId: "owner-1" },
            { unassignedOwnerId: "unassigned", getOwnerById: hasOwner }
        )).toBe(true);
        expect(performanceView.isProfitEligible(
            { paid: true, arrived: false, ownerId: "owner-1" },
            { unassignedOwnerId: "unassigned", getOwnerById: hasOwner }
        )).toBe(false);
    });

    it("computes order profit", () => {
        const order = { salePrice: 120, purchasePrice: 90, shippingCost: 10 };
        expect(performanceView.computeOrderProfit(order, formatters.roundMoney)).toBe(20);
    });
});

describe("routing hash state", () => {
    const pages = {
        PAGE_ORDERS: "orders",
        PAGE_OWNER_PERFORMANCE: "owner-performance"
    };
    const periods = {
        PERFORMANCE_PERIOD_THIS_MONTH: "thisMonth",
        PERFORMANCE_PERIOD_LAST_30: "last30",
        PERFORMANCE_PERIOD_MONTH: "month",
        PERFORMANCE_PERIOD_ALL: "all"
    };

    it("roundtrips owner performance month hash", () => {
        const hash = routingState.buildDashboardHash({
            page: "owner-performance",
            period: "month",
            month: "2026-01",
            pages,
            periods,
            normalizeMonthKey: formatters.normalizeMonthKey
        });
        const parsed = routingState.parseDashboardHash(hash, {
            pages,
            periods,
            normalizeMonthKey: formatters.normalizeMonthKey,
            defaultMonth: "2026-03",
            currentPeriod: "thisMonth",
            currentMonth: "2026-03"
        });

        expect(parsed.page).toBe("owner-performance");
        expect(parsed.period).toBe("month");
        expect(parsed.month).toBe("2026-01");
    });
});
