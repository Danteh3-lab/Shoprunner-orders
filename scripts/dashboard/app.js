const LEGACY_STORAGE_KEY = "shoprunner.orders.v1";
const LEGACY_TEAM_STORAGE_KEY = "shoprunner.team.v1";
const AIR_SHIPPING_RATE = 4.5;
const SEA_CUBE_DIVISOR = 1728;
const SEA_RATE_PER_CUBE = 15;
const ALLOWED_MARGINS = [1.0, 1.1, 1.15, 1.2];
const OWNER_FILTER_ALL = "all";
const UNASSIGNED_OWNER_ID = "unassigned";
const DEFAULT_TEAM_NAMES = ["Danick", "Armand", "Penelope"];
const DATA_LOAD_ERROR_MESSAGE = "Could not load cloud data. Please refresh and try again.";
const DATE_RANGE_LAST_30 = "last30";
const DATE_RANGE_THIS_MONTH = "thisMonth";
const DATE_RANGE_ALL = "all";
const VIEW_MODE_LIST = "list";
const VIEW_MODE_GRID = "grid";
const PAGE_ORDERS = "orders";
const PAGE_OWNER_PERFORMANCE = "owner-performance";
const PERFORMANCE_PERIOD_THIS_MONTH = "thisMonth";
const PERFORMANCE_PERIOD_LAST_30 = "last30";
const PERFORMANCE_PERIOD_MONTH = "month";
const PERFORMANCE_PERIOD_ALL = "all";
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
 * @property {string} email
 * @property {string} createdAt
 */

const dataService = window.shoprunnerDataService;
const invoiceConfig = window.SHOPRUNNER_INVOICE_CONFIG || {};
const invoiceRenderer = window.shoprunnerInvoiceRenderer;
const authConfig = window.SHOPRUNNER_AUTH_CONFIG || {};
const changelogEntries = Array.isArray(window.SHOPRUNNER_CHANGELOG) ? window.SHOPRUNNER_CHANGELOG : [];
const formatters = window.shoprunnerFormatters || {};
const ordersView = window.shoprunnerOrdersView || {};
const routingState = window.shoprunnerRoutingState || {};
const performanceView = window.shoprunnerPerformanceView || {};
const notificationsView = window.shoprunnerNotifications || {};
const teamSettingsHelpers = window.shoprunnerTeamSettings || {};
const orderNormalization = window.shoprunnerOrderNormalization || {};
const ordersRendering = window.shoprunnerOrdersRendering || {};
const dashboardEvents = window.shoprunnerDashboardEvents || {};

let teamMembers = [];
let orders = [];
let editingOrderId = null;
let selectedOwnerFilter = OWNER_FILTER_ALL;
let searchQuery = "";
let selectedDateRange = DATE_RANGE_LAST_30;
let viewMode = VIEW_MODE_LIST;
let activePage = PAGE_ORDERS;
let selectedPerformancePeriod = PERFORMANCE_PERIOD_THIS_MONTH;
let selectedPerformanceMonth = getCurrentMonthKey();
let draftItemLinks = [];
let itemLinksInlineWarning = "";
let deliveryReminders = [];
let notificationPanelOpen = false;
let teamMessageTimer = null;
let ownerProfitChart = null;
let teardownDashboardEvents = null;
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
const openOrdersBtn = document.getElementById("open-orders-btn");
const openOwnerPerformanceBtn = document.getElementById("open-owner-performance-btn");
const ordersPage = document.getElementById("orders-page");
const ownerPerformancePage = document.getElementById("owner-performance-page");
const ownerPerformancePeriodSelect = document.getElementById("owner-performance-period");
const ownerPerformanceMonthWrap = document.getElementById("owner-performance-month-wrap");
const ownerPerformanceMonthInput = document.getElementById("owner-performance-month");
const ownerProfitChartCanvas = document.getElementById("owner-profit-chart");
const ownerPerformanceContent = document.getElementById("owner-performance-content");
const ownerPerformanceEmpty = document.getElementById("owner-performance-empty");
const ownerProfitSummaryBody = document.getElementById("owner-profit-summary-body");

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
const teamMemberEmailInput = document.getElementById("team-member-email-input");
const teamFormError = document.getElementById("team-form-error");
const orderLinksModal = document.getElementById("order-links-modal");
const orderLinksList = document.getElementById("order-links-list");
const orderLinksTitle = document.getElementById("order-links-title");
const changelogModal = document.getElementById("changelog-modal");
const changelogList = document.getElementById("changelog-list");

function handleHashChange() {
    const hashState = parseDashboardHash(window.location.hash);
    selectedPerformancePeriod = hashState.period;
    selectedPerformanceMonth = hashState.month;
    setActivePage(hashState.page, { updateHash: false });
}

syncChangelogBadge();
syncNotificationBadge();

function bindDashboardListeners() {
    if (typeof dashboardEvents.bindDashboardEvents !== "function") {
        return;
    }

    if (typeof teardownDashboardEvents === "function") {
        teardownDashboardEvents();
    }

    teardownDashboardEvents = dashboardEvents.bindDashboardEvents({
        elements: {
            newOrderBtn,
            cancelOrderBtn,
            deleteOrderBtn,
            generateInvoiceBtn,
            openTeamSettingsBtn,
            openOrdersBtn,
            openOwnerPerformanceBtn,
            openChangelogBtn,
            notificationBtn,
            notificationPanel,
            notificationList,
            ordersBody,
            ordersGrid,
            ownerFilterSelect,
            ordersSearchInput,
            dateRangeSelect,
            ordersViewListBtn,
            ordersViewGridBtn,
            ownerPerformancePeriodSelect,
            ownerPerformanceMonthInput,
            paginationPrevBtn,
            paginationNextBtn,
            paginationPages,
            orderForm,
            addItemLinkBtn,
            itemLinkInput,
            itemLinksPreview,
            teamAddForm,
            teamMembersList,
            closeOrderModalNodes: document.querySelectorAll("[data-close-order-modal]"),
            closeTeamModalNodes: document.querySelectorAll("[data-close-team-modal]"),
            closeOrderLinksModalNodes: document.querySelectorAll("[data-close-order-links-modal]"),
            closeChangelogModalNodes: document.querySelectorAll("[data-close-changelog-modal]")
        },
        handlers: {
            openCreateModal,
            closeOrderModal,
            handleDeleteFromModal,
            handleGenerateInvoiceFromModal,
            openTeamModal,
            openOrdersPage: () => setActivePage(PAGE_ORDERS, { updateHash: true }),
            openOwnerPerformancePage: () => setActivePage(PAGE_OWNER_PERFORMANCE, { updateHash: true }),
            handleHashChange,
            openChangelogModal,
            toggleNotificationPanel,
            closeNotificationPanel,
            closeOrderLinksModal,
            closeChangelogModal,
            closeTeamModal,
            openNotificationOrder: (orderId) => {
                closeNotificationPanel();
                openEditModal(orderId);
            },
            handleOrderActionEvent,
            openEditModal,
            handleOwnerFilterChange: () => {
                selectedOwnerFilter = ownerFilterSelect.value;
                currentPage = 1;
                renderTable();
            },
            handleOrdersSearchInput: () => {
                searchQuery = String(ordersSearchInput.value || "").trim().toLowerCase();
                currentPage = 1;
                renderTable();
            },
            handleDateRangeChange: () => {
                if (!dateRangeSelect) {
                    return;
                }
                selectedDateRange = normalizeDateRange(dateRangeSelect.value);
                dateRangeSelect.value = selectedDateRange;
                currentPage = 1;
                renderTable();
            },
            showListView: () => setViewMode(VIEW_MODE_LIST),
            showGridView: () => setViewMode(VIEW_MODE_GRID),
            handlePerformancePeriodChange: () => {
                if (!ownerPerformancePeriodSelect) {
                    return;
                }
                selectedPerformancePeriod = normalizePerformancePeriod(ownerPerformancePeriodSelect.value);
                syncPerformanceControlsUi();
                const hashChanged = activePage === PAGE_OWNER_PERFORMANCE ? updateHashForCurrentState() : false;
                if (!hashChanged) {
                    renderOwnerPerformance();
                }
            },
            handlePerformanceMonthChange: () => {
                if (!ownerPerformanceMonthInput) {
                    return;
                }
                selectedPerformanceMonth = normalizePerformanceMonth(ownerPerformanceMonthInput.value);
                syncPerformanceControlsUi();
                const hashChanged = activePage === PAGE_OWNER_PERFORMANCE ? updateHashForCurrentState() : false;
                if (!hashChanged) {
                    renderOwnerPerformance();
                }
            },
            goToPreviousPage: () => goToPage(currentPage - 1),
            goToNextPage: () => goToPage(currentPage + 1),
            handlePaginationClick: (event) => {
                const pageButton = event.target.closest("button[data-page]");
                if (!pageButton) {
                    return;
                }
                const page = Number.parseInt(pageButton.dataset.page || "", 10);
                if (!Number.isFinite(page)) {
                    return;
                }
                goToPage(page);
            },
            handleOrderFormInput: (event) => {
                formError.classList.add("hidden");
                if (event.target && event.target.name === "itemLinkInput" && itemLinksInlineWarning) {
                    itemLinksInlineWarning = "";
                    renderItemLinksPreview();
                }
                syncShippingTypeFields();
                updateCalculationPanel();
            },
            handleOrderFormChange: (event) => {
                if (event.target && event.target.name === "shippingType") {
                    syncShippingTypeFields();
                    updateCalculationPanel();
                }
            },
            handleAddItemLink,
            removeItemLinkByIndex: (index) => {
                if (!Number.isInteger(index) || index < 0 || index >= draftItemLinks.length) {
                    return;
                }
                draftItemLinks.splice(index, 1);
                itemLinksInlineWarning = "";
                renderItemLinksPreview();
            },
            submitForm,
            addTeamMember,
            handleTeamListAction: async ({ action, memberId, listElement }) => {
                if (action === "save" || action === "rename") {
                    const nameInput = listElement.querySelector(
                        `input[data-member-id="${cssEscape(memberId)}"][data-team-field="name"]`
                    );
                    if (!nameInput) {
                        return;
                    }
                    const emailInput = listElement.querySelector(
                        `input[data-member-id="${cssEscape(memberId)}"][data-team-field="email"]`
                    );
                    await updateTeamMemberProfile(memberId, nameInput.value, emailInput ? emailInput.value : "");
                    return;
                }
                if (action === "remove") {
                    await removeTeamMember(memberId);
                }
            }
        },
        state: {
            isNotificationPanelOpen: () => notificationPanelOpen,
            isOrderLinksModalOpen: () => Boolean(orderLinksModal && !orderLinksModal.classList.contains("hidden")),
            isChangelogModalOpen: () => Boolean(changelogModal && !changelogModal.classList.contains("hidden")),
            isTeamModalOpen: () => Boolean(teamSettingsModal && !teamSettingsModal.classList.contains("hidden")),
            isOrderModalOpen: () => Boolean(orderModal && !orderModal.classList.contains("hidden"))
        }
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

syncShippingTypeFields();
syncViewModeUi();
const initialHashState = parseDashboardHash(window.location.hash);
selectedPerformancePeriod = initialHashState.period;
selectedPerformanceMonth = initialHashState.month;
setActivePage(initialHashState.page, { updateHash: String(window.location.hash || "").trim() === "" });
if (dateRangeSelect) {
    dateRangeSelect.value = selectedDateRange;
}
if (ownerPerformancePeriodSelect) {
    ownerPerformancePeriodSelect.value = selectedPerformancePeriod;
}
bindDashboardListeners();
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
    clearTeamMessage();
    renderTeamMembersList();
    teamSettingsModal.classList.remove("hidden");
    teamSettingsModal.setAttribute("aria-hidden", "false");
    syncBodyModalState();
    teamMemberNameInput.focus();
}

function closeTeamModal() {
    clearTeamMessage();
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
    if (typeof notificationsView.buildDeliveryReminders === "function") {
        return notificationsView.buildDeliveryReminders(items, {
            deliveryReminderDays: DELIVERY_REMINDER_DAYS,
            maxItems: NOTIFICATION_MAX_ITEMS,
            parseIsoDate
        });
    }
    return [];
}

function getDeliveryReminderFingerprint(items) {
    if (typeof notificationsView.getDeliveryReminderFingerprint === "function") {
        return notificationsView.getDeliveryReminderFingerprint(items);
    }
    return "";
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
    if (typeof notificationsView.shouldShowNotificationBadge === "function") {
        return notificationsView.shouldShowNotificationBadge(
            getDeliveryReminderFingerprint(deliveryReminders),
            getLastSeenDeliveryReminderFingerprint()
        );
    }
    return false;
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
    if (typeof notificationsView.renderNotificationItemsHtml === "function") {
        notificationList.innerHTML = notificationsView.renderNotificationItemsHtml(deliveryReminders, {
            formatDate: formatDateNl,
            escapeHtml
        });
        return;
    }
    notificationList.innerHTML = "";
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

function showTeamMessage(message, type) {
    clearTeamMessage();
    teamFormError.textContent = message;
    teamFormError.classList.toggle("form-success", type === "success");
    teamFormError.classList.remove("hidden");

    if (type === "success") {
        teamMessageTimer = window.setTimeout(() => {
            clearTeamMessage();
        }, 2000);
    }
}

function showTeamError(message) {
    showTeamMessage(message, "error");
}

function showTeamSuccess(message) {
    showTeamMessage(message, "success");
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

function clearTeamMessage() {
    if (teamMessageTimer !== null) {
        window.clearTimeout(teamMessageTimer);
        teamMessageTimer = null;
    }

    teamFormError.textContent = "";
    teamFormError.classList.remove("form-success");
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
        return "Margin must be one of: 1.00, 1.10, 1.15, 1.20.";
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
    if (typeof formatters.roundMoney === "function") {
        return formatters.roundMoney(value);
    }
    const numeric = parseNumber(value);
    return Math.round((numeric + Number.EPSILON) * 100) / 100;
}

function parseNumber(value) {
    if (typeof formatters.parseNumber === "function") {
        return formatters.parseNumber(value);
    }
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function getFilteredSortedOrders() {
    if (typeof ordersView.getFilteredSortedOrders === "function") {
        return ordersView.getFilteredSortedOrders(orders, {
            selectedOwnerFilter,
            searchQuery,
            selectedDateRange,
            selectedMonth: getCurrentMonthKey(),
            parseIsoDate,
            normalizeMonthKey: normalizePerformanceMonth,
            constants: {
                OWNER_FILTER_ALL,
                UNASSIGNED_OWNER_ID,
                DATE_RANGE_LAST_30,
                DATE_RANGE_THIS_MONTH,
                DATE_RANGE_MONTH: "month",
                DATE_RANGE_ALL
            }
        });
    }
    return [];
}

function normalizeDateRange(value) {
    if (typeof ordersView.normalizeDateRange === "function") {
        return ordersView.normalizeDateRange(value, {
            DATE_RANGE_LAST_30,
            DATE_RANGE_THIS_MONTH,
            DATE_RANGE_MONTH: "month",
            DATE_RANGE_ALL
        });
    }
    return DATE_RANGE_LAST_30;
}

function parseIsoDate(value) {
    if (typeof formatters.parseIsoDate === "function") {
        return formatters.parseIsoDate(value);
    }
    return null;
}

function paginateItems(items, page, size) {
    if (typeof ordersView.paginateItems === "function") {
        return ordersView.paginateItems(items, page, size);
    }
    return { pageItems: items, totalItems: items.length, totalPages: 1, page: 1, startIndex: 0, endIndex: 0 };
}

function buildPaginationItems(current, totalPages) {
    if (typeof ordersView.buildPaginationItems === "function") {
        return ordersView.buildPaginationItems(current, totalPages);
    }
    return [1];
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

function normalizeActivePage(value) {
    if (typeof routingState.normalizeActivePage === "function") {
        return routingState.normalizeActivePage(value, {
            PAGE_ORDERS,
            PAGE_OWNER_PERFORMANCE
        });
    }
    return value === PAGE_OWNER_PERFORMANCE ? PAGE_OWNER_PERFORMANCE : PAGE_ORDERS;
}

function normalizePerformancePeriod(value) {
    if (typeof routingState.normalizePerformancePeriod === "function") {
        return routingState.normalizePerformancePeriod(value, {
            PERFORMANCE_PERIOD_THIS_MONTH,
            PERFORMANCE_PERIOD_LAST_30,
            PERFORMANCE_PERIOD_MONTH,
            PERFORMANCE_PERIOD_ALL
        });
    }
    return value === PERFORMANCE_PERIOD_LAST_30 ? PERFORMANCE_PERIOD_LAST_30 : PERFORMANCE_PERIOD_THIS_MONTH;
}

function normalizePerformanceMonth(value) {
    if (typeof formatters.normalizeMonthKey === "function") {
        return formatters.normalizeMonthKey(value);
    }
    return getCurrentMonthKey();
}

function parseDashboardHash(hashValue) {
    if (typeof routingState.parseDashboardHash === "function") {
        return routingState.parseDashboardHash(hashValue, {
            pages: {
                PAGE_ORDERS,
                PAGE_OWNER_PERFORMANCE
            },
            periods: {
                PERFORMANCE_PERIOD_THIS_MONTH,
                PERFORMANCE_PERIOD_LAST_30,
                PERFORMANCE_PERIOD_MONTH,
                PERFORMANCE_PERIOD_ALL
            },
            normalizeMonthKey: normalizePerformanceMonth,
            defaultMonth: getCurrentMonthKey(),
            currentPeriod: selectedPerformancePeriod,
            currentMonth: selectedPerformanceMonth
        });
    }
    return {
        page: PAGE_ORDERS,
        period: PERFORMANCE_PERIOD_THIS_MONTH,
        month: getCurrentMonthKey()
    };
}

function buildDashboardHash(page) {
    if (typeof routingState.buildDashboardHash === "function") {
        return routingState.buildDashboardHash({
            page,
            period: selectedPerformancePeriod,
            month: selectedPerformanceMonth,
            pages: {
                PAGE_ORDERS,
                PAGE_OWNER_PERFORMANCE
            },
            periods: {
                PERFORMANCE_PERIOD_THIS_MONTH,
                PERFORMANCE_PERIOD_LAST_30,
                PERFORMANCE_PERIOD_MONTH,
                PERFORMANCE_PERIOD_ALL
            },
            normalizeMonthKey: normalizePerformanceMonth
        });
    }
    return `#${normalizeActivePage(page)}`;
}

function updateHashForCurrentState() {
    const targetHash = buildDashboardHash(activePage);
    if (window.location.hash === targetHash) {
        return false;
    }
    window.location.hash = targetHash;
    return true;
}

function setActivePage(nextPage, options = {}) {
    const updateHash = options.updateHash !== false;
    const normalized = normalizeActivePage(nextPage);
    activePage = normalized;

    if (updateHash) {
        const targetHash = buildDashboardHash(normalized);
        if (window.location.hash !== targetHash) {
            window.location.hash = targetHash;
        }
    }

    syncActivePageUi();
    if (normalized === PAGE_OWNER_PERFORMANCE) {
        renderOwnerPerformance();
    }
}

function syncActivePageUi() {
    const showOrders = activePage === PAGE_ORDERS;
    const showPerformance = activePage === PAGE_OWNER_PERFORMANCE;
    syncPerformanceControlsUi();

    if (openOrdersBtn) {
        openOrdersBtn.classList.toggle("active", showOrders);
    }
    if (openOwnerPerformanceBtn) {
        openOwnerPerformanceBtn.classList.toggle("active", showPerformance);
    }
    if (ordersPage) {
        ordersPage.classList.toggle("hidden", !showOrders);
        ordersPage.setAttribute("aria-hidden", String(!showOrders));
    }
    if (ownerPerformancePage) {
        ownerPerformancePage.classList.toggle("hidden", !showPerformance);
        ownerPerformancePage.setAttribute("aria-hidden", String(!showPerformance));
    }
}

function syncPerformanceControlsUi() {
    const normalizedPeriod = normalizePerformancePeriod(selectedPerformancePeriod);
    const normalizedMonth = normalizePerformanceMonth(selectedPerformanceMonth);
    const showMonthInput = normalizedPeriod === PERFORMANCE_PERIOD_MONTH;

    selectedPerformancePeriod = normalizedPeriod;
    selectedPerformanceMonth = normalizedMonth;

    if (ownerPerformancePeriodSelect) {
        ownerPerformancePeriodSelect.value = normalizedPeriod;
    }
    if (ownerPerformanceMonthInput) {
        ownerPerformanceMonthInput.value = normalizedMonth;
        ownerPerformanceMonthInput.disabled = !showMonthInput;
    }
    if (ownerPerformanceMonthWrap) {
        ownerPerformanceMonthWrap.classList.toggle("hidden", !showMonthInput);
        ownerPerformanceMonthWrap.setAttribute("aria-hidden", String(!showMonthInput));
    }
}

function renderTable() {
    refreshDeliveryReminders();
    renderOwnerPerformance();
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

function renderOwnerPerformance() {
    if (!ownerPerformancePage || !ownerPerformanceContent || !ownerPerformanceEmpty || !ownerProfitSummaryBody) {
        return;
    }

    selectedPerformancePeriod = normalizePerformancePeriod(
        ownerPerformancePeriodSelect ? ownerPerformancePeriodSelect.value : selectedPerformancePeriod
    );
    selectedPerformanceMonth = normalizePerformanceMonth(
        ownerPerformanceMonthInput ? ownerPerformanceMonthInput.value : selectedPerformanceMonth
    );
    syncPerformanceControlsUi();

    const eligibleOrders = orders.filter((order) => isProfitEligible(order));
    const dateRange = getPerformanceDateRange(selectedPerformancePeriod, eligibleOrders, selectedPerformanceMonth);
    if (!dateRange) {
        renderOwnerPerformanceEmpty("No paid and arrived owner orders for this period.");
        return;
    }

    const rangedOrders = eligibleOrders.filter((order) =>
        isOrderDateWithinRange(order.orderDate, dateRange.startDate, dateRange.endDate)
    );
    const ownerSeries = aggregateOwnerPerformanceByDay(rangedOrders, dateRange.labels);
    if (!ownerSeries.length) {
        renderOwnerPerformanceEmpty("No paid and arrived owner orders for this period.");
        return;
    }

    ownerPerformanceContent.classList.remove("hidden");
    ownerPerformanceEmpty.classList.add("hidden");
    renderOwnerProfitChart(dateRange.labels, ownerSeries);
    renderOwnerProfitSummary(ownerSeries);
}

function renderOwnerPerformanceEmpty(message) {
    if (ownerPerformanceContent) {
        ownerPerformanceContent.classList.add("hidden");
    }
    if (ownerPerformanceEmpty) {
        const emptyParagraph = ownerPerformanceEmpty.querySelector("p");
        if (emptyParagraph) {
            emptyParagraph.textContent = message;
        }
        ownerPerformanceEmpty.classList.remove("hidden");
    }
    if (ownerProfitSummaryBody) {
        ownerProfitSummaryBody.innerHTML = "";
    }
    destroyOwnerProfitChart();
}

function renderOwnerProfitSummary(ownerSeries) {
    if (!ownerProfitSummaryBody) {
        return;
    }

    ownerProfitSummaryBody.innerHTML = ownerSeries
        .map((entry) => `
            <tr>
                <td>${escapeHtml(entry.ownerName)}</td>
                <td>${formatCurrency(entry.totalProfit)}</td>
                <td>${entry.orderCount}</td>
                <td>${formatCurrency(entry.avgProfit)}</td>
            </tr>
        `)
        .join("");
}

function renderOwnerProfitChart(dateLabels, ownerSeries) {
    destroyOwnerProfitChart();
    if (!ownerProfitChartCanvas) {
        return;
    }

    const chartWrap = ownerProfitChartCanvas.parentElement;
    if (chartWrap) {
        chartWrap.querySelectorAll(".owner-profit-chart-fallback").forEach((node) => node.remove());
    }

    const ChartCtor = window.Chart;
    if (typeof ChartCtor !== "function") {
        ownerProfitChartCanvas.classList.add("hidden");
        if (chartWrap) {
            const fallback = document.createElement("p");
            fallback.className = "owner-profit-chart-fallback";
            fallback.textContent = "Chart is unavailable right now.";
            chartWrap.appendChild(fallback);
        }
        return;
    }

    ownerProfitChartCanvas.classList.remove("hidden");

    const datasets = ownerSeries.map((entry) => {
        const color = getOwnerColor(entry.ownerName);
        return {
            label: entry.ownerName,
            data: entry.dailyProfits,
            borderColor: color.text,
            backgroundColor: hexToRgba(color.text, 0.15),
            pointRadius: 2,
            pointHoverRadius: 4,
            borderWidth: 2,
            tension: 0.24,
            fill: false
        };
    });

    const context = ownerProfitChartCanvas.getContext("2d");
    if (!context) {
        return;
    }

    ownerProfitChart = new ChartCtor(context, {
        type: "line",
        data: {
            labels: dateLabels,
            datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    position: "top"
                },
                tooltip: {
                    callbacks: {
                        title(items) {
                            const raw = items && items[0] ? String(items[0].label || "") : "";
                            return formatDateNl(raw);
                        },
                        label(tooltipContext) {
                            const value = Number(
                                tooltipContext.parsed && tooltipContext.parsed.y ? tooltipContext.parsed.y : 0
                            );
                            return `${tooltipContext.dataset.label}: ${formatCurrency(value)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        callback(value, index, ticks) {
                            const label = ticks[index] && ticks[index].label ? String(ticks[index].label) : "";
                            return formatDateNl(label);
                        }
                    }
                },
                y: {
                    ticks: {
                        callback(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

function destroyOwnerProfitChart() {
    if (ownerProfitChart && typeof ownerProfitChart.destroy === "function") {
        ownerProfitChart.destroy();
    }
    ownerProfitChart = null;
    if (ownerProfitChartCanvas) {
        ownerProfitChartCanvas.classList.remove("hidden");
    }
}

function isProfitEligible(order) {
    if (typeof performanceView.isProfitEligible === "function") {
        return performanceView.isProfitEligible(order, {
            unassignedOwnerId: UNASSIGNED_OWNER_ID,
            getOwnerById: getTeamMemberById
        });
    }
    return false;
}

function computeOrderProfit(order) {
    if (typeof performanceView.computeOrderProfit === "function") {
        return performanceView.computeOrderProfit(order, roundMoney);
    }
    return 0;
}

function getPerformanceDateRange(period, eligibleOrders, selectedMonth) {
    if (typeof performanceView.getPerformanceDateRange === "function") {
        return performanceView.getPerformanceDateRange(
            normalizePerformancePeriod(period),
            eligibleOrders,
            selectedMonth,
            {
                periods: {
                    PERFORMANCE_PERIOD_THIS_MONTH,
                    PERFORMANCE_PERIOD_LAST_30,
                    PERFORMANCE_PERIOD_MONTH,
                    PERFORMANCE_PERIOD_ALL
                },
                normalizeMonthKey: normalizePerformanceMonth,
                parseIsoDate,
                formatDateIso
            }
        );
    }
    return null;
}

function isOrderDateWithinRange(orderDate, startDate, endDate) {
    if (typeof performanceView.isOrderDateWithinRange === "function") {
        return performanceView.isOrderDateWithinRange(orderDate, startDate, endDate, parseIsoDate);
    }
    return false;
}

function aggregateOwnerPerformanceByDay(items, dateLabels) {
    if (typeof performanceView.aggregateOwnerPerformanceByDay === "function") {
        return performanceView.aggregateOwnerPerformanceByDay(items, dateLabels, {
            getOwnerById: getTeamMemberById,
            parseIsoDate,
            formatDateIso,
            roundMoney
        });
    }
    return [];
}

function formatDateIso(value) {
    if (typeof formatters.formatDateIso === "function") {
        return formatters.formatDateIso(value);
    }
    return "";
}

function hexToRgba(hexColor, alpha) {
    if (typeof formatters.hexToRgba === "function") {
        return formatters.hexToRgba(hexColor, alpha);
    }
    return `rgba(37, 99, 235, ${alpha})`;
}

function getEmptyStateMessage() {
    if (typeof ordersView.getEmptyStateMessage === "function") {
        return ordersView.getEmptyStateMessage({
            searchQuery,
            selectedOwnerFilter,
            selectedDateRange,
            constants: {
                OWNER_FILTER_ALL,
                DATE_RANGE_LAST_30,
                DATE_RANGE_THIS_MONTH,
                DATE_RANGE_MONTH: "month",
                DATE_RANGE_ALL
            }
        });
    }
    return "No orders found.";
}

function renderListRows(pageItems) {
    const rows = typeof ordersRendering.renderListRowsHtml === "function"
        ? ordersRendering.renderListRowsHtml(pageItems, {
            escapeHtml,
            formatDateNl,
            formatCurrency,
            formatWeightDisplay,
            renderShippingCostCell,
            renderOrderLinkAction,
            getTeamMemberById,
            getInitials,
            ownerPalette: OWNER_COLOR_PALETTE,
            unassignedOwnerId: UNASSIGNED_OWNER_ID
        })
        : "";
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

    const cards = typeof ordersRendering.renderGridHtml === "function"
        ? ordersRendering.renderGridHtml(pageItems, {
            escapeHtml,
            formatDateNl,
            formatCurrency,
            formatWeightDisplay,
            renderShippingCostCell,
            renderOrderLinkAction,
            getTeamMemberById,
            getInitials,
            ownerPalette: OWNER_COLOR_PALETTE,
            unassignedOwnerId: UNASSIGNED_OWNER_ID
        })
        : "";
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
    if (typeof ordersRendering.renderStatusToggle === "function") {
        return ordersRendering.renderStatusToggle(type, active, orderId, escapeHtml);
    }
    return "";
}

function renderOwnerInitialBadge(ownerId) {
    if (typeof ordersRendering.renderOwnerInitialBadge === "function") {
        return ordersRendering.renderOwnerInitialBadge(ownerId, {
            getTeamMemberById,
            getInitials,
            escapeHtml,
            ownerPalette: OWNER_COLOR_PALETTE,
            unassignedOwnerId: UNASSIGNED_OWNER_ID
        });
    }
    return "";
}

function getOwnerColor(name) {
    if (typeof ordersRendering.getOwnerColor === "function") {
        return ordersRendering.getOwnerColor(String(name || ""), OWNER_COLOR_PALETTE);
    }
    return OWNER_COLOR_PALETTE[0];
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
    clearTeamMessage();
    const rawName = String(teamMemberNameInput.value || "").trim();
    const rawEmail = normalizeEmailInput(teamMemberEmailInput ? teamMemberEmailInput.value : "");
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

    const emailError = getTeamEmailValidationError(rawEmail);
    if (emailError) {
        showTeamError(emailError);
        return;
    }

    if (!dataService) {
        showTeamError("Cloud data service is unavailable.");
        return;
    }

    try {
        const created = await dataService.createTeamMember(rawName, rawEmail || null);
        const normalized = normalizeTeamMember(created);
        if (!normalized) {
            throw new Error("Created team member returned invalid data.");
        }
        teamMembers.push(normalized);
        teamMemberNameInput.value = "";
        if (teamMemberEmailInput) {
            teamMemberEmailInput.value = "";
        }
        refreshTeamUI();
        showTeamSuccess("Team member added.");
    } catch (error) {
        showTeamError(getErrorMessage(error, "Could not add team member."));
    }
}

async function updateTeamMemberProfile(memberId, nextNameRaw, nextEmailRaw) {
    clearTeamMessage();
    const nextName = String(nextNameRaw || "").trim();
    const nextEmail = normalizeEmailInput(nextEmailRaw);
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

    const emailError = getTeamEmailValidationError(nextEmail);
    if (emailError) {
        showTeamError(emailError);
        return;
    }

    if (!dataService) {
        showTeamError("Cloud data service is unavailable.");
        return;
    }

    try {
        if (typeof dataService.updateTeamMember !== "function") {
            throw new Error("Cloud data service does not support team profile updates.");
        }
        const updated = await dataService.updateTeamMember(memberId, {
            name: nextName,
            email: nextEmail || null
        });
        const normalized = normalizeTeamMember(updated);
        if (!normalized) {
            throw new Error("Updated team member returned invalid data.");
        }
        teamMembers = teamMembers.map((item) => (item.id === memberId ? normalized : item));
        refreshTeamUI();
        showTeamSuccess("Team member updated.");
    } catch (error) {
        showTeamError(getErrorMessage(error, "Could not update team member."));
    }
}

async function removeTeamMember(memberId) {
    clearTeamMessage();
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
        showTeamSuccess("Team member removed.");
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
                        data-team-field="name"
                        maxlength="80"
                        value="${escapeHtml(member.name)}"
                    />
                    <input
                        type="email"
                        class="team-email-input"
                        data-member-id="${escapeHtml(member.id)}"
                        data-team-field="email"
                        maxlength="254"
                        inputmode="email"
                        placeholder="owner@example.com"
                        value="${escapeHtml(member.email || "")}"
                    />
                    <span class="team-order-count">${assignedCount} orders</span>
                    <button type="button" class="btn btn-secondary team-btn" data-team-action="save" data-member-id="${escapeHtml(member.id)}">Save</button>
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
    if (typeof orderNormalization.normalizeTeamMember === "function") {
        return orderNormalization.normalizeTeamMember(value, {
            normalizeEmailInput,
            isValidEmailFormat
        });
    }
    return null;
}

function normalizeOrder(value) {
    if (typeof orderNormalization.normalizeOrder === "function") {
        return orderNormalization.normalizeOrder(value, {
            allowedMargins: ALLOWED_MARGINS,
            maxItemLinks: ITEM_LINKS_MAX_COUNT,
            unassignedOwnerId: UNASSIGNED_OWNER_ID,
            isValidTeamOwnerId,
            parseNumber,
            roundMoney,
            calculateShipping,
            calculateSalePrice,
            calculateRemaining
        });
    }
    return null;
}
function isValidTeamOwnerId(ownerId) {
    return teamMembers.some((member) => member.id === ownerId);
}

function normalizeShippingType(value) {
    if (typeof orderNormalization.normalizeShippingType === "function") {
        return orderNormalization.normalizeShippingType(value);
    }
    return "air";
}

function validateItemLinks(links) {
    if (typeof orderNormalization.validateItemLinks === "function") {
        return orderNormalization.validateItemLinks(links, {
            maxCount: ITEM_LINKS_MAX_COUNT,
            parseHttpUrl
        });
    }
    return "Each item link must be a valid URL (http/https).";
}

function normalizeItemLinks(value) {
    if (typeof orderNormalization.normalizeItemLinks === "function") {
        return orderNormalization.normalizeItemLinks(value, ITEM_LINKS_MAX_COUNT);
    }
    return [];
}

function normalizeEmailInput(value) {
    if (typeof formatters.normalizeEmailInput === "function") {
        return formatters.normalizeEmailInput(value);
    }
    return String(value || "").trim().toLowerCase();
}

function isValidEmailFormat(value) {
    if (typeof formatters.isValidEmailFormat === "function") {
        return formatters.isValidEmailFormat(value);
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function getTeamEmailValidationError(emailValue) {
    if (typeof teamSettingsHelpers.getTeamEmailValidationError === "function") {
        return teamSettingsHelpers.getTeamEmailValidationError(emailValue, isValidEmailFormat);
    }
    return "";
}

function normalizeHttpUrl(value) {
    if (typeof formatters.normalizeHttpUrl === "function") {
        return formatters.normalizeHttpUrl(value);
    }
    return "";
}

function parseHttpUrl(value) {
    if (typeof formatters.parseHttpUrl === "function") {
        return formatters.parseHttpUrl(value);
    }
    return null;
}

function extractLinkHostLabel(urlValue) {
    if (typeof formatters.extractLinkHostLabel === "function") {
        return formatters.extractLinkHostLabel(urlValue);
    }
    return "Link";
}

function formatLinkDisplayLabel(urlValue) {
    if (typeof formatters.formatLinkDisplayLabel === "function") {
        return formatters.formatLinkDisplayLabel(urlValue, 55);
    }
    return String(urlValue || "").trim();
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

function getCurrentMonthKey() {
    if (typeof formatters.getCurrentMonthKey === "function") {
        return formatters.getCurrentMonthKey();
    }
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${month}`;
}

function getTodayIso() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

function formatDateNl(isoDate) {
    if (typeof formatters.formatDateNl === "function") {
        return formatters.formatDateNl(isoDate);
    }
    return "-";
}

function formatCurrency(value) {
    if (typeof formatters.formatCurrency === "function") {
        return formatters.formatCurrency(value);
    }
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
    if (typeof formatters.toAbsoluteUrl === "function") {
        return formatters.toAbsoluteUrl(path, window.location.href);
    }
    return String(path || "").trim();
}

function getInitials(name) {
    if (typeof formatters.getInitials === "function") {
        return formatters.getInitials(name);
    }
    return "NA";
}

function escapeHtml(value) {
    if (typeof formatters.escapeHtml === "function") {
        return formatters.escapeHtml(value);
    }
    return String(value);
}

function cssEscape(value) {
    if (typeof formatters.cssEscape === "function") {
        return formatters.cssEscape(value);
    }
    return String(value);
}




