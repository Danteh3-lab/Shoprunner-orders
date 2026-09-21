(() => {
    function escapeHtml(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderItems(items) {
        return (items || []).map((item) => `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.weightLabel)}</td>
                <td class="amount">${escapeHtml(item.priceLabel)}</td>
            </tr>
        `).join("");
    }

    function renderCharges(order) {
        return `
            <div class="quotation-charges">
                <h3>Additional charges</h3>
                <div class="quotation-charge-row">
                    <span>Shipping (${escapeHtml(order.shippingTypeLabel)})</span>
                    <span>${escapeHtml(order.shippingLabel)}</span>
                </div>
                <div class="quotation-charge-row">
                    <span>Handling rate</span>
                    <span>${escapeHtml(order.handlingLabel)}</span>
                </div>
                ${order.hasTax ? `
                    <div class="quotation-charge-row">
                        <span>Tax</span>
                        <span>${escapeHtml(order.taxLabel)}</span>
                    </div>
                ` : ""}
            </div>
        `;
    }

    function renderOrderSection(order, index) {
        const notes = order.specialNotes
            ? `<p class="quotation-notes"><strong>Notes:</strong> ${escapeHtml(order.specialNotes)}</p>`
            : "";
        return `
            <section class="quotation-order" aria-labelledby="quotation-order-${index + 1}">
                <div class="quotation-order-header">
                    <div>
                        <h2 id="quotation-order-${index + 1}">Order ${index + 1}</h2>
                        <p>Order date: ${escapeHtml(order.orderDate)}</p>
                    </div>
                    <span class="quotation-order-id">${escapeHtml(order.orderId)}</span>
                </div>
                ${notes}
                <table class="quotation-table">
                    <thead>
                        <tr><th>Description</th><th>Item weight</th><th class="amount">Amount</th></tr>
                    </thead>
                    <tbody>${renderItems(order.items)}</tbody>
                </table>
                ${renderCharges(order)}
                <div class="quotation-subtotal"><span>Order subtotal</span><strong>${escapeHtml(order.subtotalLabel)}</strong></div>
            </section>
        `;
    }

    function buildQuotationHtml(quotation) {
        const sections = (quotation.orders || []).map(renderOrderSection).join("");
        return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Offerte - ${escapeHtml(quotation.customerName)}</title>
    <style>
        :root { color-scheme: light; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #1C2434; background: #fff; font-family: Inter, Arial, sans-serif; font-size: 13px; }
        .quotation { max-width: 860px; margin: 0 auto; padding: 36px 42px; }
        .quotation-header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 2px solid #1C2434; padding-bottom: 18px; margin-bottom: 22px; }
        .quotation-header h1 { margin: 0 0 8px; font-size: 30px; letter-spacing: -0.03em; }
        .quotation-header p, .quotation-meta p, .quotation-order-header p { margin: 3px 0; color: #64748B; }
        .quotation-meta { text-align: right; }
        .quotation-meta strong { color: #1C2434; }
        .quotation-order { border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 0 0 18px; break-inside: avoid; }
        .quotation-order-header { display: flex; justify-content: space-between; gap: 18px; margin-bottom: 14px; }
        .quotation-order-header h2 { margin: 0; font-size: 17px; }
        .quotation-order-id { color: #64748B; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; }
        .quotation-notes { margin: 0 0 14px; padding: 10px 12px; border-left: 3px solid #CBD5E1; background: #F8FAFC; color: #475569; }
        .quotation-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .quotation-table th, .quotation-table td { padding: 9px 8px; border-bottom: 1px solid #E2E8F0; text-align: left; }
        .quotation-table th { color: #64748B; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
        .quotation-table th:nth-child(2), .quotation-table td:nth-child(2) { width: 25%; }
        .quotation-table th:nth-child(3), .quotation-table td:nth-child(3) { width: 22%; }
        .amount { text-align: right !important; }
        .quotation-charges { margin: 14px 0 0 auto; max-width: 420px; }
        .quotation-charges h3 { margin: 0 0 6px; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
        .quotation-charge-row, .quotation-subtotal, .quotation-grand-total { display: flex; justify-content: space-between; gap: 24px; padding: 6px 0; }
        .quotation-charge-row { color: #475569; }
        .quotation-subtotal { border-top: 1px solid #CBD5E1; margin-top: 8px; padding-top: 10px; font-weight: 600; }
        .quotation-grand-total { margin-top: 22px; padding: 16px 0 0; border-top: 2px solid #1C2434; font-size: 18px; font-weight: 700; }
        @media print { .quotation { padding: 18px 0; } .quotation-order { border-color: #CBD5E1; } }
    </style>
</head>
<body>
    <main class="quotation">
        <header class="quotation-header">
            <div><h1>Offerte</h1><p>Shoprunner</p></div>
            <div class="quotation-meta">
                <p><strong>Customer:</strong> ${escapeHtml(quotation.customerName)}</p>
                <p><strong>Issue date:</strong> ${escapeHtml(quotation.issueDate)}</p>
            </div>
        </header>
        ${sections}
        <div class="quotation-grand-total"><span>Grand total</span><span>${escapeHtml(quotation.grandTotalLabel)}</span></div>
    </main>
</body>
</html>`;
    }

    function renderAndPrintQuotation(quotation, printWindow) {
        const html = buildQuotationHtml(quotation);
        if (printWindow && !printWindow.closed) {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                try {
                    printWindow.focus();
                    printWindow.print();
                } catch (error) {
                    // Ignore print focus errors from restrictive browser settings.
                }
            }, 40);
            return html;
        }

        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        document.body.appendChild(iframe);
        const doc = iframe.contentDocument;
        if (!doc) {
            document.body.removeChild(iframe);
            throw new Error("Could not create print preview.");
        }
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } finally {
                if (iframe.parentNode) {
                    iframe.parentNode.removeChild(iframe);
                }
            }
        }, 40);
        return html;
    }

    const api = { buildQuotationHtml, renderAndPrintQuotation };
    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    window.shoprunnerQuotationRenderer = Object.assign({}, window.shoprunnerQuotationRenderer || {}, api);
})();
