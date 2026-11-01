import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const orderSelection = require("../scripts/dashboard/modules/order-selection.js");
const quotationBuilder = require("../scripts/dashboard/modules/quotation-builder.js");
const ordersRendering = require("../scripts/dashboard/modules/orders-rendering.js");
const quotationRendererSource = fs.readFileSync(
    path.resolve("scripts/dashboard/quotation-renderer.js"),
    "utf8"
);

const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function createOrder(overrides = {}) {
    return {
        id: "order-1",
        customerName: "Customer",
        orderDate: "2026-08-22",
        itemName: "Espresso Maker",
        items: [{ name: "Espresso Maker", weightLbs: 12, price: 99.99 }],
        specialNotes: "Leave at front desk",
        purchasePrice: 99.99,
        weightLbs: 12,
        shippingType: "air",
        shippingCost: 54,
        margin: 1.15,
        taxAmount: 10,
        salePrice: 188.54,
        ...overrides
    };
}

function createRenderer() {
    const sandbox = { window: {}, setTimeout, clearTimeout };
    vm.runInNewContext(quotationRendererSource, sandbox);
    return sandbox.window.shoprunnerQuotationRenderer;
}

describe("order selection", () => {
    it("selects and clears only the visible page", () => {
        const pageItems = [{ id: "order-1" }, { id: "order-2" }];
        let selected = orderSelection.toggleSelection(new Set(), "order-1", true);

        expect(Array.from(selected)).toEqual(["order-1"]);
        expect(orderSelection.getPageSelectionState(selected, pageItems)).toMatchObject({
            selectedPageCount: 1,
            allSelected: false,
            someSelected: true
        });

        selected = orderSelection.togglePageSelection(selected, pageItems, true);
        expect(Array.from(selected).sort()).toEqual(["order-1", "order-2"]);
        expect(orderSelection.pruneToPage(selected, [{ id: "order-2" }])).toEqual(new Set(["order-2"]));
    });
});

describe("order selection controls", () => {
    const options = {
        escapeHtml,
        getInitials: () => "CU",
        getTeamMemberById: () => null,
        ownerPalette: [],
        formatDateNl: (value) => value,
        formatCurrency: (value) => `$${Number(value).toFixed(2)}`,
        formatWeightDisplay: () => "12.00 lbs",
        renderShippingCostCell: () => "$54.00",
        renderOrderLinkAction: () => "",
        isOrderSelected: (orderId) => orderId === "order-1"
    };

    it("renders selected checkboxes in both list rows and grid cards", () => {
        const orders = [createOrder()];
        const listHtml = ordersRendering.renderListRowsHtml(orders, options);
        const gridHtml = ordersRendering.renderGridHtml(orders, options);

        expect(listHtml).toContain('data-order-selection');
        expect(listHtml).toContain('data-order-id="order-1"');
        expect(listHtml).toContain("checked");
        expect(gridHtml).toContain('data-order-selection');
        expect(gridHtml).toContain("checked");
    });
});

describe("quotation builder", () => {
    const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;
    const options = {
        formatCurrency,
        formatDate: (value) => `formatted:${value}`,
        issueDate: "22/08/2026"
    };

    it("rejects fewer than two orders and mixed customers", () => {
        expect(quotationBuilder.validateQuotationSelection([createOrder()]).valid).toBe(false);
        expect(quotationBuilder.validateQuotationSelection([
            createOrder({ id: "order-1", customerName: "Alice" }),
            createOrder({ id: "order-2", customerName: "Bob" })
        ])).toMatchObject({ valid: false });
    });

    it("preserves order pricing details and sums existing totals", () => {
        const quotation = quotationBuilder.buildQuotation([
            createOrder({ id: "order-1", salePrice: 188.54 }),
            createOrder({ id: "order-2", salePrice: 42.46, shippingCost: 4.5, taxAmount: 0 })
        ], options);

        expect(quotation.customerName).toBe("Customer");
        expect(quotation.orders).toHaveLength(2);
        expect(quotation.orders[0]).toMatchObject({
            shippingLabel: "$54.00",
            handlingLabel: "x1.15",
            taxLabel: "$10.00",
            subtotalLabel: "$188.54",
            specialNotes: "Leave at front desk"
        });
        expect(quotation.orders[1].shippingLabel).toBe("$4.50");
        expect(quotation.orders[1].hasTax).toBe(false);
        expect(quotation.grandTotal).toBe(231);
        expect(quotation.grandTotalLabel).toBe("$231.00");
        expect(quotation.hasAdvance).toBe(false);
    });

    it("subtracts advance payments from the grand total", () => {
        const quotation = quotationBuilder.buildQuotation([
            createOrder({ id: "order-1", salePrice: 188.54, advancePaid: 50 }),
            createOrder({ id: "order-2", salePrice: 42.46, advancePaid: 10.5 })
        ], options);

        expect(quotation.orders[0]).toMatchObject({ hasAdvance: true, advanceLabel: "$50.00" });
        expect(quotation.totalBeforeAdvance).toBe(231);
        expect(quotation.advanceTotal).toBe(60.5);
        expect(quotation.grandTotal).toBe(170.5);
        expect(quotation.grandTotalLabel).toBe("$170.50");

        const html = createRenderer().buildQuotationHtml(quotation);
        expect(html).toContain("Advance paid");
        expect(html).toContain("-$60.50");
        expect(html).toContain("$170.50");
    });

    it("subtracts a batch advance from the grand total", () => {
        const orders = [
            createOrder({ id: "order-1", salePrice: 188.54 }),
            createOrder({ id: "order-2", salePrice: 42.46 })
        ];
        const quotation = quotationBuilder.buildQuotation(orders, { ...options, batchAdvance: 100 });

        expect(quotation.hasBatchAdvance).toBe(true);
        expect(quotation.orders.every((order) => !order.hasAdvance)).toBe(true);
        expect(quotation.grandTotal).toBe(131);

        const html = createRenderer().buildQuotationHtml(quotation);
        expect(html).toContain("-$100.00");
        expect(html).toContain("$131.00");
        expect(html).not.toContain("(batch)");

        const combined = quotationBuilder.buildQuotation(
            [createOrder({ id: "order-1", salePrice: 188.54, advancePaid: 20 }), orders[1]],
            { ...options, batchAdvance: 100 }
        );
        expect(combined.grandTotal).toBe(111);
        expect(createRenderer().buildQuotationHtml(combined)).toContain("Advance paid (batch)");
    });
});

describe("quotation renderer", () => {
    it("escapes customer, notes, items, and labels while preserving combined totals", () => {
        const renderer = createRenderer();
        const html = renderer.buildQuotationHtml({
            customerName: "<img src=x onerror=alert(1)>",
            issueDate: "22/08/2026",
            grandTotalLabel: "$231.00",
            orders: [{
                orderId: "order-1\" onmouseover=alert(1)",
                orderDate: "22/08/2026",
                specialNotes: "<script>alert(1)</script>",
                items: [{ name: "<b>Item</b>", weightLabel: "12.00 lbs", priceLabel: "$99.99" }],
                shippingTypeLabel: "Air",
                shippingLabel: "$54.00",
                handlingLabel: "x1.15",
                hasTax: true,
                taxLabel: "$10.00",
                subtotalLabel: "$188.54"
            }]
        });

        expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
        expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
        expect(html).toContain("&lt;b&gt;Item&lt;/b&gt;");
        expect(html).not.toContain("<script>alert(1)</script>");
        expect(html).toContain("$231.00");
        expect(html.match(/12\.00 lbs/g)).toHaveLength(1);
    });
});
