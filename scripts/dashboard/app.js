const STORAGE_KEY = "shoprunner.orders.v1";
const TEAM_STORAGE_KEY = "shoprunner.team.v1";
const SHIPPING_RATE = 4.5;
const ALLOWED_MARGINS = [1.1, 1.15, 1.2];
const OWNER_FILTER_ALL = "all";
const UNASSIGNED_OWNER_ID = "unassigned";
const DEFAULT_TEAM_NAMES = ["Danick", "Armand", "Penelope"];

const OWNER_COLOR_PALETTE = [
    { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
    { bg: "#DBEAFE", text: "#1D4ED8", border: "#93C5FD" },
    { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
    { bg: "#FCE7F3", text: "#9D174D", border: "#F9A8D4" },
    { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
    { bg: "#FFE4E6", text: "#BE123C", border: "#FDA4AF" },
    { bg: "#E0F2FE", text: "#0C4A6E", border: "#7DD3FC" },
    { bg: "#ECFCCB", text: "#365314", border: "#BEF264" }
];

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {string} customerName
 * @property {string} ownerId
 * @property {string} orderDate
 * @property {string} itemName
 * @property {number} purchasePrice
 * @property {number} weightLbs
 * @property {number} margin
 * @property {number} shippingCost
 * @property {number} salePrice
 * @property {number} advancePaid
 * @property {number} remainingDue
 * @property {boolean} arrived
 * @property {boolean} paid
 * @property {string} createdAt
 */

/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 */

let teamMembers = loadTeamMembers();
if (!teamMembers.length) {
    teamMembers = seedDefaultTeamIfMissing();
}

let orders = loadOrders();
let editingOrderId = null;
let selectedOwnerFilter = OWNER_FILTER_ALL;
let searchQuery = "";

const ordersBody = document.getElementById("orders-body");
const newOrderBtn = document.getElementById("new-order-btn");
const ordersSearchInput = document.getElementById("orders-search-input");
const ownerFilterSelect = document.getElementById("owner-filter-select");
const openTeamSettingsBtn = document.getElementById("open-team-settings-btn");

const orderModal = document.getElementById("order-modal");
const orderForm = document.getElementById("order-form");
const ownerSelect = document.getElementById("order-owner-select");
const formError = document.getElementById("form-error");
const modalTitle = document.getElementById("order-modal-title");
const saveOrderBtn = document.getElementById("save-order-btn");
const cancelOrderBtn = document.getElementById("cancel-order-btn");
const deleteOrderBtn = document.getElementById("delete-order-btn");
const calcShipping = document.getElementById("calc-shipping");
const calcSale = document.getElementById("calc-sale");
const calcRemaining = document.getElementById("calc-remaining");

const teamSettingsModal = document.getElementById("team-settings-modal");
const teamMembersList = document.getElementById("team-members-list");
const teamAddForm = document.getElementById("team-add-form");
const teamMemberNameInput = document.getElementById("team-member-name-input");
const teamFormError = document.getElementById("team-form-error");

syncOwnerControls();
renderTable();
updateCalculationPanel();
renderTeamMembersList();

newOrderBtn.addEventListener("click", openCreateModal);
cancelOrderBtn.addEventListener("click", closeOrderModal);
if (deleteOrderBtn) {
    deleteOrderBtn.addEventListener("click", handleDeleteFromModal);
}
openTeamSettingsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    openTeamModal();
});

document.querySelectorAll("[data-close-order-modal]").forEach((node) => {
    node.addEventListener("click", closeOrderModal);
});

document.querySelectorAll("[data-close-team-modal]").forEach((node) => {
    node.addEventListener("click", closeTeamModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    if (!teamSettingsModal.classList.contains("hidden")) {
        closeTeamModal();
        return;
    }

    if (!orderModal.classList.contains("hidden")) {
        closeOrderModal();
    }
});

ordersBody.addEventListener("click", (event) => {
    const actionNode = event.target.closest("[data-action]");
    if (!actionNode) {
        return;
    }

    const action = actionNode.dataset.action;
    const orderId = actionNode.dataset.orderId;
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        return;
    }

    if (action === "edit") {
        openEditModal(orderId);
        return;
    }

    if (action === "toggle-arrived") {
        order.arrived = !order.arrived;
    }

    if (action === "toggle-paid") {
        order.paid = !order.paid;
    }

    saveOrders();
    renderTable();
});

ordersBody.addEventListener("dblclick", (event) => {
    const ignoredTarget = event.target.closest(".status-toggle, input[type='checkbox'], .action-btn, .col-actions");
    if (ignoredTarget) {
        return;
    }

    const row = event.target.closest("tr[data-order-id]");
    if (!row || !row.dataset.orderId) {
        return;
    }

    openEditModal(row.dataset.orderId);
});

ownerFilterSelect.addEventListener("change", () => {
    selectedOwnerFilter = ownerFilterSelect.value;
    renderTable();
});

ordersSearchInput.addEventListener("input", () => {
    searchQuery = String(ordersSearchInput.value || "").trim().toLowerCase();
    renderTable();
});

orderForm.addEventListener("input", () => {
    formError.classList.add("hidden");
    updateCalculationPanel();
});

orderForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitForm();
});

teamAddForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addTeamMember();
});

teamMembersList.addEventListener("click", (event) => {
    const actionNode = event.target.closest("[data-team-action]");
    if (!actionNode) {
        return;
    }

    const memberId = actionNode.dataset.memberId;
    if (!memberId) {
        return;
    }

    const action = actionNode.dataset.teamAction;

    if (action === "rename") {
        const input = teamMembersList.querySelector(`input[data-member-id="${cssEscape(memberId)}"]`);
        if (!input) {
            return;
        }
        renameTeamMember(memberId, input.value);
        return;
    }

    if (action === "remove") {
        removeTeamMember(memberId);
    }
});

function submitForm() {
    if (!orderForm.checkValidity()) {
        orderForm.reportValidity();
        return;
    }

    const formValues = getFormValues();
    const validationError = validateFormValues(formValues);

    if (validationError) {
        showFormError(validationError);
        return;
    }

    const computed = getComputedValues(formValues);
    const currentDateTime = new Date().toISOString();
    const existing = editingOrderId ? orders.find((order) => order.id === editingOrderId) : null;

    /** @type {Order} */
    const nextOrder = {
        id: existing ? existing.id : createOrderId(),
        customerName: formValues.customerName,
        ownerId: formValues.ownerId,
        orderDate: formValues.orderDate,
        itemName: formValues.itemName,
        purchasePrice: formValues.purchasePrice,
        weightLbs: formValues.weightLbs,
        margin: formValues.margin,
        shippingCost: computed.shippingCost,
        salePrice: computed.salePrice,
        advancePaid: formValues.advancePaid,
        remainingDue: computed.remainingDue,
        arrived: existing ? existing.arrived : false,
        paid: existing ? existing.paid : false,
        createdAt: existing ? existing.createdAt : currentDateTime
    };

    if (existing) {
        orders = orders.map((order) => (order.id === nextOrder.id ? nextOrder : order));
    } else {
        orders.unshift(nextOrder);
    }

    saveOrders();
    renderTable();
    closeOrderModal();
}

function openCreateModal() {
    editingOrderId = null;
    modalTitle.textContent = "New Order";
    saveOrderBtn.textContent = "Save Order";
    setDeleteButtonVisibility(false);
    populateOwnerSelect(getDefaultOwnerId());
    resetForm({
        customerName: "",
        ownerId: getDefaultOwnerId(),
        orderDate: getTodayIso(),
        itemName: "",
        purchasePrice: "",
        weightLbs: "",
        margin: "1.1",
        advancePaid: "0"
    });
    openOrderModal();
}

function openEditModal(orderId) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        return;
    }

    editingOrderId = orderId;
    modalTitle.textContent = "Edit Order";
    saveOrderBtn.textContent = "Update Order";
    setDeleteButtonVisibility(true);
    const prefilledOwnerId = isValidTeamOwnerId(order.ownerId) ? order.ownerId : "";
    populateOwnerSelect(prefilledOwnerId);
    resetForm({
        customerName: order.customerName,
        ownerId: prefilledOwnerId,
        orderDate: order.orderDate,
        itemName: order.itemName,
        purchasePrice: order.purchasePrice.toFixed(2),
        weightLbs: order.weightLbs.toFixed(2),
        margin: String(order.margin),
        advancePaid: order.advancePaid.toFixed(2)
    });
    openOrderModal();
}

function resetForm(values) {
    orderForm.reset();
    formError.textContent = "";
    formError.classList.add("hidden");

    Object.entries(values).forEach(([key, value]) => {
        const field = orderForm.elements.namedItem(key);
        if (field) {
            field.value = value;
        }
    });

    updateCalculationPanel();
}

function openOrderModal() {
    orderModal.classList.remove("hidden");
    orderModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const customerField = orderForm.elements.namedItem("customerName");
    if (customerField) {
        customerField.focus();
    }
}

function closeOrderModal() {
    orderModal.classList.add("hidden");
    orderModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    setDeleteButtonVisibility(false);
    editingOrderId = null;
}

function setDeleteButtonVisibility(isEditMode) {
    if (!deleteOrderBtn) {
        return;
    }

    deleteOrderBtn.classList.toggle("hidden", !isEditMode);
    deleteOrderBtn.disabled = !isEditMode;
}

function handleDeleteFromModal() {
    if (!editingOrderId) {
        return;
    }

    deleteOrder(editingOrderId);
}

function deleteOrder(orderId) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        return;
    }

    const confirmed = window.confirm(
        `Delete order for ${order.customerName} on ${formatDateNl(order.orderDate)}?\n\nThis cannot be undone.`
    );
    if (!confirmed) {
        return;
    }

    orders = orders.filter((item) => item.id !== orderId);
    saveOrders();
    renderTable();
    closeOrderModal();
}

function openTeamModal() {
    teamFormError.classList.add("hidden");
    renderTeamMembersList();
    teamSettingsModal.classList.remove("hidden");
    teamSettingsModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    teamMemberNameInput.focus();
}

function closeTeamModal() {
    teamSettingsModal.classList.add("hidden");
    teamSettingsModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
}

function showFormError(message) {
    formError.textContent = message;
    formError.classList.remove("hidden");
}

function showTeamError(message) {
    teamFormError.textContent = message;
    teamFormError.classList.remove("hidden");
}

function clearTeamError() {
    teamFormError.textContent = "";
    teamFormError.classList.add("hidden");
}

function getFormValues() {
    const customerName = String(orderForm.elements.namedItem("customerName").value || "").trim();
    const ownerId = String(orderForm.elements.namedItem("ownerId").value || "").trim();
    const orderDate = String(orderForm.elements.namedItem("orderDate").value || "");
    const itemName = String(orderForm.elements.namedItem("itemName").value || "").trim();
    const purchasePrice = parseNumber(orderForm.elements.namedItem("purchasePrice").value);
    const weightLbs = parseNumber(orderForm.elements.namedItem("weightLbs").value);
    const margin = parseNumber(orderForm.elements.namedItem("margin").value);
    const advancePaid = parseNumber(orderForm.elements.namedItem("advancePaid").value);

    return {
        customerName,
        ownerId,
        orderDate,
        itemName,
        purchasePrice,
        weightLbs,
        margin,
        advancePaid
    };
}

function validateFormValues(values) {
    if (!teamMembers.length) {
        return "Add at least one team member in Settings before saving an order.";
    }
    if (!values.customerName) {
        return "Customer name is required.";
    }
    if (!values.ownerId) {
        return "Owner is required.";
    }
    if (!isValidTeamOwnerId(values.ownerId)) {
        return "Please choose a valid owner.";
    }
    if (!values.orderDate || !/^\d{4}-\d{2}-\d{2}$/.test(values.orderDate)) {
        return "Please provide a valid date.";
    }
    if (!values.itemName) {
        return "Item is required.";
    }
    if (!Number.isFinite(values.purchasePrice) || values.purchasePrice < 0) {
        return "Purchase price must be a non-negative number.";
    }
    if (!Number.isFinite(values.weightLbs) || values.weightLbs < 0) {
        return "Weight must be a non-negative number.";
    }
    if (!ALLOWED_MARGINS.includes(values.margin)) {
        return "Margin must be one of: 1.10, 1.15, 1.20.";
    }
    if (!Number.isFinite(values.advancePaid) || values.advancePaid < 0) {
        return "Advance must be a non-negative number.";
    }
    return "";
}

function getComputedValues(values) {
    const shippingCost = calculateShipping(values.weightLbs);
    const salePrice = calculateSalePrice(values.purchasePrice, shippingCost, values.margin);
    const remainingDue = calculateRemaining(salePrice, values.advancePaid);

    return {
        shippingCost,
        salePrice,
        remainingDue
    };
}

function updateCalculationPanel() {
    const values = getFormValues();
    const computed = getComputedValues(values);
    calcShipping.textContent = formatCurrency(computed.shippingCost);
    calcSale.textContent = formatCurrency(computed.salePrice);
    calcRemaining.textContent = formatCurrency(computed.remainingDue);
}

function calculateShipping(weightLbs) {
    return roundMoney(parseNumber(weightLbs) * SHIPPING_RATE);
}

function calculateSalePrice(purchasePrice, shippingCost, margin) {
    return roundMoney((parseNumber(purchasePrice) + parseNumber(shippingCost)) * parseNumber(margin));
}

function calculateRemaining(salePrice, advancePaid) {
    return roundMoney(parseNumber(salePrice) - parseNumber(advancePaid));
}

function roundMoney(value) {
    const numeric = parseNumber(value);
    return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function parseNumber(value) {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function renderTable() {
    const visibleOrders = applySearchFilter(applyOwnerFilter(orders));
    if (!visibleOrders.length) {
        if (searchQuery) {
            renderEmptyState("Geen orders gevonden voor deze zoekopdracht.");
        } else {
            renderEmptyState(
                selectedOwnerFilter === OWNER_FILTER_ALL
                    ? "No orders yet. Click New order to create your first one."
                    : "No orders found for the selected owner."
            );
        }
        return;
    }

    const rows = visibleOrders
        .slice()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map((order) => {
            const customerInitials = getInitials(order.customerName);
            const marginLabel = order.margin.toFixed(2);
            const remainingClass = order.remainingDue < 0 ? "amount-negative" : "";

            return `
                <tr data-order-id="${escapeHtml(order.id)}">
                    <td><input type="checkbox"></td>
                    <td>
                        <div class="user-cell">
                            <div class="user-avatar user-avatar-initials">${escapeHtml(customerInitials)}</div>
                            <div class="name-inline">
                                <span>${escapeHtml(order.customerName)}</span>
                                ${renderOwnerInitialBadge(order.ownerId)}
                            </div>
                        </div>
                    </td>
                    <td>${formatDateNl(order.orderDate)}</td>
                    <td>${escapeHtml(order.itemName)}</td>
                    <td>${formatCurrency(order.purchasePrice)}</td>
                    <td>${order.weightLbs.toFixed(2)} lbs</td>
                    <td>${formatCurrency(order.shippingCost)}</td>
                    <td>${marginLabel}</td>
                    <td>${formatCurrency(order.advancePaid)}</td>
                    <td>${formatCurrency(order.salePrice)}</td>
                    <td class="${remainingClass}">${formatCurrency(order.remainingDue)}</td>
                    <td>${renderStatusToggle("arrived", order.arrived, order.id)}</td>
                    <td>${renderStatusToggle("paid", order.paid, order.id)}</td>
                    <td class="col-actions">
                        <button class="action-btn" type="button" data-action="edit" data-order-id="${escapeHtml(order.id)}" aria-label="Edit order">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                    </td>
                </tr>
            `;
        })
        .join("");

    ordersBody.innerHTML = rows;
}

function renderEmptyState(message) {
    ordersBody.innerHTML = `
        <tr>
            <td colspan="14">
                <div class="empty-state">
                    <i class="ph ph-package"></i>
                    <p>${escapeHtml(message)}</p>
                </div>
            </td>
        </tr>
    `;
}

function renderStatusToggle(type, active, orderId) {
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

function renderOwnerInitialBadge(ownerId) {
    const member = getTeamMemberById(ownerId);
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

    const color = getOwnerColor(member.name);
    const style = `style="--owner-bg:${color.bg}; --owner-text:${color.text}; --owner-border:${color.border};"`;
    return `
        <span
            class="owner-initial-badge"
            ${style}
            title="${escapeHtml(member.name)}"
            aria-label="Owner: ${escapeHtml(member.name)}"
        >
            ${escapeHtml(getInitials(member.name))}
        </span>
    `;
}

function getOwnerColor(name) {
    let hash = 0;
    for (let index = 0; index < name.length; index += 1) {
        hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
    }
    const colorIndex = hash % OWNER_COLOR_PALETTE.length;
    return OWNER_COLOR_PALETTE[colorIndex];
}

function applyOwnerFilter(items) {
    if (selectedOwnerFilter === OWNER_FILTER_ALL) {
        return items;
    }
    if (selectedOwnerFilter === UNASSIGNED_OWNER_ID) {
        return items.filter((order) => order.ownerId === UNASSIGNED_OWNER_ID);
    }
    return items.filter((order) => order.ownerId === selectedOwnerFilter);
}

function applySearchFilter(items) {
    if (!searchQuery) {
        return items;
    }

    return items.filter((order) => {
        const customer = String(order.customerName || "").toLowerCase();
        const item = String(order.itemName || "").toLowerCase();
        return customer.includes(searchQuery) || item.includes(searchQuery);
    });
}

function syncOwnerControls() {
    populateOwnerSelect(ownerSelect.value || getDefaultOwnerId());
    populateOwnerFilterSelect();
}

function populateOwnerSelect(selectedId) {
    const options = [
        '<option value="">Select owner</option>',
        ...teamMembers.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
    ];
    ownerSelect.innerHTML = options.join("");

    if (selectedId && isValidTeamOwnerId(selectedId)) {
        ownerSelect.value = selectedId;
        return;
    }

    if (selectedId === "") {
        ownerSelect.value = "";
        return;
    }

    ownerSelect.value = getDefaultOwnerId();
}

function populateOwnerFilterSelect() {
    const previousValue = selectedOwnerFilter;
    const options = [
        '<option value="all">All owners</option>',
        '<option value="unassigned">Unassigned</option>',
        ...teamMembers.map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
    ];

    ownerFilterSelect.innerHTML = options.join("");

    const nextFilterIsValid =
        previousValue === OWNER_FILTER_ALL ||
        previousValue === UNASSIGNED_OWNER_ID ||
        isValidTeamOwnerId(previousValue);

    selectedOwnerFilter = nextFilterIsValid ? previousValue : OWNER_FILTER_ALL;
    ownerFilterSelect.value = selectedOwnerFilter;
}

function addTeamMember() {
    clearTeamError();
    const rawName = String(teamMemberNameInput.value || "").trim();
    if (!rawName) {
        showTeamError("Team member name is required.");
        return;
    }
    if (rawName.length < 2) {
        showTeamError("Team member name must be at least 2 characters.");
        return;
    }

    const duplicate = teamMembers.some((member) => member.name.toLowerCase() === rawName.toLowerCase());
    if (duplicate) {
        showTeamError("A team member with this name already exists.");
        return;
    }

    teamMembers.push({
        id: createTeamMemberId(),
        name: rawName,
        createdAt: new Date().toISOString()
    });

    teamMemberNameInput.value = "";
    persistAndRefreshTeam();
}

function renameTeamMember(memberId, nextNameRaw) {
    clearTeamError();
    const nextName = String(nextNameRaw || "").trim();
    if (!nextName) {
        showTeamError("Name cannot be empty.");
        return;
    }
    if (nextName.length < 2) {
        showTeamError("Name must be at least 2 characters.");
        return;
    }

    const member = teamMembers.find((item) => item.id === memberId);
    if (!member) {
        showTeamError("Team member not found.");
        return;
    }

    const duplicate = teamMembers.some(
        (item) => item.id !== memberId && item.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
        showTeamError("Another team member already uses that name.");
        return;
    }

    teamMembers = teamMembers.map((item) => (item.id === memberId ? { ...item, name: nextName } : item));
    persistAndRefreshTeam();
}

function removeTeamMember(memberId) {
    clearTeamError();
    if (teamMembers.length <= 1) {
        showTeamError("At least one team member is required.");
        return;
    }

    const assignedCount = getAssignedOrderCount(memberId);
    if (assignedCount > 0) {
        showTeamError("Cannot remove this team member because orders are still assigned.");
        return;
    }

    teamMembers = teamMembers.filter((member) => member.id !== memberId);
    persistAndRefreshTeam();
}

function persistAndRefreshTeam() {
    saveTeamMembers();
    syncOwnerControls();
    renderTeamMembersList();
    renderTable();
}

function renderTeamMembersList() {
    if (!teamMembers.length) {
        teamMembersList.innerHTML = '<p class="team-empty">No team members available.</p>';
        return;
    }

    teamMembersList.innerHTML = teamMembers
        .map((member) => {
            const assignedCount = getAssignedOrderCount(member.id);
            const removeDisabled = assignedCount > 0 || teamMembers.length <= 1;
            const removeTitle = assignedCount > 0 ? "Reassign orders first" : "Remove member";

            return `
                <div class="team-row">
                    <input
                        type="text"
                        class="team-name-input"
                        data-member-id="${escapeHtml(member.id)}"
                        maxlength="80"
                        value="${escapeHtml(member.name)}"
                    />
                    <span class="team-order-count">${assignedCount} orders</span>
                    <button type="button" class="btn btn-secondary team-btn" data-team-action="rename" data-member-id="${escapeHtml(member.id)}">Save</button>
                    <button type="button" class="btn btn-secondary team-btn team-btn-danger" title="${escapeHtml(removeTitle)}" data-team-action="remove" data-member-id="${escapeHtml(member.id)}" ${removeDisabled ? "disabled" : ""}>Remove</button>
                </div>
            `;
        })
        .join("");
}

function getAssignedOrderCount(memberId) {
    return orders.filter((order) => order.ownerId === memberId).length;
}

function loadTeamMembers() {
    const raw = localStorage.getItem(TEAM_STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        /** @type {TeamMember[]} */
        const normalized = [];
        const seenIds = new Set();

        parsed.forEach((entry) => {
            if (!entry || typeof entry !== "object") {
                return;
            }

            const id = String(entry.id || "").trim();
            const name = String(entry.name || "").trim();
            const createdAtInput = String(entry.createdAt || "");
            const createdAtMs = Date.parse(createdAtInput);
            const createdAt = Number.isNaN(createdAtMs) ? new Date().toISOString() : new Date(createdAtMs).toISOString();

            if (!id || !name || seenIds.has(id)) {
                return;
            }

            seenIds.add(id);
            normalized.push({ id, name, createdAt });
        });

        return normalized;
    } catch (error) {
        return [];
    }
}

function seedDefaultTeamIfMissing() {
    const seeded = DEFAULT_TEAM_NAMES.map((name) => ({
        id: createTeamMemberId(),
        name,
        createdAt: new Date().toISOString()
    }));

    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
}

function saveTeamMembers() {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamMembers));
}

function loadOrders() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed
            .map((entry) => normalizeOrder(entry))
            .filter((entry) => entry !== null);
    } catch (error) {
        return [];
    }
}

function normalizeOrder(value) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const customerName = String(value.customerName || "").trim();
    const orderDate = String(value.orderDate || "");
    const itemName = String(value.itemName || "").trim();
    const purchasePrice = parseNumber(value.purchasePrice);
    const weightLbs = parseNumber(value.weightLbs);
    const margin = parseNumber(value.margin);
    const advancePaid = parseNumber(value.advancePaid);
    const id = String(value.id || "");
    const ownerIdRaw = String(value.ownerId || "");
    const ownerId = isValidTeamOwnerId(ownerIdRaw) ? ownerIdRaw : UNASSIGNED_OWNER_ID;
    const createdAtInput = String(value.createdAt || "");
    const createdAtMs = Date.parse(createdAtInput);
    const createdAt = Number.isNaN(createdAtMs) ? new Date().toISOString() : new Date(createdAtMs).toISOString();

    if (!id || !customerName || !itemName) {
        return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
        return null;
    }
    if (purchasePrice < 0 || weightLbs < 0 || advancePaid < 0) {
        return null;
    }
    if (!ALLOWED_MARGINS.includes(margin)) {
        return null;
    }

    const shippingCost = calculateShipping(weightLbs);
    const salePrice = calculateSalePrice(purchasePrice, shippingCost, margin);
    const remainingDue = calculateRemaining(salePrice, advancePaid);

    /** @type {Order} */
    const normalized = {
        id,
        customerName,
        ownerId,
        orderDate,
        itemName,
        purchasePrice: roundMoney(purchasePrice),
        weightLbs: roundMoney(weightLbs),
        margin,
        shippingCost,
        salePrice,
        advancePaid: roundMoney(advancePaid),
        remainingDue,
        arrived: Boolean(value.arrived),
        paid: Boolean(value.paid),
        createdAt
    };

    return normalized;
}

function saveOrders() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function isValidTeamOwnerId(ownerId) {
    return teamMembers.some((member) => member.id === ownerId);
}

function getTeamMemberById(ownerId) {
    if (!ownerId || ownerId === UNASSIGNED_OWNER_ID) {
        return null;
    }
    return teamMembers.find((member) => member.id === ownerId) || null;
}

function getDefaultOwnerId() {
    return teamMembers[0] ? teamMembers[0].id : "";
}

function createOrderId() {
    return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createTeamMemberId() {
    return `tm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTodayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatDateNl(isoDate) {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return "-";
    }
    const [year, month, day] = isoDate.split("-");
    return `${day}-${month}-${year}`;
}

function formatCurrency(value) {
    return `$${roundMoney(value).toFixed(2)}`;
}

function getInitials(name) {
    const clean = String(name || "").trim();
    if (!clean) {
        return "NA";
    }

    const parts = clean.split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0].toUpperCase()).join("");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function cssEscape(value) {
    return String(value).replace(/["\\]/g, "\\$&");
}
