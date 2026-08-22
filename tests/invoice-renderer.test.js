import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const rendererSource = fs.readFileSync(
    path.resolve("scripts/dashboard/invoice-renderer.js"),
    "utf8"
);

function renderInvoice(invoice) {
    const writtenHtml = [];
    const sandbox = {
        window: {},
        setTimeout,
        clearTimeout
    };
    vm.runInNewContext(rendererSource, sandbox);

    const printWindow = {
        closed: false,
        document: {
            open() {},
            write(html) {
                writtenHtml.push(html);
            },
            close() {},
            querySelectorAll() {
                return [];
            }
        },
        focus() {},
        print() {}
    };

    sandbox.window.shoprunnerInvoiceRenderer.renderAndPrintInvoice(invoice, printWindow);
    return writtenHtml[0];
}

function createInvoice(overrides = {}) {
    return {
        invoiceId: "INV-1001",
        issueDate: "22/08/2026",
        orderDate: "22/08/2026",
        customerName: "Customer",
        companyName: "Shoprunner",
        companyAddress: "Address",
        companyEmail: "support@shoprunner.com",
        companyPhone: "555-0100",
        logoPath: "logo.png",
        shippingTypeLabel: "Air",
        items: [
            { name: "Espresso Maker", weightLabel: "12.00 lbs", priceLabel: "$99.99" }
        ],
        hasTax: true,
        taxLabel: "$10.00",
        shippingLabel: "$54.00",
        handlingLabel: "x1.15",
        totalLabel: "$188.54",
        advanceLabel: "$0.00",
        remainingLabel: "$188.54",
        arrived: false,
        paid: false,
        ...overrides
    };
}

describe("invoice renderer layout", () => {
    it("keeps product details separate from additional charges", () => {
        const html = renderInvoice(createInvoice());

        expect(html).toContain("Item weight");
        expect(html).toContain("Espresso Maker</td>");
        expect(html.match(/12\.00 lbs/g)).toHaveLength(1);
        expect(html).toContain("<h2>Additional charges</h2>");
        expect(html).toContain("<span>Shipping (Air)</span>");
        expect(html).toContain("<span class=\"charge-value\">$54.00</span>");
        expect(html).toContain("<span>Handling rate</span>");
        expect(html).not.toContain("<td>Shipping (Air)</td>");
        expect(html).toContain("$54.00");
        expect(html).toContain("x1.15");
        expect(html).toContain("$10.00");
        expect(html).toContain("$188.54");
    });

    it("keeps each item weight for multi-item invoices", () => {
        const html = renderInvoice(createInvoice({
            items: [
                { name: "JBL speaker", weightLabel: "4.00 lbs", priceLabel: "$40.00" },
                { name: "JBL box", weightLabel: "8.00 lbs", priceLabel: "$100.00" }
            ],
            totalWeightLabel: "12.00 lbs"
        }));

        expect(html.match(/4\.00 lbs/g)).toHaveLength(1);
        expect(html.match(/8\.00 lbs/g)).toHaveLength(1);
        expect(html).not.toContain("12.00 lbs");
        expect(html).toContain("<h2>Additional charges</h2>");
        expect(html).toContain("<span>Shipping (Air)</span>");
        expect(html).not.toContain("<td>Shipping (Air)</td>");
    });
});
