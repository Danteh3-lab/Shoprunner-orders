const LEGACY_STORAGE_KEY = "shoprunner.orders.v1";
const LEGACY_TEAM_STORAGE_KEY = "shoprunner.team.v1";
const AIR_SHIPPING_RATE = 4.5;
const SEA_CUBE_DIVISOR = 1728;
const SEA_RATE_PER_CUBE = 15;
const ALLOWED_MARGINS = [1.1, 1.15, 1.2];
const OWNER_FILTER_ALL = "all";
const UNASSIGNED_OWNER_ID = "unassigned";
const DEFAULT_TEAM_NAMES = ["Danick", "Armand", "Penelope"];
const DATA_LOAD_ERROR_MESSAGE = "Could not load cloud data. Please refresh and try again.";
const DATE_RANGE_LAST_30 = "last30";
const DATE_RANGE_THIS_MONTH = "thisMonth";
const VIEW_MODE_LIST = "list";
const VIEW_MODE_GRID = "grid";
const CHANGELOG_LAST_VIEWED_KEY = "shoprunner.changelog.lastViewed.v1";
const DELIVERY_REMINDER_DAYS = 7;
const NOTIFICATION_MAX_ITEMS = 20;
const NOTIFICATION_LAST_SEEN_KEY = "shoprunner.notifications.lastSeenFingerprint.v1";
const ITEM_LINKS_MAX_COUNT = 20;

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
 * @property {string[]} itemLinks
 * @property {string} specialNotes
 * @property {number} purchasePrice
 * @property {number} weightLbs
 * @property {"air" | "sea"} shippingType
 * @property {number} lengthIn
 * @property {number} widthIn
 * @property {number} heightIn
 * @property {number} margin
 * @property {number} shippingCost
 * @property {number} salePrice
 * @property {number} advancePaid
 * @property {number} remainingDue
 * @property {boolean} arrived
 * @property {boolean} paid
 * @property {string} invoiceId
 * @property {string} invoiceIssuedAt
 * @property {string} createdAt
 */
/**
 * @typedef {Object} TeamMember
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 */

const dataService = window.shoprunnerDataService;
const invoiceConfig = window.SHOPRUNNER_INVOICE_CONFIG || {};
const invoiceRenderer = window.shoprunnerInvoiceRenderer;
const authConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const changelogEntries = Array.isArray(window.SHOPRUNNER_CHANGELOG) ? window.SHOPRUNNER_CHANGELOG : [];

let teamMembers = [];
let orders = [];
let editingOrderId = null;
let selectedOwnerFilter = OWNER_FILTER_ALL;
let searchQuery = "";
let selectedDateRange = DATE_RANGE_LAST_30;
let viewMode = VIEW_MODE_LIST;
let draftItemLinks = [];
let itemLinksInlineWarning = "";
let deliveryReminders = [];
let notificationPanelOpen = false;
const PAGE_SIZE = 10;
let currentPage = 1;

const ordersBody = document.getElementById("orders-body");
const newOrderBtn = document.getElementById("new-order-btn");
const ordersSearchInput = document.getElementById("orders-search-input");
const ownerFilterSelect = document.getElementById("owner-filter-select");
const dateRangeSelect = document.getElementById("date-range-select");
const ordersViewListBtn = document.getElementById("orders-view-list");
const ordersViewGridBtn = document.getElementById("orders-view-grid");
const openChangelogBtn = document.getElementById("open-changelog-btn");
const changelogUnreadBadge = document.getElementById("changelog-unread-badge");
const notificationBtn = document.getElementById("notification-btn");
const notificationBadge = document.getElementById("notification-badge");
const notificationPanel = document.getElementById("notification-panel");
const notificationList = document.getElementById("notification-list");
const notificationEmpty = document.getElementById("notification-empty");
const openTeamSettingsBtn = document.getElementById("open-team-settings-btn");
const tableWrapper = document.querySelector(".table-wrapper");
const ordersGrid = document.getElementById("orders-grid");
const paginationInfo = document.getElementById("pagination-info");
const paginationPrevBtn = document.getElementById("pagination-prev");
const paginationNextBtn = document.getElementById("pagination-next");
const paginationPages = document.getElementById("pagination-pages");

const orderModal = document.getElementById("order-modal");
const orderForm = document.getElementById("order-form");
const ownerSelect = document.getElementById("order-owner-select");
const formError = document.getElementById("form-error");
const modalTitle = document.getElementById("order-modal-title");
const saveOrderBtn = document.getElementById("save-order-btn");
const cancelOrderBtn = document.getElementById("cancel-order-btn");
const deleteOrderBtn = document.getElementById("delete-order-btn");
const generateInvoiceBtn = document.getElementById("generate-invoice-btn");
const calcShipping = document.getElementById("calc-shipping");
const calcSale = document.getElementById("calc-sale");
const calcRemaining = document.getElementById("calc-remaining");
const itemLinkInput = document.getElementById("item-link-input");
const addItemLinkBtn = document.getElementById("add-item-link-btn");
const itemLinksPreview = document.getElementById("item-links-preview");
const shippingTypeSelect = document.getElementById("shipping-type-select");
const seaDimensionFields = Array.from(orderForm.querySelectorAll("[data-sea-field]"));
const teamSettingsModal = document.getElementById("team-settings-modal");
const teamMembersList = document.getElementById("team-members-list");
const teamAddForm = document.getElementById("team-add-form");
const teamMemberNameInput = document.getElementById("team-member-name-input");
const teamFormError = document.getElementById("team-form-error");
const orderLinksModal = document.getElementById("order-links-modal");
const orderLinksList = document.getElementById("order-links-list");
const orderLinksTitle = document.getElementById("order-links-title");
const changelogModal = document.getElementById("changelog-modal");
const changelogList = document.getElementById("changelog-list");

newOrderBtn.addEventListener("click", openCreateModal);
cancelOrderBtn.addEventListener("click", closeOrderModal);
if (deleteOrderBtn) {
    deleteOrderBtn.addEventListener("click", handleDeleteFromModal);
}
if (generateInvoiceBtn) {
    generateInvoiceBtn.addEventListener("click", handleGenerateInvoiceFromModal);
}
openTeamSettingsBtn.addEventListener("click", (event) => {
    event.preventDefault();
    openTeamModal();
});
if (openChangelogBtn) {
    openChangelogBtn.addEventListener("click", (event) => {
        event.preventDefault();
        openChangelogModal();
    });
}
syncChangelogBadge();
if (notificationBtn) {
    notificationBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleNotificationPanel();
    });
}
syncNotificationBadge();

document.querySelectorAll("[data-close-order-modal]").forEach((node) => {
    node.addEventListener("click", closeOrderModal);
});

document.querySelectorAll("[data-close-team-modal]").forEach((node) => {
    node.addEventListener("click", closeTeamModal);
});
document.querySelectorAll("[data-close-order-links-modal]").forEach((node) => {
    node.addEventListener("click", closeOrderLinksModal);
});
document.querySelectorAll("[data-close-changelog-modal]").forEach((node) => {
    node.addEventListener("click", closeChangelogModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
        return;
    }

    if (notificationPanelOpen) {
        closeNotificationPanel();
        return;
    }

    if (orderLinksModal && !orderLinksModal.classList.contains("hidden")) {
        closeOrderLinksModal();
        return;
    }

    if (changelogModal && !changelogModal.classList.contains("hidden")) {
        closeChangelogModal();
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

document.addEventListener("click", (event) => {
    if (!notificationPanelOpen || !notificationPanel || !notificationBtn) {
        return;
    }

    const target = event.target;
    if (notificationPanel.contains(target) || notificationBtn.contains(target)) {
        return;
    }

    closeNotificationPanel();
});

if (notificationList) {
    notificationList.addEventListener("click", (event) => {
        const action = event.target.closest("[data-notification-order-id]");
        if (!action) {
            return;
        }

        const orderId = String(action.dataset.notificationOrderId || "").trim();
        if (!orderId) {
            return;
        }

        closeNotificationPanel();
        openEditModal(orderId);
    });
}

ordersBody.addEventListener("click", async (event) => {
    await handleOrderActionEvent(event);
});

if (ordersGrid) {
    ordersGrid.addEventListener("click", async (event) => {
        await handleOrderActionEvent(event);
    });
}

async function handleOrderActionEvent(event) {
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

    if (action === "open-links") {
        openOrderLinksModal(order);
        return;
    }

    if (!dataService) {
        showAppError("Cloud data service is unavailable.");
        return;
    }

    if (action === "toggle-arrived") {
        const nextValue = !order.arrived;
        try {
            const updated = await dataService.toggleOrderStatus(orderId, { arrived: nextValue });
            const normalized = normalizeOrder(updated);
            if (normalized) {
                orders = orders.map((item) => (item.id === orderId ? normalized : item));
            }
            renderTable();
        } catch (error) {
            showAppError(getErrorMessage(error, "Could not update arrived status."));
        }
        return;
    }

    if (action === "toggle-paid") {
        const nextValue = !order.paid;
        try {
            let updated;
            if (nextValue) {
                const settledSalePrice = roundMoney(order.salePrice);
                const settledOrder = {
                    ...order,
                    advancePaid: settledSalePrice,
                    remainingDue: 0,
                    paid: true
                };
                updated = await dataService.updateOrder(orderId, settledOrder);
            } else {
                updated = await dataService.toggleOrderStatus(orderId, { paid: false });
            }
            const normalized = normalizeOrder(updated);
            if (normalized) {
                orders = orders.map((item) => (item.id === orderId ? normalized : item));
            }
            renderTable();
        } catch (error) {
            showAppError(getErrorMessage(error, "Could not update paid status."));
        }
        return;
    }
}

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
    currentPage = 1;
    renderTable();
});

ordersSearchInput.addEventListener("input", () => {
    searchQuery = String(ordersSearchInput.value || "").trim().toLowerCase();
    currentPage = 1;
    renderTable();
});

if (dateRangeSelect) {
    dateRangeSelect.value = selectedDateRange;
    dateRangeSelect.addEventListener("change", () => {
        selectedDateRange = normalizeDateRange(dateRangeSelect.value);
        dateRangeSelect.value = selectedDateRange;
        currentPage = 1;
        renderTable();
    });
}

if (ordersViewListBtn) {
    ordersViewListBtn.addEventListener("click", () => {
        setViewMode(VIEW_MODE_LIST);
    });
}

if (ordersViewGridBtn) {
    ordersViewGridBtn.addEventListener("click", () => {
        setViewMode(VIEW_MODE_GRID);
    });
}

if (paginationPrevBtn) {
    paginationPrevBtn.addEventListener("click", () => {
        goToPage(currentPage - 1);
    });
}

if (paginationNextBtn) {
    paginationNextBtn.addEventListener("click", () => {
        goToPage(currentPage + 1);
    });
}

if (paginationPages) {
    paginationPages.addEventListener("click", (event) => {
        const pageButton = event.target.closest("button[data-page]");
        if (!pageButton) {
            return;
        }
        const page = Number.parseInt(pageButton.dataset.page || "", 10);
        if (!Number.isFinite(page)) {
            return;
        }
        goToPage(page);
    });
}

orderForm.addEventListener("input", (event) => {
    formError.classList.add("hidden");
    if (event.target && event.target.name === "itemLinkInput" && itemLinksInlineWarning) {
        itemLinksInlineWarning = "";
        renderItemLinksPreview();
    }
    syncShippingTypeFields();
    updateCalculationPanel();
});

orderForm.addEventListener("change", (event) => {
    if (event.target && event.target.name === "shippingType") {
        syncShippingTypeFields();
        updateCalculationPanel();
    }
});

if (addItemLinkBtn) {
    addItemLinkBtn.addEventListener("click", handleAddItemLink);
}

if (itemLinkInput) {
    itemLinkInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") {
            return;
        }
        event.preventDefault();
        handleAddItemLink();
    });
}

if (itemLinksPreview) {
    itemLinksPreview.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-link-index]");
        if (!removeButton) {
            return;
        }
        const index = Number.parseInt(removeButton.dataset.removeLinkIndex || "", 10);
        if (!Number.isInteger(index) || index < 0 || index >= draftItemLinks.length) {
            return;
        }
        draftItemLinks.splice(index, 1);
        itemLinksInlineWarning = "";
        renderItemLinksPreview();
    });
}

orderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitForm();
});

teamAddForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addTeamMember();
});

teamMembersList.addEventListener("click", async (event) => {
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
        await renameTeamMember(memberId, input.value);
        return;
    }

    if (action === "remove") {
        await removeTeamMember(memberId);
    }
});

syncShippingTypeFields();
syncViewModeUi();
initializeApp();

async function submitForm() {
    if (!orderForm.checkValidity()) {
        orderForm.reportValidity();
        return;
    }

    if (!dataService) {
        showFormError("Cloud data service is unavailable.");
        return;
    }

    const formValues = getFormValues();
    const validationError = validateFormValues(formValues);

    if (validationError) {
        showFormError(validationError);
        return;
    }

    const computed = getComputedValues(formValues);
    const existing = editingOrderId ? orders.find((order) => order.id === editingOrderId) : null;

    /** @type {Order} */
    const nextOrder = {
        id: existing ? existing.id : "",
        customerName: formValues.customerName,
        ownerId: formValues.ownerId,
        orderDate: formValues.orderDate,
        itemName: formValues.itemName,
        itemLinks: formValues.itemLinks,
        specialNotes: formValues.specialNotes,
        purchasePrice: formValues.purchasePrice,
        weightLbs: formValues.weightLbs,
        shippingType: formValues.shippingType,
        lengthIn: formValues.lengthIn,
        widthIn: formValues.widthIn,
        heightIn: formValues.heightIn,
        margin: formValues.margin,
        shippingCost: computed.shippingCost,
        salePrice: computed.salePrice,
        advancePaid: formValues.advancePaid,
        remainingDue: computed.remainingDue,
        arrived: existing ? existing.arrived : false,
        paid: existing ? existing.paid : false,
        createdAt: existing ? existing.createdAt : new Date().toISOString()
    };

    saveOrderBtn.disabled = true;
    saveOrderBtn.textContent = existing ? "Updating..." : "Saving...";

    try {
        if (existing) {
            const updated = await dataService.updateOrder(nextOrder.id, nextOrder);
            const normalized = normalizeOrder(updated);
            if (!normalized) {
                throw new Error("Updated order returned invalid data.");
            }
            orders = orders.map((order) => (order.id === normalized.id ? normalized : order));
        } else {
            const created = await dataService.createOrder(nextOrder);
            const normalized = normalizeOrder(created);
            if (!normalized) {
                throw new Error("Created order returned invalid data.");
            }
            orders.unshift(normalized);
        }

        renderTable();
        closeOrderModal();
    } catch (error) {
        showFormError(getErrorMessage(error, "Could not save order."));
    } finally {
        saveOrderBtn.disabled = false;
        saveOrderBtn.textContent = existing ? "Update Order" : "Save Order";
    }
}

function openCreateModal() {
    editingOrderId = null;
    draftItemLinks = [];
    itemLinksInlineWarning = "";
    modalTitle.textContent = "New Order";
    saveOrderBtn.textContent = "Save Order";
    setDeleteButtonVisibility(false);
    setInvoiceButtonVisibility(false);
    populateOwnerSelect(getDefaultOwnerId());
    resetForm({
        customerName: "",
        ownerId: getDefaultOwnerId(),
        orderDate: getTodayIso(),
        itemName: "",
        purchasePrice: "",
        shippingType: "air",
        weightLbs: "",
        lengthIn: "",
        widthIn: "",
        heightIn: "",
        margin: "1.1",
        advancePaid: "0",
        itemLinkInput: "",
        specialNotes: ""
    });
    openOrderModal();
}

function openEditModal(orderId) {
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
        return;
    }

    editingOrderId = orderId;
    draftItemLinks = normalizeItemLinks(order.itemLinks);
    itemLinksInlineWarning = "";
    modalTitle.textContent = "Edit Order";
    saveOrderBtn.textContent = "Update Order";
    setDeleteButtonVisibility(true);
    setInvoiceButtonVisibility(true);
    const prefilledOwnerId = isValidTeamOwnerId(order.ownerId) ? order.ownerId : "";
    populateOwnerSelect(prefilledOwnerId);
    resetForm({
        customerName: order.customerName,
        ownerId: prefilledOwnerId,
        orderDate: order.orderDate,
        itemName: order.itemName,
        purchasePrice: order.purchasePrice.toFixed(2),
        shippingType: order.shippingType,
        weightLbs: order.weightLbs.toFixed(2),
        lengthIn: order.lengthIn > 0 ? order.lengthIn.toFixed(2) : "",
        widthIn: order.widthIn > 0 ? order.widthIn.toFixed(2) : "",
        heightIn: order.heightIn > 0 ? order.heightIn.toFixed(2) : "",
        margin: String(order.margin),
        advancePaid: order.advancePaid.toFixed(2),
        itemLinkInput: "",
        specialNotes: order.specialNotes || ""
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
    syncShippingTypeFields();
    updateCalculationPanel();
    renderItemLinksPreview();
}

function openOrderModal() {
    closeNotificationPanel();
    orderModal.classList.remove("hidden");
    orderModal.setAttribute("aria-hidden", "false");
    syncBodyModalState();
    const customerField = orderForm.elements.namedItem("customerName");
    if (customerField) {
        customerField.focus();
    }
}

function closeOrderModal() {
    orderModal.classList.add("hidden");
    orderModal.setAttribute("aria-hidden", "true");
    syncBodyModalState();
    setDeleteButtonVisibility(false);
    setInvoiceButtonVisibility(false);
    draftItemLinks = [];
    itemLinksInlineWarning = "";
    editingOrderId = null;
}

function setDeleteButtonVisibility(isEditMode) {
    if (!deleteOrderBtn) {
        return;
    }

    deleteOrderBtn.classList.toggle("hidden", !isEditMode);
    deleteOrderBtn.disabled = !isEditMode;
}

function setInvoiceButtonVisibility(isEditMode) {
    if (!generateInvoiceBtn) {
        return;
    }

    generateInvoiceBtn.textContent = "Generate Invoice";
    generateInvoiceBtn.classList.toggle("hidden", !isEditMode);
    generateInvoiceBtn.disabled = !isEditMode;
}

async function handleDeleteFromModal() {
    if (!editingOrderId) {
        return;
    }

    await deleteOrder(editingOrderId);
}

async function deleteOrder(orderId) {
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

    if (!dataService) {
        showFormError("Cloud data service is unavailable.");
        return;
    }

    if (deleteOrderBtn) {
        deleteOrderBtn.disabled = true;
        deleteOrderBtn.textContent = "Deleting...";
    }

    try {
        await dataService.deleteOrder(orderId);
        orders = orders.filter((item) => item.id !== orderId);
        renderTable();
        closeOrderModal();
    } catch (error) {
        showFormError(getErrorMessage(error, "Could not delete order."));
    } finally {
        if (deleteOrderBtn) {
            deleteOrderBtn.disabled = false;
            deleteOrderBtn.textContent = "Delete Order";
        }
    }
}

async function handleGenerateInvoiceFromModal() {
    if (!editingOrderId) {
        showFormError("Open an existing order first.");
        return;
    }

    if (!dataService) {
        showFormError("Cloud data service is unavailable.");
        return;
    }

    if (!invoiceRenderer || typeof invoiceRenderer.renderAndPrintInvoice !== "function") {
        showFormError("Invoice renderer is unavailable.");
        return;
    }

    if (generateInvoiceBtn) {
        generateInvoiceBtn.disabled = true;
        generateInvoiceBtn.textContent = "Generating...";
    }

    try {
        const dbOrder = await dataService.ensureInvoiceIdentity(editingOrderId);
        const normalized = normalizeOrder(dbOrder);
        if (!normalized) {
            throw new Error("Could not prepare invoice for this order.");
        }

        orders = orders.map((item) => (item.id === normalized.id ? normalized : item));

        const owner = getTeamMemberById(normalized.ownerId);
        const ownerName = owner ? owner.name : "";
        const logoPath = toAbsoluteUrl(resolveInvoiceLogoPath(ownerName));
        const handlingRate = `x${normalized.margin.toFixed(2)}`;

        invoiceRenderer.renderAndPrintInvoice({
            logoPath,
            companyName: getInvoiceConfigValue("companyDisplayName", "Shoprunner"),
            companyEmail: getInvoiceConfigValue("companyEmail", "support@shoprunner.com"),
            companyPhone: getInvoiceConfigValue("companyPhone", ""),
            companyAddress: getInvoiceConfigValue("companyAddress", ""),
            invoiceId: normalized.invoiceId || String(dbOrder.invoice_id || ""),
            issueDate: formatDateNl((normalized.invoiceIssuedAt || getTodayIso()).slice(0, 10)),
            orderDate: formatDateNl(normalized.orderDate),
            customerName: normalized.customerName,
            itemName: normalized.itemName,
            specialNotes: normalized.specialNotes || "",
            shippingTypeLabel: normalized.shippingType === "sea" ? "Sea" : "Air",
            purchaseLabel: formatCurrency(normalized.purchasePrice),
            shippingLabel: formatCurrency(normalized.shippingCost),
            handlingLabel: handlingRate,
            totalLabel: formatCurrency(normalized.salePrice),
            advanceLabel: formatCurrency(normalized.advancePaid),
            remainingLabel: formatCurrency(normalized.remainingDue),
            arrived: normalized.arrived,
            paid: normalized.paid
        });
    } catch (error) {
        showFormError(getErrorMessage(error, "Could not generate invoice."));
    } finally {
        if (generateInvoiceBtn) {
            generateInvoiceBtn.disabled = false;
            generateInvoiceBtn.textContent = "Generate Invoice";
        }
    }
}

function openTeamModal() {
    closeNotificationPanel();
    teamFormError.classList.add("hidden");
    renderTeamMembersList();
    teamSettingsModal.classList.remove("hidden");
    teamSettingsModal.setAttribute("aria-hidden", "false");
    syncBodyModalState();
    teamMemberNameInput.focus();
}

function closeTeamModal() {
    teamSettingsModal.classList.add("hidden");
    teamSettingsModal.setAttribute("aria-hidden", "true");
    syncBodyModalState();
}

function openOrderLinksModal(order) {
    if (!orderLinksModal || !orderLinksList || !order) {
        return;
    }

    renderOrderLinksList(order);
    if (orderLinksTitle) {
        orderLinksTitle.textContent = `Item Links - ${order.customerName}`;
    }
    orderLinksModal.classList.remove("hidden");
    orderLinksModal.setAttribute("aria-hidden", "false");
    syncBodyModalState();

    const closeButton = orderLinksModal.querySelector("[data-close-order-links-modal]");
    if (closeButton && typeof closeButton.focus === "function") {
        closeButton.focus();
    }
}

function closeOrderLinksModal() {
    if (!orderLinksModal) {
        return;
    }

    if (orderLinksTitle) {
        orderLinksTitle.textContent = "Item Links";
    }
    orderLinksModal.classList.add("hidden");
    orderLinksModal.setAttribute("aria-hidden", "true");
    syncBodyModalState();
}

function renderOrderLinksList(order) {
    if (!orderLinksList) {
        return;
    }

    const links = normalizeItemLinks(order && order.itemLinks ? order.itemLinks : []);
    if (!links.length) {
        orderLinksList.innerHTML = '<p class="team-empty">No item links available for this order.</p>';
        return;
    }

    const linkItems = links
        .map((rawLink) => {
            const safeHref = normalizeHttpUrl(rawLink);
            if (!safeHref) {
                return "";
            }
            const hostLabel = extractLinkHostLabel(safeHref);
            return `
                <a class="order-link-item" href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">
                    <span class="order-link-host">${escapeHtml(hostLabel)}</span>
                    <span class="order-link-url" title="${escapeHtml(safeHref)}">${escapeHtml(formatLinkDisplayLabel(safeHref))}</span>
                </a>
            `;
        })
        .filter(Boolean);

    if (!linkItems.length) {
        orderLinksList.innerHTML = '<p class="team-empty">No valid item links available for this order.</p>';
        return;
    }

    orderLinksList.innerHTML = linkItems.join("");
}

function handleAddItemLink() {
    if (!itemLinkInput) {
        return;
    }

    const inputValue = String(itemLinkInput.value || "").trim();
    if (!inputValue) {
        itemLinksInlineWarning = "Enter a link before adding.";
        renderItemLinksPreview();
        return;
    }

    if (draftItemLinks.length >= ITEM_LINKS_MAX_COUNT) {
        itemLinksInlineWarning = `You can add up to ${ITEM_LINKS_MAX_COUNT} item links.`;
        renderItemLinksPreview();
        return;
    }

    const safeHref = normalizeHttpUrl(inputValue);
    if (!safeHref) {
        itemLinksInlineWarning = "Link must be a valid URL (http/https).";
        renderItemLinksPreview();
        return;
    }

    const exists = draftItemLinks.some((link) => link === safeHref);
    if (exists) {
        itemLinksInlineWarning = "This link was already added.";
        renderItemLinksPreview();
        return;
    }

    draftItemLinks.push(safeHref);
    itemLinksInlineWarning = "";
    itemLinkInput.value = "";
    renderItemLinksPreview();
}

function renderItemLinksPreview() {
    if (!itemLinksPreview) {
        return;
    }

    const links = normalizeItemLinks(draftItemLinks);
    if (!links.length) {
        const warningHtml = itemLinksInlineWarning
            ? `<p class="item-links-preview-invalid">${escapeHtml(itemLinksInlineWarning)}</p>`
            : "";
        itemLinksPreview.innerHTML = `
            ${warningHtml}
            <p class="item-links-preview-empty">No links added yet.</p>
        `;
        return;
    }

    const listItems = links.map((url, index) => {
        const parsed = parseHttpUrl(url);
        if (!parsed) {
            return `
                <li class="item-links-preview-row">
                    <span class="item-links-preview-invalid">Invalid URL</span>
                    <button
                        type="button"
                        class="item-links-remove-btn"
                        data-remove-link-index="${index}"
                        aria-label="Remove invalid link"
                    >
                        Remove
                    </button>
                </li>
            `;
        }

        const href = parsed.href;
        return `
            <li class="item-links-preview-row">
                <a
                    class="item-links-preview-link"
                    href="${escapeHtml(href)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="${escapeHtml(href)}"
                >
                    ${escapeHtml(formatLinkDisplayLabel(href))}
                </a>
                <button
                    type="button"
                    class="item-links-remove-btn"
                    data-remove-link-index="${index}"
                    aria-label="Remove link"
                >
                    Remove
                </button>
            </li>
        `;
    });

    const warningHtml = itemLinksInlineWarning
        ? `<p class="item-links-preview-invalid">${escapeHtml(itemLinksInlineWarning)}</p>`
        : "";

    itemLinksPreview.innerHTML = `
        ${warningHtml}
        <ul class="item-links-preview-list">
            ${listItems.join("")}
        </ul>
    `;
}

function openChangelogModal() {
    if (!changelogModal || !changelogList) {
        return;
    }

    closeNotificationPanel();
    renderChangelogEntries();
    changelogModal.classList.remove("hidden");
    changelogModal.setAttribute("aria-hidden", "false");
    setLastViewedChangelogVersion(getLatestChangelogVersion());
    syncChangelogBadge();
    syncBodyModalState();

    const closeButton = changelogModal.querySelector("[data-close-changelog-modal]");
    if (closeButton && typeof closeButton.focus === "function") {
        closeButton.focus();
    }
}

function closeChangelogModal() {
    if (!changelogModal) {
        return;
    }

    changelogModal.classList.add("hidden");
    changelogModal.setAttribute("aria-hidden", "true");
    syncBodyModalState();
}

function syncBodyModalState() {
    const hasOpenModal =
        !orderModal.classList.contains("hidden") ||
        !teamSettingsModal.classList.contains("hidden") ||
        (orderLinksModal && !orderLinksModal.classList.contains("hidden")) ||
        (changelogModal && !changelogModal.classList.contains("hidden"));

    document.body.classList.toggle("modal-open", hasOpenModal);
}

function renderChangelogEntries() {
    if (!changelogList) {
        return;
    }

    if (!changelogEntries.length) {
        changelogList.innerHTML = '<p class="team-empty">No changelog entries yet.</p>';
        return;
    }

    changelogList.innerHTML = changelogEntries
        .map((entry) => {
            const dateRaw = String(entry && entry.date ? entry.date : "").trim();
            const dateLabel = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? formatDateNl(dateRaw) : dateRaw || "-";
            const title = String(entry && entry.title ? entry.title : "Update").trim();
            const summary = String(entry && entry.summary ? entry.summary : "").trim();
            const items = Array.isArray(entry && entry.items) ? entry.items.filter((item) => String(item || "").trim()) : [];
            const commits = Array.isArray(entry && entry.commits)
                ? entry.commits.filter((commit) => String(commit || "").trim())
                : [];

            const summaryHtml = summary ? `<p class="changelog-summary">${escapeHtml(summary)}</p>` : "";
            const itemsHtml = items.length
                ? `<ul class="changelog-items">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
                : "";
            const commitsHtml = commits.length
                ? `<div class="changelog-commits">${commits.map((commit) => `<span class="changelog-commit">#${escapeHtml(commit)}</span>`).join("")}</div>`
                : "";

            return `
                <article class="changelog-entry">
                    <div class="changelog-head">
                        <span class="changelog-date">${escapeHtml(dateLabel)}</span>
                        <h3 class="changelog-title">${escapeHtml(title)}</h3>
                    </div>
                    ${summaryHtml}
                    ${itemsHtml}
                    ${commitsHtml}
                </article>
            `;
        })
        .join("");
}

function getLatestChangelogVersion() {
    if (!changelogEntries.length) {
        return "";
    }

    const latestEntry = changelogEntries[0] || {};
    const latestVersion = String(latestEntry.version || "").trim();
    if (latestVersion) {
        return latestVersion;
    }
    const latestDate = String(latestEntry.date || "").trim();
    const latestTitle = String(latestEntry.title || "").trim();
    if (!latestDate && !latestTitle) {
        return "";
    }
    return `${latestDate}::${latestTitle}`;
}

function getLastViewedChangelogVersion() {
    try {
        return String(localStorage.getItem(CHANGELOG_LAST_VIEWED_KEY) || "").trim();
    } catch (error) {
        return "";
    }
}

function setLastViewedChangelogVersion(version) {
    const value = String(version || "").trim();
    if (!value) {
        return;
    }

    try {
        localStorage.setItem(CHANGELOG_LAST_VIEWED_KEY, value);
    } catch (error) {
        // Ignore storage failures.
    }
}

function shouldShowChangelogBadge() {
    const latestVersion = getLatestChangelogVersion();
    if (!latestVersion) {
        return false;
    }
    return latestVersion !== getLastViewedChangelogVersion();
}

function syncChangelogBadge() {
    if (!changelogUnreadBadge) {
        return;
    }

    changelogUnreadBadge.classList.toggle("hidden", !shouldShowChangelogBadge());
}

function refreshDeliveryReminders() {
    deliveryReminders = buildDeliveryReminders(orders);
    renderNotificationPanel();
    syncNotificationBadge();
}

function buildDeliveryReminders(items) {
    return (Array.isArray(items) ? items : [])
        .filter((order) => order && order.arrived === false && isOrderOverdueForDelivery(order.orderDate))
        .map((order) => ({
            id: `delivery:${order.id}`,
            orderId: order.id,
            customerName: order.customerName,
            orderDate: order.orderDate,
            daysOpen: calculateOrderAgeDays(order.orderDate)
        }))
        .sort((a, b) => b.daysOpen - a.daysOpen || Date.parse(a.orderDate) - Date.parse(b.orderDate))
        .slice(0, NOTIFICATION_MAX_ITEMS);
}

function isOrderOverdueForDelivery(orderDate) {
    const parsed = parseIsoDate(orderDate);
    if (!parsed) {
        return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msDiff = today.getTime() - parsed.getTime();
    const daysOpen = Math.floor(msDiff / 86400000);
    return daysOpen > DELIVERY_REMINDER_DAYS;
}

function calculateOrderAgeDays(orderDate) {
    const parsed = parseIsoDate(orderDate);
    if (!parsed) {
        return 0;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const msDiff = today.getTime() - parsed.getTime();
    return Math.max(0, Math.floor(msDiff / 86400000));
}

function getDeliveryReminderFingerprint(items) {
    const ids = (Array.isArray(items) ? items : []).map((item) => String(item.id || "").trim()).filter(Boolean);
    return ids.join("|");
}

function getLastSeenDeliveryReminderFingerprint() {
    try {
        return String(localStorage.getItem(NOTIFICATION_LAST_SEEN_KEY) || "").trim();
    } catch (error) {
        return "";
    }
}

function setLastSeenDeliveryReminderFingerprint(fingerprint) {
    try {
        localStorage.setItem(NOTIFICATION_LAST_SEEN_KEY, String(fingerprint || "").trim());
    } catch (error) {
        // Ignore storage failures.
    }
}

function shouldShowNotificationBadge() {
    const current = getDeliveryReminderFingerprint(deliveryReminders);
    if (!current) {
        return false;
    }
    return current !== getLastSeenDeliveryReminderFingerprint();
}

function syncNotificationBadge() {
    if (!notificationBadge) {
        return;
    }

    notificationBadge.classList.toggle("hidden", !shouldShowNotificationBadge());
}

function renderNotificationPanel() {
    if (!notificationPanel || !notificationList || !notificationEmpty) {
        return;
    }

    if (!deliveryReminders.length) {
        notificationList.innerHTML = "";
        notificationEmpty.classList.remove("hidden");
        return;
    }

    notificationEmpty.classList.add("hidden");
    notificationList.innerHTML = deliveryReminders
        .map((reminder) => `
            <article class="notification-item">
                <div class="notification-item-main">
                    <p class="notification-title">Reminder: check delivery for ${escapeHtml(reminder.customerName)}</p>
                    <p class="notification-meta">Order date ${escapeHtml(formatDateNl(reminder.orderDate))} - ${reminder.daysOpen} days open</p>
                </div>
                <button
                    type="button"
                    class="notification-open-btn"
                    data-notification-order-id="${escapeHtml(reminder.orderId)}"
                >
                    Open order
                </button>
            </article>
        `)
        .join("");
}

function openNotificationPanel() {
    if (!notificationPanel || !notificationBtn) {
        return;
    }
    notificationPanelOpen = true;
    notificationPanel.classList.remove("hidden");
    notificationPanel.setAttribute("aria-hidden", "false");
    notificationBtn.setAttribute("aria-expanded", "true");
    setLastSeenDeliveryReminderFingerprint(getDeliveryReminderFingerprint(deliveryReminders));
    syncNotificationBadge();
}

function closeNotificationPanel() {
    if (!notificationPanel || !notificationBtn) {
        return;
    }
    notificationPanelOpen = false;
    notificationPanel.classList.add("hidden");
    notificationPanel.setAttribute("aria-hidden", "true");
    notificationBtn.setAttribute("aria-expanded", "false");
}

function toggleNotificationPanel() {
    if (notificationPanelOpen) {
        closeNotificationPanel();
        return;
    }
    openNotificationPanel();
}

function showFormError(message) {
    formError.textContent = message;
    formError.classList.remove("hidden");
}

function showTeamError(message) {
    teamFormError.textContent = message;
    teamFormError.classList.remove("hidden");
}

function showAppError(message) {
    const text = String(message || "").trim();
    if (!text) {
        return;
    }

    if (isAuthSessionMissingError(text)) {
        redirectToAuthFromApp();
        return;
    }

    if (!teamSettingsModal.classList.contains("hidden")) {
        showTeamError(text);
        return;
    }

    if (!orderModal.classList.contains("hidden")) {
        showFormError(text);
        return;
    }

    window.alert(text);
}

function clearTeamError() {
    teamFormError.textContent = "";
    teamFormError.classList.add("hidden");
}

function getErrorMessage(error, fallbackMessage) {
    const message = String(error && error.message ? error.message : error || "").trim();
    return message || fallbackMessage;
}

function isAuthSessionMissingError(errorOrMessage) {
    const message = String(
        errorOrMessage && errorOrMessage.message ? errorOrMessage.message : errorOrMessage || ""
    )
        .trim()
        .toLowerCase();

    if (!message) {
        return false;
    }

    return (
        message.includes("auth session missing") ||
        message.includes("no authenticated user found") ||
        message.includes("jwt")
    );
}

function redirectToAuthFromApp() {
    const configuredPath = String(authConfig.authPath || "").trim();
    const fallbackPath = "/auth";
    const authPath = configuredPath || fallbackPath;
    window.location.replace(authPath);
}

function getFormValues() {
    const customerName = String(orderForm.elements.namedItem("customerName").value || "").trim();
    const ownerId = String(orderForm.elements.namedItem("ownerId").value || "").trim();
    const orderDate = String(orderForm.elements.namedItem("orderDate").value || "");
    const itemName = String(orderForm.elements.namedItem("itemName").value || "").trim();
    const itemLinks = normalizeItemLinks(draftItemLinks);
    const specialNotes = String(orderForm.elements.namedItem("specialNotes").value || "").trim();
    const purchasePrice = parseNumber(orderForm.elements.namedItem("purchasePrice").value);
    const shippingType = normalizeShippingType(orderForm.elements.namedItem("shippingType").value);
    const weightLbs = parseNumber(orderForm.elements.namedItem("weightLbs").value);
    const lengthIn = parseNumber(orderForm.elements.namedItem("lengthIn").value);
    const widthIn = parseNumber(orderForm.elements.namedItem("widthIn").value);
    const heightIn = parseNumber(orderForm.elements.namedItem("heightIn").value);
    const margin = parseNumber(orderForm.elements.namedItem("margin").value);
    const advancePaid = parseNumber(orderForm.elements.namedItem("advancePaid").value);

    return {
        customerName,
        ownerId,
        orderDate,
        itemName,
        itemLinks,
        specialNotes,
        purchasePrice,
        shippingType,
        weightLbs,
        lengthIn,
        widthIn,
        heightIn,
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
    const pendingItemLink = itemLinkInput ? String(itemLinkInput.value || "").trim() : "";
    if (pendingItemLink) {
        return "Click Add link to include the typed URL.";
    }
    const itemLinksError = validateItemLinks(values.itemLinks);
    if (itemLinksError) {
        return itemLinksError;
    }
    if (values.specialNotes.length > 500) {
        return "Special notes must be 500 characters or fewer.";
    }
    if (!Number.isFinite(values.purchasePrice) || values.purchasePrice < 0) {
        return "Purchase price must be a non-negative number.";
    }
    if (!["air", "sea"].includes(values.shippingType)) {
        return "Shipping type must be Air or Sea.";
    }
    if (values.shippingType === "air") {
        if (!Number.isFinite(values.weightLbs) || values.weightLbs < 0) {
            return "Weight must be a non-negative number.";
        }
    } else {
        if (!Number.isFinite(values.lengthIn) || values.lengthIn <= 0) {
            return "Length must be greater than 0 for sea shipping.";
        }
        if (!Number.isFinite(values.widthIn) || values.widthIn <= 0) {
            return "Width must be greater than 0 for sea shipping.";
        }
        if (!Number.isFinite(values.heightIn) || values.heightIn <= 0) {
            return "Height must be greater than 0 for sea shipping.";
        }
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
    const shippingCost = calculateShipping(values);
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

function calculateShipping(values) {
    const shippingType = normalizeShippingType(values.shippingType);

    if (shippingType === "sea") {
        const lengthIn = parseNumber(values.lengthIn);
        const widthIn = parseNumber(values.widthIn);
        const heightIn = parseNumber(values.heightIn);
        const cubes = (lengthIn * widthIn * heightIn) / SEA_CUBE_DIVISOR;
        const seaCost = Math.round(cubes * SEA_RATE_PER_CUBE);
        return roundMoney(seaCost);
    }

    return roundMoney(parseNumber(values.weightLbs) * AIR_SHIPPING_RATE);
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

function getFilteredSortedOrders() {
    return applyDateRangeFilter(applySearchFilter(applyOwnerFilter(orders)))
        .slice()
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function normalizeDateRange(value) {
    return value === DATE_RANGE_THIS_MONTH ? DATE_RANGE_THIS_MONTH : DATE_RANGE_LAST_30;
}

function applyDateRangeFilter(items) {
    const selectedRange = normalizeDateRange(selectedDateRange);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedRange === DATE_RANGE_THIS_MONTH) {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        return items.filter((order) => {
            const orderDate = parseIsoDate(order.orderDate);
            return orderDate && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
        });
    }

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 29);
    return items.filter((order) => {
        const orderDate = parseIsoDate(order.orderDate);
        return orderDate && orderDate >= startDate && orderDate <= today;
    });
}

function parseIsoDate(value) {
    const raw = String(value || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return null;
    }
    const [year, month, day] = raw.split("-").map((part) => Number.parseInt(part, 10));
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    parsed.setHours(0, 0, 0, 0);
    return parsed;
}

function paginateItems(items, page, size) {
    const totalItems = items.length;
    if (totalItems === 0) {
        return {
            pageItems: [],
            totalItems: 0,
            totalPages: 1,
            page: 1,
            startIndex: 0,
            endIndex: 0
        };
    }

    const totalPages = Math.max(1, Math.ceil(totalItems / size));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = (safePage - 1) * size;
    const end = Math.min(start + size, totalItems);

    return {
        pageItems: items.slice(start, end),
        totalItems,
        totalPages,
        page: safePage,
        startIndex: start + 1,
        endIndex: end
    };
}

function buildPaginationItems(current, totalPages) {
    if (totalPages <= 1) {
        return [1];
    }

    const set = new Set([1, totalPages, current - 1, current, current + 1]);
    const pages = Array.from(set)
        .filter((value) => value >= 1 && value <= totalPages)
        .sort((a, b) => a - b);

    const items = [];
    for (let index = 0; index < pages.length; index += 1) {
        const value = pages[index];
        if (index > 0) {
            const previous = pages[index - 1];
            if (value - previous > 1) {
                items.push("ellipsis");
            }
        }
        items.push(value);
    }

    return items;
}

function renderPagination(meta) {
    if (!paginationInfo || !paginationPrevBtn || !paginationNextBtn || !paginationPages) {
        return;
    }

    if (meta.totalItems === 0) {
        paginationInfo.textContent = "Show 0-0 of 0";
    } else {
        paginationInfo.textContent = `Show ${meta.startIndex}-${meta.endIndex} of ${meta.totalItems}`;
    }

    paginationPrevBtn.disabled = meta.totalItems === 0 || meta.page <= 1;
    paginationNextBtn.disabled = meta.totalItems === 0 || meta.page >= meta.totalPages;

    const paginationItems = buildPaginationItems(meta.page, meta.totalPages);
    paginationPages.innerHTML = paginationItems
        .map((item) => {
            if (item === "ellipsis") {
                return '<span class="ellipsis">...</span>';
            }
            const activeClass = item === meta.page ? " active" : "";
            return `<button class="page-btn${activeClass}" type="button" data-page="${item}">${item}</button>`;
        })
        .join("");
}

function goToPage(pageNumber) {
    if (!Number.isFinite(pageNumber)) {
        return;
    }
    currentPage = Math.max(1, Math.trunc(pageNumber));
    renderTable();
}

function normalizeViewMode(value) {
    return value === VIEW_MODE_GRID ? VIEW_MODE_GRID : VIEW_MODE_LIST;
}

function setViewMode(nextMode) {
    const normalized = normalizeViewMode(nextMode);
    if (normalized === VIEW_MODE_GRID && !ordersGrid) {
        return;
    }
    if (viewMode === normalized) {
        syncViewModeUi();
        return;
    }
    viewMode = normalized;
    syncViewModeUi();
    renderTable();
}

function syncViewModeUi() {
    if (ordersViewListBtn) {
        const isList = viewMode === VIEW_MODE_LIST;
        ordersViewListBtn.classList.toggle("active", isList);
        ordersViewListBtn.setAttribute("aria-pressed", String(isList));
    }
    if (ordersViewGridBtn) {
        const isGrid = viewMode === VIEW_MODE_GRID;
        ordersViewGridBtn.classList.toggle("active", isGrid);
        ordersViewGridBtn.setAttribute("aria-pressed", String(isGrid));
    }
    if (tableWrapper) {
        tableWrapper.classList.toggle("hidden", viewMode === VIEW_MODE_GRID);
    }
    if (ordersGrid) {
        ordersGrid.classList.toggle("hidden", viewMode !== VIEW_MODE_GRID);
    }
}

function renderTable() {
    refreshDeliveryReminders();
    const visibleOrders = getFilteredSortedOrders();
    const pageMeta = paginateItems(visibleOrders, currentPage, PAGE_SIZE);
    currentPage = pageMeta.page;

    if (!visibleOrders.length) {
        renderEmptyState(getEmptyStateMessage());
        renderPagination(pageMeta);
        return;
    }

    if (viewMode === VIEW_MODE_GRID) {
        renderGrid(pageMeta.pageItems);
    } else {
        renderListRows(pageMeta.pageItems);
    }

    renderPagination(pageMeta);
}

function getEmptyStateMessage() {
    if (searchQuery) {
        return "Geen orders gevonden voor deze zoekopdracht.";
    }
    if (selectedOwnerFilter !== OWNER_FILTER_ALL) {
        return "No orders found for the selected owner.";
    }
    if (normalizeDateRange(selectedDateRange) === DATE_RANGE_THIS_MONTH) {
        return "No orders found for this month.";
    }
    return "No orders found for the past 30 days.";
}

function renderListRows(pageItems) {
    const rows = pageItems
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
                    <td>${escapeHtml(formatWeightDisplay(order))}</td>
                    <td>${renderShippingCostCell(order)}</td>
                    <td>${marginLabel}</td>
                    <td>${formatCurrency(order.advancePaid)}</td>
                    <td>${formatCurrency(order.salePrice)}</td>
                    <td class="${remainingClass}">${formatCurrency(order.remainingDue)}</td>
                    <td>${renderStatusToggle("arrived", order.arrived, order.id)}</td>
                    <td>${renderStatusToggle("paid", order.paid, order.id)}</td>
                    <td class="col-actions">
                        <div class="action-btn-group">
                            ${renderOrderLinkAction(order)}
                            <button class="action-btn" type="button" data-action="edit" data-order-id="${escapeHtml(order.id)}" aria-label="Edit order">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");

    ordersBody.innerHTML = rows;
    if (ordersGrid) {
        ordersGrid.innerHTML = "";
    }
}

function renderGrid(pageItems) {
    if (!ordersGrid) {
        renderListRows(pageItems);
        return;
    }

    const cards = pageItems
        .map((order) => {
            const customerInitials = getInitials(order.customerName);
            const marginLabel = order.margin.toFixed(2);
            const remainingClass = order.remainingDue < 0 ? "amount-negative" : "";

            return `
                <article class="order-card" data-order-id="${escapeHtml(order.id)}">
                    <div class="order-card-header">
                        <div class="user-cell">
                            <div class="user-avatar user-avatar-initials">${escapeHtml(customerInitials)}</div>
                            <div class="name-inline">
                                <span>${escapeHtml(order.customerName)}</span>
                                ${renderOwnerInitialBadge(order.ownerId)}
                            </div>
                        </div>
                        <div class="action-btn-group">
                            ${renderOrderLinkAction(order)}
                            <button class="action-btn" type="button" data-action="edit" data-order-id="${escapeHtml(order.id)}" aria-label="Edit order">
                                <i class="ph ph-pencil-simple"></i>
                            </button>
                        </div>
                    </div>
                    <div class="order-card-meta">
                        <span>${formatDateNl(order.orderDate)}</span>
                        <span>${escapeHtml(order.itemName)}</span>
                    </div>
                    <dl class="order-card-metrics">
                        <div>
                            <dt>Purchase</dt>
                            <dd>${formatCurrency(order.purchasePrice)}</dd>
                        </div>
                        <div>
                            <dt>Weight</dt>
                            <dd>${escapeHtml(formatWeightDisplay(order))}</dd>
                        </div>
                        <div>
                            <dt>Shipping</dt>
                            <dd>${renderShippingCostCell(order)}</dd>
                        </div>
                        <div>
                            <dt>Margin</dt>
                            <dd>${marginLabel}</dd>
                        </div>
                        <div>
                            <dt>Advance</dt>
                            <dd>${formatCurrency(order.advancePaid)}</dd>
                        </div>
                        <div>
                            <dt>Total</dt>
                            <dd>${formatCurrency(order.salePrice)}</dd>
                        </div>
                        <div>
                            <dt>Remaining</dt>
                            <dd class="${remainingClass}">${formatCurrency(order.remainingDue)}</dd>
                        </div>
                    </dl>
                    <div class="order-card-status">
                        ${renderStatusToggle("arrived", order.arrived, order.id)}
                        ${renderStatusToggle("paid", order.paid, order.id)}
                    </div>
                </article>
            `;
        })
        .join("");

    ordersGrid.innerHTML = cards;
    ordersBody.innerHTML = "";
}

function renderEmptyState(message) {
    const safeMessage = escapeHtml(message);
    if (viewMode === VIEW_MODE_GRID && ordersGrid) {
        ordersGrid.innerHTML = `
            <div class="empty-state empty-state-grid">
                <i class="ph ph-package"></i>
                <p>${safeMessage}</p>
            </div>
        `;
        ordersBody.innerHTML = "";
        return;
    }

    ordersBody.innerHTML = `
        <tr>
            <td colspan="14">
                <div class="empty-state">
                    <i class="ph ph-package"></i>
                    <p>${safeMessage}</p>
                </div>
            </td>
        </tr>
    `;
    if (ordersGrid) {
        ordersGrid.innerHTML = "";
    }
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

async function addTeamMember() {
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

    if (!dataService) {
        showTeamError("Cloud data service is unavailable.");
        return;
    }

    try {
        const created = await dataService.createTeamMember(rawName);
        const normalized = normalizeTeamMember(created);
        if (!normalized) {
            throw new Error("Created team member returned invalid data.");
        }
        teamMembers.push(normalized);
        teamMemberNameInput.value = "";
        refreshTeamUI();
    } catch (error) {
        showTeamError(getErrorMessage(error, "Could not add team member."));
    }
}

async function renameTeamMember(memberId, nextNameRaw) {
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

    if (!dataService) {
        showTeamError("Cloud data service is unavailable.");
        return;
    }

    try {
        const updated = await dataService.renameTeamMember(memberId, nextName);
        const normalized = normalizeTeamMember(updated);
        if (!normalized) {
            throw new Error("Updated team member returned invalid data.");
        }
        teamMembers = teamMembers.map((item) => (item.id === memberId ? normalized : item));
        refreshTeamUI();
    } catch (error) {
        showTeamError(getErrorMessage(error, "Could not rename team member."));
    }
}

async function removeTeamMember(memberId) {
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

    if (!dataService) {
        showTeamError("Cloud data service is unavailable.");
        return;
    }

    try {
        await dataService.deleteTeamMember(memberId);
        teamMembers = teamMembers.filter((member) => member.id !== memberId);
        refreshTeamUI();
    } catch (error) {
        showTeamError(getErrorMessage(error, "Could not remove team member."));
    }
}

function refreshTeamUI() {
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

async function initializeApp() {
    syncOwnerControls();
    renderTable();
    updateCalculationPanel();
    renderTeamMembersList();

    if (!dataService) {
        showAppError("Cloud data service is unavailable.");
        renderEmptyState(DATA_LOAD_ERROR_MESSAGE);
        return;
    }

    try {
        teamMembers = await fetchTeamMembersRemote();

        if (!teamMembers.length) {
            await seedDefaultTeamMembers();
            teamMembers = await fetchTeamMembersRemote();
        }

        orders = await fetchOrdersRemote();
        clearLegacyLocalStorage();
        refreshTeamUI();
    } catch (error) {
        if (isAuthSessionMissingError(error)) {
            redirectToAuthFromApp();
            return;
        }
        console.error(error);
        renderEmptyState(DATA_LOAD_ERROR_MESSAGE);
        showAppError(getErrorMessage(error, DATA_LOAD_ERROR_MESSAGE));
    }
}

function renderOrderLinkAction(order) {
    const links = Array.isArray(order.itemLinks) ? order.itemLinks : [];
    if (!links.length) {
        return "";
    }

    return `
        <button
            type="button"
            class="action-btn action-btn-link"
            data-action="open-links"
            data-order-id="${escapeHtml(order.id)}"
            aria-label="Open item links"
            title="Open item links"
        >
            <i class="ph ph-link-simple"></i>
        </button>
    `;
}

async function fetchTeamMembersRemote() {
    const rows = await dataService.fetchTeamMembers();
    if (!Array.isArray(rows)) {
        return [];
    }

    const normalized = rows
        .map((entry) => normalizeTeamMember(entry))
        .filter((entry) => entry !== null);

    return normalized;
}

async function fetchOrdersRemote() {
    const rows = await dataService.fetchOrders();
    if (!Array.isArray(rows)) {
        return [];
    }

    return rows
        .map((entry) => normalizeOrder(entry))
        .filter((entry) => entry !== null);
}

async function seedDefaultTeamMembers() {
    for (const name of DEFAULT_TEAM_NAMES) {
        try {
            await dataService.createTeamMember(name);
        } catch (error) {
            const message = String(error && error.message ? error.message : error || "").toLowerCase();
            if (message.includes("duplicate")) {
                continue;
            }
            throw error;
        }
    }
}

function clearLegacyLocalStorage() {
    try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        localStorage.removeItem(LEGACY_TEAM_STORAGE_KEY);
    } catch (error) {
        // Ignore storage cleanup issues.
    }
}

function normalizeTeamMember(value) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const id = String(value.id || "").trim();
    const name = String(value.name || "").trim();
    const createdAtInput = String(value.createdAt || value.created_at || "");
    const createdAtMs = Date.parse(createdAtInput);
    const createdAt = Number.isNaN(createdAtMs) ? new Date().toISOString() : new Date(createdAtMs).toISOString();

    if (!id || !name) {
        return null;
    }

    return { id, name, createdAt };
}

function normalizeOrder(value) {
    if (!value || typeof value !== "object") {
        return null;
    }

    const customerName = String(value.customerName || value.customer_name || "").trim();
    const orderDate = String(value.orderDate || value.order_date || "");
    const itemName = String(value.itemName || value.item_name || "").trim();
    const itemLinks = normalizeItemLinks(value.itemLinks ?? value.item_links);
    const specialNotes = String(value.specialNotes ?? value.special_notes ?? "").trim().slice(0, 500);
    const purchasePrice = parseNumber(value.purchasePrice ?? value.purchase_price);
    const shippingType = normalizeShippingType(value.shippingType ?? value.shipping_type);
    const weightLbs = parseNumber(value.weightLbs ?? value.weight_lbs);
    const lengthIn = parseNumber(value.lengthIn ?? value.length_in);
    const widthIn = parseNumber(value.widthIn ?? value.width_in);
    const heightIn = parseNumber(value.heightIn ?? value.height_in);
    const margin = parseNumber(value.margin);
    const advancePaid = parseNumber(value.advancePaid ?? value.advance_paid);
    const id = String(value.id || "");
    const ownerIdRaw = String(value.ownerId || value.owner_id || "");
    const ownerId = isValidTeamOwnerId(ownerIdRaw) ? ownerIdRaw : UNASSIGNED_OWNER_ID;
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
    if (!ALLOWED_MARGINS.includes(margin)) {
        return null;
    }

    const computedShippingCost = calculateShipping({ shippingType, weightLbs, lengthIn, widthIn, heightIn });
    const rawShippingCost = Number.parseFloat(value.shippingCost ?? value.shipping_cost);
    const shippingCost = Number.isFinite(rawShippingCost) ? roundMoney(rawShippingCost) : computedShippingCost;
    const rawSalePrice = Number.parseFloat(value.salePrice ?? value.sale_price);
    const salePrice = Number.isFinite(rawSalePrice)
        ? roundMoney(rawSalePrice)
        : calculateSalePrice(purchasePrice, shippingCost, margin);
    const rawRemainingDue = Number.parseFloat(value.remainingDue ?? value.remaining_due);
    const remainingDue = Number.isFinite(rawRemainingDue)
        ? roundMoney(rawRemainingDue)
        : calculateRemaining(salePrice, advancePaid);

    /** @type {Order} */
    const normalized = {
        id,
        customerName,
        ownerId,
        orderDate,
        itemName,
        itemLinks,
        specialNotes,
        purchasePrice: roundMoney(purchasePrice),
        weightLbs: roundMoney(weightLbs),
        shippingType,
        lengthIn: roundMoney(lengthIn),
        widthIn: roundMoney(widthIn),
        heightIn: roundMoney(heightIn),
        margin,
        shippingCost,
        salePrice,
        advancePaid: roundMoney(advancePaid),
        remainingDue,
        arrived: Boolean(value.arrived),
        paid: Boolean(value.paid),
        invoiceId,
        invoiceIssuedAt,
        createdAt
    };

    return normalized;
}
function isValidTeamOwnerId(ownerId) {
    return teamMembers.some((member) => member.id === ownerId);
}

function normalizeShippingType(value) {
    return String(value || "").toLowerCase() === "sea" ? "sea" : "air";
}

function validateItemLinks(links) {
    const itemLinks = Array.isArray(links) ? links : [];
    if (itemLinks.length > ITEM_LINKS_MAX_COUNT) {
        return `You can add up to ${ITEM_LINKS_MAX_COUNT} item links.`;
    }

    for (const link of itemLinks) {
        const parsed = parseHttpUrl(link);
        if (!parsed) {
            return "Each item link must be a valid URL (http/https).";
        }
    }

    return "";
}

function normalizeItemLinks(value) {
    const raw = Array.isArray(value) ? value : [];
    const unique = [];
    const seen = new Set();

    for (const linkValue of raw) {
        const link = String(linkValue || "").trim();
        if (!link || seen.has(link)) {
            continue;
        }
        seen.add(link);
        unique.push(link);
        if (unique.length >= ITEM_LINKS_MAX_COUNT) {
            break;
        }
    }

    return unique;
}

function normalizeHttpUrl(value) {
    const parsed = parseHttpUrl(value);
    return parsed ? parsed.href : "";
}

function parseHttpUrl(value) {
    try {
        const parsed = new URL(String(value || "").trim());
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed;
    } catch (error) {
        return null;
    }
}

function extractLinkHostLabel(urlValue) {
    try {
        const parsed = new URL(String(urlValue || "").trim());
        return parsed.host || "Link";
    } catch (error) {
        return "Link";
    }
}

function formatLinkDisplayLabel(urlValue) {
    const parsed = parseHttpUrl(urlValue);
    if (!parsed) {
        return String(urlValue || "").trim();
    }

    const path = parsed.pathname === "/" ? "" : parsed.pathname;
    const suffix = `${path}${parsed.search || ""}`;
    const combined = `${parsed.host}${suffix}`;
    if (combined.length <= 55) {
        return combined;
    }

    return `${combined.slice(0, 52)}...`;
}

function syncShippingTypeFields() {
    const shippingType = normalizeShippingType(shippingTypeSelect ? shippingTypeSelect.value : "air");
    const isSea = shippingType === "sea";

    const weightField = orderForm.elements.namedItem("weightLbs");
    if (weightField) {
        weightField.disabled = isSea;
        weightField.required = !isSea;
    }

    seaDimensionFields.forEach((field) => {
        field.classList.toggle("hidden", !isSea);
        const input = field.querySelector("input");
        if (!input) {
            return;
        }
        input.disabled = !isSea;
        input.required = isSea;
    });
}

function formatDimension(value) {
    const numeric = roundMoney(value);
    if (Number.isInteger(numeric)) {
        return String(numeric);
    }
    return numeric.toFixed(2).replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
}

function formatWeightDisplay(order) {
    if (order.shippingType === "sea") {
        return "-";
    }
    return `${order.weightLbs.toFixed(2)} lbs`;
}

function renderShippingCostCell(order) {
    const isSea = order.shippingType === "sea";
    const iconClass = isSea ? "ph-boat" : "ph-airplane-tilt";
    const typeClass = isSea ? "shipping-cost-sea" : "shipping-cost-air";
    const title = isSea ? "Sea freight" : "Air freight";

    return `
        <span class="shipping-cost-cell ${typeClass}" title="${title}">
            <i class="ph ${iconClass} shipping-cost-icon" aria-hidden="true"></i>
            <span>${formatCurrency(order.shippingCost)}</span>
        </span>
    `;
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

function getInvoiceConfigValue(key, fallbackValue) {
    const value = invoiceConfig && Object.prototype.hasOwnProperty.call(invoiceConfig, key)
        ? invoiceConfig[key]
        : undefined;

    if (typeof value === "string" && value.trim()) {
        return value.trim();
    }

    return fallbackValue;
}

function resolveInvoiceLogoPath(ownerName) {
    const defaultLogo = getInvoiceConfigValue("defaultLogoPath", "assets/images/logo.png");
    const lookup = invoiceConfig && typeof invoiceConfig.ownerLogoByName === "object" && invoiceConfig.ownerLogoByName
        ? invoiceConfig.ownerLogoByName
        : {};
    const key = String(ownerName || "").trim().toLowerCase();

    if (!key) {
        return defaultLogo;
    }

    const ownerLogo = lookup[key];
    if (typeof ownerLogo === "string" && ownerLogo.trim()) {
        return ownerLogo.trim();
    }

    return defaultLogo;
}

function toAbsoluteUrl(path) {
    const raw = String(path || "").trim();
    if (!raw) {
        return "";
    }

    try {
        return new URL(raw, window.location.href).href;
    } catch (error) {
        return raw;
    }
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




