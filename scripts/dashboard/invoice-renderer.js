(() => {
    function renderAndPrintInvoice(invoice, printWindow) {
        const html = buildInvoiceHtml(invoice);

        if (printWindow && !printWindow.closed) {
            renderInWindow(printWindow, html);
            return;
        }

        renderInIframe(html);
    }

    function renderInWindow(targetWindow, html) {
        targetWindow.document.open();
        targetWindow.document.write(html);
        targetWindow.document.close();
        waitForAssets(targetWindow.document).then(() => {
            try {
                targetWindow.focus();
                targetWindow.print();
            } catch (error) {
                // Ignore print focus errors from restrictive browser settings.
            }
        });
    }

    function renderInIframe(html) {
        const iframe = document.createElement("iframe");
        iframe.setAttribute("aria-hidden", "true");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!doc || !iframe.contentWindow) {
            document.body.removeChild(iframe);
            throw new Error("Could not create print preview.");
        }

        doc.open();
        doc.write(html);
        doc.close();

        waitForAssets(doc).then(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (error) {
                // Ignore print invocation errors.
            } finally {
                setTimeout(() => {
                    if (iframe.parentNode) {
                        iframe.parentNode.removeChild(iframe);
                    }
                }, 1200);
            }
        });
    }

    function waitForAssets(doc) {
        return new Promise((resolve) => {
            const images = Array.from(doc.images || []);
            if (!images.length) {
                setTimeout(resolve, 40);
                return;
            }

            let pending = 0;
            let done = false;

            const finish = () => {
                if (done) {
                    return;
                }
                done = true;
                resolve();
            };

            const onAssetDone = () => {
                pending -= 1;
                if (pending <= 0) {
                    finish();
                }
            };

            images.forEach((img) => {
                if (img.complete && img.naturalWidth > 0) {
                    return;
                }
                pending += 1;
                img.addEventListener("load", onAssetDone, { once: true });
                img.addEventListener("error", onAssetDone, { once: true });
            });

            if (pending <= 0) {
                setTimeout(resolve, 40);
                return;
            }

            setTimeout(finish, 2200);
        });
    }

    function buildInvoiceHtml(invoice) {
        const statusParts = [];
        statusParts.push(invoice.arrived ? "Arrived" : "Not arrived");
        statusParts.push(invoice.paid ? "Paid" : "Unpaid");
        const paidStampHtml = invoice.paid
            ? '<div class="paid-stamp" aria-hidden="true">PAID</div>'
            : "";
        const specialNotes = String(invoice.specialNotes || "").trim();
        const notesHtml = specialNotes
            ? `<section class="section"><h2>Special notes</h2><p class="notes-text">${escapeHtml(specialNotes)}</p></section>`
            : "";
        const shippingTypeLabel = String(invoice.shippingTypeLabel || "Air").trim() || "Air";
        const dimensionsLabel = String(invoice.dimensionsLabel || "").trim();
        const dimensionsRowHtml = dimensionsLabel
            ? `<tr><td>Dimensions (in)</td><td class="amount">${escapeHtml(dimensionsLabel)}</td></tr>`
            : "";

        return `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>Invoice ${escapeHtml(invoice.invoiceId)}</title>
    <style>
        :root {
            --ink: #0f172a;
            --muted: #64748b;
            --line: #dbe2ea;
            --brand: #0f2a59;
            --bg-soft: #f8fafc;
        }
        * { box-sizing: border-box; }
        html, body {
            margin: 0;
            padding: 0;
            color: var(--ink);
            font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
            background: #fff;
        }
        @page { size: A4; margin: 18mm 14mm; }
        .invoice {
            max-width: 860px;
            margin: 18px auto;
            padding: 22px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: #fff;
            position: relative;
        }
        .paid-stamp {
            position: absolute;
            top: 45%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-22deg);
            font-size: 78px;
            font-weight: 800;
            letter-spacing: 0.12em;
            color: rgba(220, 38, 38, 0.16);
            border: 6px solid rgba(220, 38, 38, 0.30);
            padding: 8px 26px;
            border-radius: 10px;
            pointer-events: none;
            user-select: none;
            text-transform: uppercase;
            line-height: 1;
            white-space: nowrap;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--line);
        }
        .logo-wrap {
            min-width: 300px;
        }
        .logo-wrap img {
            width: 320px;
            height: 98px;
            max-width: 100%;
            object-fit: cover;
            object-position: center center;
            display: block;
            margin-bottom: 10px;
        }
        .company-meta {
            margin: 0;
            color: var(--muted);
            font-size: 13px;
            line-height: 1.5;
        }
        .invoice-meta {
            text-align: right;
        }
        .invoice-meta h1 {
            margin: 0 0 10px;
            font-size: 30px;
            letter-spacing: 0.06em;
            color: var(--brand);
        }
        .meta-grid {
            border: 1px solid var(--line);
            border-radius: 10px;
            overflow: hidden;
        }
        .meta-row {
            display: grid;
            grid-template-columns: 115px 1fr;
            border-bottom: 1px solid var(--line);
            font-size: 13px;
        }
        .meta-row:last-child { border-bottom: 0; }
        .meta-row span {
            padding: 8px 10px;
            display: block;
        }
        .meta-row span:first-child {
            background: var(--bg-soft);
            color: var(--muted);
        }
        .section {
            margin-top: 18px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 10px;
        }
        .section h2 {
            margin: 0 0 8px;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--muted);
        }
        .bill-name {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
        }
        .notes-text {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            white-space: pre-wrap;
            color: var(--ink);
        }
        .items {
            width: 100%;
            border-collapse: collapse;
            margin-top: 18px;
        }
        .items th, .items td {
            border-bottom: 1px solid var(--line);
            padding: 11px 6px;
            text-align: left;
            font-size: 14px;
        }
        .items th {
            color: var(--muted);
            font-size: 12px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }
        .items td.amount, .items th.amount {
            text-align: right;
            white-space: nowrap;
        }
        .summary {
            margin-top: 14px;
            margin-left: auto;
            width: min(360px, 100%);
            border: 1px solid var(--line);
            border-radius: 10px;
            overflow: hidden;
        }
        .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            font-size: 14px;
            border-bottom: 1px solid var(--line);
        }
        .summary-row:last-child {
            border-bottom: 0;
            font-weight: 700;
            font-size: 16px;
            background: var(--bg-soft);
        }
        .status {
            margin-top: 16px;
            color: var(--muted);
            font-size: 13px;
        }
        .status strong { color: var(--ink); }
        @media print {
            .invoice {
                margin: 0;
                border: 0;
                border-radius: 0;
                padding: 0;
                max-width: none;
            }
            .paid-stamp {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <article class="invoice">
        ${paidStampHtml}
        <header class="header">
            <div class="logo-wrap">
                <img src="${escapeAttribute(invoice.logoPath)}" alt="Company logo">
                <p class="company-meta">${escapeHtml(invoice.companyName)}<br>${escapeHtml(invoice.companyAddress)}<br>${escapeHtml(invoice.companyEmail)}<br>${escapeHtml(invoice.companyPhone)}</p>
            </div>
            <section class="invoice-meta">
                <h1>Invoice</h1>
                <div class="meta-grid">
                    <div class="meta-row"><span>Invoice ID</span><span>${escapeHtml(invoice.invoiceId)}</span></div>
                    <div class="meta-row"><span>Issue Date</span><span>${escapeHtml(invoice.issueDate)}</span></div>
                    <div class="meta-row"><span>Order Date</span><span>${escapeHtml(invoice.orderDate)}</span></div>
                </div>
            </section>
        </header>

        <section class="section">
            <h2>Bill To</h2>
            <p class="bill-name">${escapeHtml(invoice.customerName)}</p>
        </section>

        ${notesHtml}

        <table class="items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="amount">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Item (${escapeHtml(invoice.itemName)})</td>
                    <td class="amount">${escapeHtml(invoice.purchaseLabel)}</td>
                </tr>
                <tr>
                    <td>Shipping</td>
                    <td class="amount">${escapeHtml(invoice.shippingLabel)}</td>
                </tr>
                <tr>
                    <td>Shipping type</td>
                    <td class="amount">${escapeHtml(shippingTypeLabel)}</td>
                </tr>
                ${dimensionsRowHtml}
                <tr>
                    <td>Handling rate</td>
                    <td class="amount">${escapeHtml(invoice.handlingLabel)}</td>
                </tr>
            </tbody>
        </table>

        <div class="summary">
            <div class="summary-row"><span>Total</span><span>${escapeHtml(invoice.totalLabel)}</span></div>
            <div class="summary-row"><span>Advance paid</span><span>${escapeHtml(invoice.advanceLabel)}</span></div>
            <div class="summary-row"><span>Remaining due</span><span>${escapeHtml(invoice.remainingLabel)}</span></div>
        </div>

        <p class="status"><strong>Status:</strong> ${escapeHtml(statusParts.join(" • "))}</p>
    </article>
</body>
</html>`;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttribute(value) {
        return escapeHtml(value);
    }

    window.shoprunnerInvoiceRenderer = {
        renderAndPrintInvoice
    };
})();

