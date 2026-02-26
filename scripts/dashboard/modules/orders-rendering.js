(function (global) {
    "use strict";

    function getOwnerColor(name, ownerPalette) {
        let hash = 0;
        for (let index = 0; index < name.length; index += 1) {
            hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
        }
        const safePalette = Array.isArray(ownerPalette) && ownerPalette.length
            ? ownerPalette
            : [{ bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" }];
        const colorIndex = hash % safePalette.length;
        return safePalette[colorIndex];
    }

    function renderStatusToggle(type, active, orderId, escapeHtml) {
        const label = type === "arrived" ? "Arrived" : "Paid";
        const icon = active ? "ph-check-circle" : "ph-circle";
        const stateClass = active ? "is-active" : "";
        const action = type === "arrived" ? "toggle-arrived" : "toggle-paid";

        return `
        <button
            type="button"
            class="status-toggle ${type} ${stateClass}"
            data-action="${action}"
            data-order-id="${escapeHtml(orderId)}"
            aria-pressed="${active}"
        >
            <i class="ph ${icon}"></i>
            <span>${label}</span>
        </button>
    `;
    }

    function renderOwnerInitialBadge(ownerId, options) {
        const member = options.getTeamMemberById(ownerId);
        if (!member) {
            return `
            <span
                class="owner-initial-badge unassigned"
                title="Unassigned"
                aria-label="Owner: Unassigned"
            >
                UN
            </span>
        `;
        }

        const color = getOwnerColor(member.name, options.ownerPalette);
        const style = `style="--owner-bg:${color.bg}; --owner-text:${color.text}; --owner-border:${color.border};"`;
        return `
        <span
            class="owner-initial-badge"
            ${style}
            title="${options.escapeHtml(member.name)}"
            aria-label="Owner: ${options.escapeHtml(member.name)}"
        >
            ${options.escapeHtml(options.getInitials(member.name))}
        </span>
    `;
    }

    function renderListRowsHtml(pageItems, options) {
        return pageItems
            .map((order) => {
                const customerInitials = options.getInitials(order.customerName);
                const marginLabel = order.margin.toFixed(2);
                const remainingClass = order.remainingDue < 0 ? "amount-negative" : "";

                return `
                <tr data-order-id="${options.escapeHtml(order.id)}">
                    <td><input type="checkbox"></td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar user-avatar-initials">${options.escapeHtml(customerInitials)}</div>
                            <div class="name-inline">
                                <span>${options.escapeHtml(order.customerName)}</span>
                                ${renderOwnerInitialBadge(order.ownerId, options)}
                            </div>
                        </div>
                    </td>
                    <td>${options.formatDateNl(order.orderDate)}</td>
                    <td>${options.escapeHtml(order.itemName)}</td>
                    <td>${options.formatCurrency(order.purchasePrice)}</td>
                    <td>${options.escapeHtml(options.formatWeightDisplay(order))}</td>
                    <td>${options.renderShippingCostCell(order)}</td>
                    <td>${marginLabel}</td>
                    <td>${options.formatCurrency(order.advancePaid)}</td>
                    <td>${options.formatCurrency(order.salePrice)}</td>
                    <td class="${remainingClass}">${options.formatCurrency(order.remainingDue)}</td>
                    <td>${renderStatusToggle("arrived", order.arrived, order.id, options.escapeHtml)}</td>
                    <td>${renderStatusToggle("paid", order.paid, order.id, options.escapeHtml)}</td>
                    <td class="col-actions">
                        <div class="action-btn-group">
                            ${options.renderOrderLinkAction(order)}
                            <button class="action-btn" type="button" data-action="edit" data-order-id="${options.escapeHtml(order.id)}" aria-label="Edit order">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            })
            .join("");
    }

    function renderGridHtml(pageItems, options) {
        return pageItems
            .map((order) => {
                const customerInitials = options.getInitials(order.customerName);
                const marginLabel = order.margin.toFixed(2);
                const remainingClass = order.remainingDue < 0 ? "amount-negative" : "";

                return `
                <article class="order-card" data-order-id="${options.escapeHtml(order.id)}">
                    <div class="order-card-header">
                        <div class="user-cell">
                            <div class="user-avatar user-avatar-initials">${options.escapeHtml(customerInitials)}</div>
                            <div class="name-inline">
                                <span>${options.escapeHtml(order.customerName)}</span>
                                ${renderOwnerInitialBadge(order.ownerId, options)}
                            </div>
                        </div>
                        <div class="action-btn-group">
                            ${options.renderOrderLinkAction(order)}
                            <button class="action-btn" type="button" data-action="edit" data-order-id="${options.escapeHtml(order.id)}" aria-label="Edit order">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        </div>
                    </div>
                    <div class="order-card-meta">
                        <span>${options.formatDateNl(order.orderDate)}</span>
                        <span>${options.escapeHtml(order.itemName)}</span>
                    </div>
                    <dl class="order-card-metrics">
                        <div>
                            <dt>Purchase</dt>
                            <dd>${options.formatCurrency(order.purchasePrice)}</dd>
                        </div>
                        <div>
                            <dt>Weight</dt>
                            <dd>${options.escapeHtml(options.formatWeightDisplay(order))}</dd>
                        </div>
                        <div>
                            <dt>Shipping</dt>
                            <dd>${options.renderShippingCostCell(order)}</dd>
                        </div>
                        <div>
                            <dt>Margin</dt>
                            <dd>${marginLabel}</dd>
                        </div>
                        <div>
                            <dt>Advance</dt>
                            <dd>${options.formatCurrency(order.advancePaid)}</dd>
                        </div>
                        <div>
                            <dt>Total</dt>
                            <dd>${options.formatCurrency(order.salePrice)}</dd>
                        </div>
                        <div>
                            <dt>Remaining</dt>
                            <dd class="${remainingClass}">${options.formatCurrency(order.remainingDue)}</dd>
                        </div>
                    </dl>
                    <div class="order-card-status">
                        ${renderStatusToggle("arrived", order.arrived, order.id, options.escapeHtml)}
                        ${renderStatusToggle("paid", order.paid, order.id, options.escapeHtml)}
                    </div>
                </article>
            `;
            })
            .join("");
    }

    const api = {
        getOwnerColor,
        renderStatusToggle,
        renderOwnerInitialBadge,
        renderListRowsHtml,
        renderGridHtml
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerOrdersRendering = Object.assign({}, global.shoprunnerOrdersRendering || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
