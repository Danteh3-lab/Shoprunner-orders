(function (global) {
    "use strict";

    function normalizeShippingType(value) {
        return String(value || "").toLowerCase() === "sea" ? "sea" : "air";
    }

    function normalizeItemLinks(value, maxCount) {
        const raw = Array.isArray(value) ? value : [];
        const unique = [];
        const seen = new Set();
        const safeMax = Number.isFinite(maxCount) ? Math.max(1, Math.trunc(maxCount)) : 20;

        for (const linkValue of raw) {
            const link = String(linkValue || "").trim();
            if (!link || seen.has(link)) {
                continue;
            }
            seen.add(link);
            unique.push(link);
            if (unique.length >= safeMax) {
                break;
            }
        }

        return unique;
    }

    function validateItemLinks(links, options) {
        const itemLinks = Array.isArray(links) ? links : [];
        if (itemLinks.length > options.maxCount) {
            return `You can add up to ${options.maxCount} item links.`;
        }

        for (const link of itemLinks) {
            const parsed = options.parseHttpUrl(link);
            if (!parsed) {
                return "Each item link must be a valid URL (http/https).";
            }
        }

        return "";
    }

    function normalizeTeamMember(value, options) {
        if (!value || typeof value !== "object") {
            return null;
        }

        const id = String(value.id || "").trim();
        const name = String(value.name || "").trim();
        const emailInput = options.normalizeEmailInput(value.email);
        const email = options.isValidEmailFormat(emailInput) ? emailInput : "";
        const createdAtInput = String(value.createdAt || value.created_at || "");
        const createdAtMs = Date.parse(createdAtInput);
        const createdAt = Number.isNaN(createdAtMs) ? new Date().toISOString() : new Date(createdAtMs).toISOString();

        if (!id || !name) {
            return null;
        }

        return { id, name, email, createdAt };
    }

    function normalizeOrder(value, options) {
        if (!value || typeof value !== "object") {
            return null;
        }

        const customerName = String(value.customerName || value.customer_name || "").trim();
        const orderDate = String(value.orderDate || value.order_date || "");
        const itemName = String(value.itemName || value.item_name || "").trim();
        const itemLinks = normalizeItemLinks(value.itemLinks ?? value.item_links, options.maxItemLinks);
        const specialNotes = String(value.specialNotes ?? value.special_notes ?? "").trim().slice(0, 500);
        const purchasePrice = options.parseNumber(value.purchasePrice ?? value.purchase_price);
        const shippingType = normalizeShippingType(value.shippingType ?? value.shipping_type);
        const weightLbs = options.parseNumber(value.weightLbs ?? value.weight_lbs);
        const lengthIn = options.parseNumber(value.lengthIn ?? value.length_in);
        const widthIn = options.parseNumber(value.widthIn ?? value.width_in);
        const heightIn = options.parseNumber(value.heightIn ?? value.height_in);
        const margin = options.parseNumber(value.margin);
        const advancePaid = options.parseNumber(value.advancePaid ?? value.advance_paid);
        const id = String(value.id || "");
        const ownerIdRaw = String(value.ownerId || value.owner_id || "");
        const ownerId = options.isValidTeamOwnerId(ownerIdRaw) ? ownerIdRaw : options.unassignedOwnerId;
        const invoiceId = String(value.invoiceId || value.invoice_id || "").trim();
        const invoiceIssuedAtInput = String(value.invoiceIssuedAt || value.invoice_issued_at || "");
        const invoiceIssuedAtMs = Date.parse(invoiceIssuedAtInput);
        const invoiceIssuedAt = Number.isNaN(invoiceIssuedAtMs) ? "" : new Date(invoiceIssuedAtMs).toISOString();
        const createdAtInput = String(value.createdAt || value.created_at || "");
        const createdAtMs = Date.parse(createdAtInput);
        const createdAt = Number.isNaN(createdAtMs) ? new Date().toISOString() : new Date(createdAtMs).toISOString();

        if (!id || !customerName || !itemName) {
            return null;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
            return null;
        }
        if (purchasePrice < 0 || weightLbs < 0 || advancePaid < 0 || lengthIn < 0 || widthIn < 0 || heightIn < 0) {
            return null;
        }
        if (!options.allowedMargins.includes(margin)) {
            return null;
        }

        const computedShippingCost = options.calculateShipping({ shippingType, weightLbs, lengthIn, widthIn, heightIn });
        const rawShippingCost = Number.parseFloat(value.shippingCost ?? value.shipping_cost);
        const shippingCost = Number.isFinite(rawShippingCost) ? options.roundMoney(rawShippingCost) : computedShippingCost;
        const rawSalePrice = Number.parseFloat(value.salePrice ?? value.sale_price);
        const salePrice = Number.isFinite(rawSalePrice)
            ? options.roundMoney(rawSalePrice)
            : options.calculateSalePrice(purchasePrice, shippingCost, margin);
        const rawRemainingDue = Number.parseFloat(value.remainingDue ?? value.remaining_due);
        const remainingDue = Number.isFinite(rawRemainingDue)
            ? options.roundMoney(rawRemainingDue)
            : options.calculateRemaining(salePrice, advancePaid);

        return {
            id,
            customerName,
            ownerId,
            orderDate,
            itemName,
            itemLinks,
            specialNotes,
            purchasePrice: options.roundMoney(purchasePrice),
            weightLbs: options.roundMoney(weightLbs),
            shippingType,
            lengthIn: options.roundMoney(lengthIn),
            widthIn: options.roundMoney(widthIn),
            heightIn: options.roundMoney(heightIn),
            margin,
            shippingCost,
            salePrice,
            advancePaid: options.roundMoney(advancePaid),
            remainingDue,
            arrived: Boolean(value.arrived),
            paid: Boolean(value.paid),
            invoiceId,
            invoiceIssuedAt,
            createdAt
        };
    }

    const api = {
        normalizeShippingType,
        normalizeItemLinks,
        validateItemLinks,
        normalizeTeamMember,
        normalizeOrder
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerOrderNormalization = Object.assign({}, global.shoprunnerOrderNormalization || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
