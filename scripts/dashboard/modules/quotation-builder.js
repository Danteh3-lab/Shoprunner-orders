(function (global) {
    "use strict";

    const MINIMUM_ORDERS = 2;

    function normalizeCustomerName(value) {
        return String(value || "").trim().toLocaleLowerCase();
    }

    function normalizeMoney(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function roundMoney(value) {
        return Math.round((normalizeMoney(value) + Number.EPSILON) * 100) / 100;
    }

    function formatValue(formatter, value, fallback) {
        return typeof formatter === "function" ? formatter(value) : fallback;
    }

    function selectOrders(orders, selectedOrderIds) {
        const ids = new Set(Array.from(selectedOrderIds || []).map((id) => String(id).trim()));
        return (orders || []).filter((order) => ids.has(String(order && order.id).trim()));
    }

    function validateQuotationSelection(selectedOrders) {
        const orders = Array.isArray(selectedOrders) ? selectedOrders.filter(Boolean) : [];
        if (orders.length < MINIMUM_ORDERS) {
            return {
                valid: false,
                message: `Select at least ${MINIMUM_ORDERS} orders to create an offerte.`
            };
        }

        const customerKey = normalizeCustomerName(orders[0].customerName);
        const hasMixedCustomers = orders.some(
            (order) => normalizeCustomerName(order.customerName) !== customerKey
        );
        if (hasMixedCustomers) {
            return {
                valid: false,
                message: "Select orders for the same customer to create an offerte."
            };
        }

        return { valid: true, message: "" };
    }

    function normalizeItems(order, options) {
        const items = Array.isArray(order.items) && order.items.length
            ? order.items
            : [{
                name: order.itemName || "Item",
                weightLbs: order.weightLbs,
                price: order.purchasePrice
            }];

        return items.map((item) => ({
            name: String(item.name || "Item"),
            weightLabel: `${normalizeMoney(item.weightLbs).toFixed(2)} lbs`,
            priceLabel: formatValue(options.formatCurrency, item.price, `$${normalizeMoney(item.price).toFixed(2)}`)
        }));
    }

    function buildQuotation(selectedOrders, options = {}) {
        const orders = Array.isArray(selectedOrders) ? selectedOrders.filter(Boolean) : [];
        const formatCurrency = options.formatCurrency;
        const formatDate = options.formatDate;
        const issueDate = options.issueDate || (typeof options.getToday === "function" ? options.getToday() : "");
        const sections = orders.map((order, index) => {
            const subtotal = roundMoney(order.salePrice);
            const taxAmount = normalizeMoney(order.taxAmount);
            const advancePaid = roundMoney(order.advancePaid);
            return {
                orderId: String(order.id || `order-${index + 1}`),
                orderDate: formatValue(formatDate, order.orderDate, String(order.orderDate || "-")),
                items: normalizeItems(order, { formatCurrency }),
                specialNotes: options.includeNotes === false ? "" : String(order.specialNotes || ""),
                shippingTypeLabel: order.shippingType === "sea" ? "Sea" : "Air",
                shippingLabel: formatValue(formatCurrency, order.shippingCost, `$${normalizeMoney(order.shippingCost).toFixed(2)}`),
                handlingLabel: `x${normalizeMoney(order.margin).toFixed(2)}`,
                hasTax: taxAmount > 0,
                taxLabel: formatValue(formatCurrency, taxAmount, `$${taxAmount.toFixed(2)}`),
                subtotal,
                subtotalLabel: formatValue(formatCurrency, subtotal, `$${subtotal.toFixed(2)}`),
                hasAdvance: advancePaid > 0,
                advancePaid,
                advanceLabel: formatValue(formatCurrency, advancePaid, `$${advancePaid.toFixed(2)}`)
            };
        });

        const totalBeforeAdvance = sections.reduce((total, section) => roundMoney(total + section.subtotal), 0);
        const orderAdvanceTotal = sections.reduce((total, section) => roundMoney(total + section.advancePaid), 0);
        const batchAdvance = Math.max(0, roundMoney(options.batchAdvance));
        const advanceTotal = roundMoney(orderAdvanceTotal + batchAdvance);
        const grandTotal = roundMoney(totalBeforeAdvance - advanceTotal);
        return {
            customerName: String(orders[0] && orders[0].customerName ? orders[0].customerName : ""),
            issueDate,
            orders: sections,
            totalBeforeAdvance,
            totalBeforeAdvanceLabel: formatValue(formatCurrency, totalBeforeAdvance, `$${totalBeforeAdvance.toFixed(2)}`),
            hasAdvance: advanceTotal > 0,
            hasOrderAdvance: orderAdvanceTotal > 0,
            orderAdvanceTotal,
            orderAdvanceTotalLabel: formatValue(formatCurrency, orderAdvanceTotal, `$${orderAdvanceTotal.toFixed(2)}`),
            hasBatchAdvance: batchAdvance > 0,
            batchAdvance,
            batchAdvanceLabel: formatValue(formatCurrency, batchAdvance, `$${batchAdvance.toFixed(2)}`),
            advanceTotal,
            advanceTotalLabel: formatValue(formatCurrency, advanceTotal, `$${advanceTotal.toFixed(2)}`),
            grandTotal,
            grandTotalLabel: formatValue(formatCurrency, grandTotal, `$${grandTotal.toFixed(2)}`)
        };
    }

    const api = {
        MINIMUM_ORDERS,
        selectOrders,
        validateQuotationSelection,
        buildQuotation,
        roundMoney
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerQuotationBuilder = Object.assign({}, global.shoprunnerQuotationBuilder || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
