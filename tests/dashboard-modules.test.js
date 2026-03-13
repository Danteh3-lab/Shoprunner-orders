import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const formatters = require("../scripts/dashboard/modules/formatters.js");
const ordersView = require("../scripts/dashboard/modules/orders-view.js");
const routingState = require("../scripts/dashboard/modules/routing-state.js");
const notifications = require("../scripts/dashboard/modules/notifications.js");
const orderNormalization = require("../scripts/dashboard/modules/order-normalization.js");
const ordersRendering = require("../scripts/dashboard/modules/orders-rendering.js");
const dashboardEvents = require("../scripts/dashboard/modules/dashboard-events.js");

const ORDER_CONSTANTS = {
    OWNER_FILTER_ALL: "all",
    UNASSIGNED_OWNER_ID: "unassigned",
    DATE_RANGE_LAST_30: "last30",
    DATE_RANGE_THIS_MONTH: "thisMonth",
    DATE_RANGE_MONTH: "month",
    DATE_RANGE_ALL: "all"
};

describe("orders-view helpers", () => {
    it("normalizes unknown ranges to last30", () => {
        expect(ordersView.normalizeDateRange("??", ORDER_CONSTANTS)).toBe("last30");
        expect(ordersView.normalizeDateRange("all", ORDER_CONSTANTS)).toBe("all");
    });

    it("filters unassigned owner only", () => {
        const items = [
            { ownerId: "unassigned" },
            { ownerId: "owner-a" }
        ];
        const result = ordersView.applyOwnerFilter(items, "unassigned", ORDER_CONSTANTS);
        expect(result).toHaveLength(1);
        expect(result[0].ownerId).toBe("unassigned");
    });

    it("searches by customer and item name", () => {
        const items = [
            { customerName: "Danick", itemName: "SSD", items: [{ name: "SSD" }] },
            { customerName: "Penelope", itemName: "Router" }
        ];
        expect(ordersView.applySearchFilter(items, "dan")).toHaveLength(1);
        expect(ordersView.applySearchFilter(items, "router")).toHaveLength(1);
        expect(ordersView.applySearchFilter([
            { customerName: "Penelope", itemName: "JBL speaker +1 more", items: [{ name: "JBL speaker" }, { name: "JBL box" }] }
        ], "box")).toHaveLength(1);
    });

    it("sorts filtered items by latest createdAt", () => {
        const items = [
            { ownerId: "owner-a", customerName: "A", itemName: "SSD", orderDate: "2026-02-04", createdAt: "2026-02-04T10:00:00.000Z" },
            { ownerId: "owner-a", customerName: "B", itemName: "Case", orderDate: "2026-02-03", createdAt: "2026-02-05T10:00:00.000Z" }
        ];

        const result = ordersView.getFilteredSortedOrders(items, {
            selectedOwnerFilter: "owner-a",
            searchQuery: "",
            selectedDateRange: "all",
            selectedMonth: "2026-02",
            parseIsoDate: formatters.parseIsoDate,
            normalizeMonthKey: formatters.normalizeMonthKey,
            constants: ORDER_CONSTANTS
        });

        expect(result).toHaveLength(2);
        expect(result[0].customerName).toBe("B");
        expect(result[1].customerName).toBe("A");
    });

    it("returns empty-state text for all-time filter", () => {
        const message = ordersView.getEmptyStateMessage({
            searchQuery: "",
            selectedOwnerFilter: "all",
            selectedDateRange: "all",
            constants: ORDER_CONSTANTS
        });
        expect(message).toBe("No orders found.");
    });

    it("builds condensed pagination with ellipsis", () => {
        const items = ordersView.buildPaginationItems(5, 10);
        expect(items).toContain("ellipsis");
        expect(items).toContain(1);
        expect(items).toContain(10);
    });
});

describe("routing-state robustness", () => {
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

    it("falls back to default month when hash month is invalid", () => {
        const fallbackMonth = formatters.normalizeMonthKey("2026-99");
        const parsed = routingState.parseDashboardHash("#owner-performance?period=month&month=2026-99", {
            pages,
            periods,
            normalizeMonthKey: formatters.normalizeMonthKey,
            defaultMonth: "2026-03",
            currentPeriod: "thisMonth",
            currentMonth: "2026-03"
        });

        expect(parsed.month).toBe(fallbackMonth);
    });

    it("builds orders hash when page is unknown", () => {
        const hash = routingState.buildDashboardHash({
            page: "invalid-page",
            period: "all",
            month: "2026-01",
            pages,
            periods,
            normalizeMonthKey: formatters.normalizeMonthKey
        });
        expect(hash).toBe("#orders");
    });
});

describe("notifications helpers", () => {
    it("shows badge only when fingerprint changed", () => {
        expect(notifications.shouldShowNotificationBadge("a|b", "a|b")).toBe(false);
        expect(notifications.shouldShowNotificationBadge("a|b", "a")).toBe(true);
        expect(notifications.shouldShowNotificationBadge("", "a")).toBe(false);
    });

    it("renders reminder html entries", () => {
        const html = notifications.renderNotificationItemsHtml(
            [
                {
                    customerName: "Danick",
                    orderDate: "2026-02-10",
                    daysOpen: 10,
                    orderId: "order-1"
                }
            ],
            {
                formatDate: (value) => value,
                escapeHtml: (value) => String(value).replace(/</g, "&lt;")
            }
        );
        expect(html).toContain("Danick");
        expect(html).toContain("data-notification-order-id=\"order-1\"");
    });
});

describe("dashboard dom contracts", () => {
    it("contains key controls for orders and performance filters", () => {
        const htmlPath = path.resolve(process.cwd(), "index.html");
        const html = fs.readFileSync(htmlPath, "utf8");
        const dom = new JSDOM(html);
        const document = dom.window.document;

        const dateRange = document.getElementById("date-range-select");
        const dateOptions = Array.from(dateRange.querySelectorAll("option")).map((node) => node.value);
        expect(dateOptions).toContain("all");

        const performancePeriod = document.getElementById("owner-performance-period");
        const performanceOptions = Array.from(performancePeriod.querySelectorAll("option")).map((node) => node.value);
        expect(performanceOptions).toContain("month");

        const monthInput = document.getElementById("owner-performance-month");
        expect(monthInput).toBeTruthy();
        expect(monthInput.getAttribute("type")).toBe("month");

        const taxInput = document.querySelector('input[name="taxAmount"]');
        expect(taxInput).toBeTruthy();
        expect(document.getElementById("calc-profit")).toBeTruthy();
        expect(document.getElementById("mobile-nav-toggle")).toBeTruthy();
        expect(document.getElementById("app-sidebar")).toBeTruthy();
        expect(document.getElementById("sidebar-backdrop")).toBeTruthy();

        const orderItemsList = document.getElementById("order-items-list");
        expect(orderItemsList).toBeTruthy();

        const addOrderItemBtn = document.getElementById("add-order-item-btn");
        expect(addOrderItemBtn).toBeTruthy();
    });
});

describe("order normalization module", () => {
    it("deduplicates and limits item links", () => {
        const links = orderNormalization.normalizeItemLinks(
            ["https://a.com", "https://a.com", " https://b.com "],
            2
        );
        expect(links).toEqual(["https://a.com", "https://b.com"]);
    });

    it("normalizes valid order payload", () => {
        const normalized = orderNormalization.normalizeOrder(
            {
                id: "ord-1",
                customer_name: "Danick",
                owner_id: "owner-1",
                order_date: "2026-02-12",
                item_name: "SSD",
                purchase_price: 100,
                tax_amount: 10,
                weight_lbs: 2,
                shipping_type: "air",
                length_in: 0,
                width_in: 0,
                height_in: 0,
                margin: 1.1,
                advance_paid: 20,
                arrived: false,
                paid: false
            },
            {
                allowedMargins: [1, 1.1],
                maxItemLinks: 20,
                unassignedOwnerId: "unassigned",
                isValidTeamOwnerId: (id) => id === "owner-1",
                parseNumber: formatters.parseNumber,
                roundMoney: formatters.roundMoney,
                calculateShipping: () => 9,
                calculateSalePrice: () => 120,
                calculateRemaining: () => 100
            }
        );
        expect(normalized).toBeTruthy();
        expect(normalized.ownerId).toBe("owner-1");
        expect(normalized.itemName).toBe("SSD");
        expect(normalized.taxAmount).toBe(10);
        expect(normalized.items).toEqual([{ name: "SSD", price: 100, weightLbs: 2 }]);
    });

    it("uses tax when deriving sale price from components", () => {
        const normalized = orderNormalization.normalizeOrder(
            {
                id: "ord-2",
                customer_name: "Danick",
                owner_id: "owner-1",
                order_date: "2026-02-12",
                item_name: "Router",
                purchase_price: 100,
                tax_amount: 10,
                weight_lbs: 2,
                shipping_type: "air",
                margin: 1.1,
                advance_paid: 20,
                arrived: false,
                paid: false
            },
            {
                allowedMargins: [1, 1.1],
                maxItemLinks: 20,
                unassignedOwnerId: "unassigned",
                isValidTeamOwnerId: (id) => id === "owner-1",
                parseNumber: formatters.parseNumber,
                roundMoney: formatters.roundMoney,
                calculateShipping: () => 9,
                calculateSalePrice: (purchasePrice, shippingCost, margin, taxAmount) =>
                    formatters.roundMoney(purchasePrice + shippingCost + taxAmount),
                calculateRemaining: (salePrice, advancePaid) => formatters.roundMoney(salePrice - advancePaid)
            }
        );

        expect(normalized).toBeTruthy();
        expect(normalized.salePrice).toBe(119);
        expect(normalized.remainingDue).toBe(99);
    });

    it("prefers multi-item arrays and derives summary totals", () => {
        const normalized = orderNormalization.normalizeOrder(
            {
                id: "ord-3",
                customer_name: "Danick",
                owner_id: "owner-1",
                order_date: "2026-02-12",
                items: [
                    { name: "JBL speaker", price: 40, weightLbs: 4 },
                    { name: "JBL box", price: 100, weightLbs: 8 }
                ],
                tax_amount: 10,
                shipping_type: "air",
                margin: 1.1,
                advance_paid: 20,
                arrived: false,
                paid: false
            },
            {
                allowedMargins: [1, 1.1],
                maxItemLinks: 20,
                unassignedOwnerId: "unassigned",
                isValidTeamOwnerId: (id) => id === "owner-1",
                parseNumber: formatters.parseNumber,
                roundMoney: formatters.roundMoney,
                calculateShipping: (value) => formatters.roundMoney(value.weightLbs * 4.5),
                calculateSalePrice: (purchasePrice, shippingCost, margin, taxAmount) =>
                    formatters.roundMoney((purchasePrice + shippingCost + taxAmount) * margin),
                calculateRemaining: (salePrice, advancePaid) => formatters.roundMoney(salePrice - advancePaid)
            }
        );

        expect(normalized).toBeTruthy();
        expect(normalized.items).toHaveLength(2);
        expect(normalized.purchasePrice).toBe(140);
        expect(normalized.weightLbs).toBe(12);
        expect(normalized.itemName).toBe("JBL speaker +1 more");
        expect(normalized.shippingCost).toBe(54);
    });
});

describe("orders rendering module", () => {
    it("renders rows html with status toggles", () => {
        const html = ordersRendering.renderListRowsHtml(
            [
                {
                    id: "ord-1",
                    customerName: "Danick",
                    ownerId: "owner-1",
                    orderDate: "2026-02-10",
                    itemName: "SSD",
                    purchasePrice: 100,
                    weightLbs: 2,
                    shippingCost: 9,
                    margin: 1.1,
                    advancePaid: 20,
                    salePrice: 140,
                    remainingDue: 120,
                    arrived: false,
                    paid: true,
                    itemLinks: ["https://a.com"]
                }
            ],
            {
                escapeHtml: (value) => String(value),
                formatDateNl: (value) => value,
                formatCurrency: (value) => `$${value}`,
                formatWeightDisplay: () => "2.00 lbs",
                renderShippingCostCell: () => "$9.00",
                renderOrderLinkAction: () => "<button>link</button>",
                getTeamMemberById: () => ({ id: "owner-1", name: "Danick" }),
                getInitials: () => "D",
                ownerPalette: [{ bg: "#000", text: "#111", border: "#222" }],
                unassignedOwnerId: "unassigned"
            }
        );
        expect(html).toContain("data-action=\"toggle-arrived\"");
        expect(html).toContain("data-action=\"toggle-paid\"");
        expect(html).toContain("Danick");
    });
});

describe("dashboard events module", () => {
    it("does not stack listeners when unbound and rebound", () => {
        const dom = new JSDOM(`
            <button id="mobile-nav-toggle"></button>
            <button id="sidebar-backdrop"></button>
            <button id="new-order-btn"></button>
            <button id="cancel-order-btn"></button>
            <div id="notification-panel"></div>
            <button id="notification-btn"></button>
            <div id="notification-list"></div>
            <table><tbody id="orders-body"></tbody></table>
            <div id="orders-grid"></div>
            <select id="owner-filter-select"></select>
            <input id="orders-search-input" />
            <select id="date-range-select"></select>
            <button id="orders-view-list"></button>
            <button id="orders-view-grid"></button>
            <select id="owner-performance-period"></select>
            <input id="owner-performance-month" />
            <button id="pagination-prev"></button>
            <button id="pagination-next"></button>
            <div id="pagination-pages"></div>
            <form id="order-form"></form>
            <button id="add-item-link-btn"></button>
            <input id="item-link-input" />
            <div id="item-links-preview"></div>
            <form id="team-add-form"></form>
            <div id="team-members-list"></div>
        `);

        globalThis.document = dom.window.document;
        globalThis.window = dom.window;

        let openCreateCount = 0;
        const baseDeps = {
            elements: {
                mobileNavToggleBtn: dom.window.document.getElementById("mobile-nav-toggle"),
                sidebarBackdrop: dom.window.document.getElementById("sidebar-backdrop"),
                newOrderBtn: dom.window.document.getElementById("new-order-btn"),
                cancelOrderBtn: dom.window.document.getElementById("cancel-order-btn"),
                notificationPanel: dom.window.document.getElementById("notification-panel"),
                notificationBtn: dom.window.document.getElementById("notification-btn"),
                notificationList: dom.window.document.getElementById("notification-list"),
                ordersBody: dom.window.document.getElementById("orders-body"),
                ordersGrid: dom.window.document.getElementById("orders-grid"),
                ownerFilterSelect: dom.window.document.getElementById("owner-filter-select"),
                ordersSearchInput: dom.window.document.getElementById("orders-search-input"),
                dateRangeSelect: dom.window.document.getElementById("date-range-select"),
                ordersViewListBtn: dom.window.document.getElementById("orders-view-list"),
                ordersViewGridBtn: dom.window.document.getElementById("orders-view-grid"),
                ownerPerformancePeriodSelect: dom.window.document.getElementById("owner-performance-period"),
                ownerPerformanceMonthInput: dom.window.document.getElementById("owner-performance-month"),
                paginationPrevBtn: dom.window.document.getElementById("pagination-prev"),
                paginationNextBtn: dom.window.document.getElementById("pagination-next"),
                paginationPages: dom.window.document.getElementById("pagination-pages"),
                orderForm: dom.window.document.getElementById("order-form"),
                addItemLinkBtn: dom.window.document.getElementById("add-item-link-btn"),
                itemLinkInput: dom.window.document.getElementById("item-link-input"),
                itemLinksPreview: dom.window.document.getElementById("item-links-preview"),
                teamAddForm: dom.window.document.getElementById("team-add-form"),
                teamMembersList: dom.window.document.getElementById("team-members-list"),
                closeOrderModalNodes: [],
                closeTeamModalNodes: [],
                closeOrderLinksModalNodes: [],
                closeChangelogModalNodes: []
            },
            handlers: {
                toggleMobileSidebar: () => {},
                closeMobileSidebar: () => {},
                openCreateModal: () => { openCreateCount += 1; },
                closeOrderModal: () => {},
                openTeamModal: () => {},
                openOrdersPage: () => {},
                openOwnerPerformancePage: () => {},
                handleHashChange: () => {},
                openChangelogModal: () => {},
                toggleNotificationPanel: () => {},
                closeNotificationPanel: () => {},
                closeOrderLinksModal: () => {},
                closeChangelogModal: () => {},
                closeTeamModal: () => {},
                openNotificationOrder: () => {},
                handleOrderActionEvent: async () => {},
                openEditModal: () => {},
                handleOwnerFilterChange: () => {},
                handleOrdersSearchInput: () => {},
                handleDateRangeChange: () => {},
                showListView: () => {},
                showGridView: () => {},
                handlePerformancePeriodChange: () => {},
                handlePerformanceMonthChange: () => {},
                goToPreviousPage: () => {},
                goToNextPage: () => {},
                handlePaginationClick: () => {},
                handleOrderFormInput: () => {},
                handleOrderFormChange: () => {},
                handleAddItemLink: () => {},
                removeItemLinkByIndex: () => {},
                submitForm: async () => {},
                addTeamMember: async () => {},
                handleTeamListAction: async () => {}
            },
            state: {
                isMobileSidebarOpen: () => false,
                isNotificationPanelOpen: () => false,
                isOrderLinksModalOpen: () => false,
                isChangelogModalOpen: () => false,
                isTeamModalOpen: () => false,
                isOrderModalOpen: () => false
            }
        };

        const unbindFirst = dashboardEvents.bindDashboardEvents(baseDeps);
        unbindFirst();
        const unbindSecond = dashboardEvents.bindDashboardEvents(baseDeps);

        baseDeps.elements.newOrderBtn.click();
        expect(openCreateCount).toBe(1);

        unbindSecond();
        delete globalThis.document;
        delete globalThis.window;
    });
});
