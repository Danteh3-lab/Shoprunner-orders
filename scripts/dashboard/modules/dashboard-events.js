(function (global) {
    "use strict";

    function bindDashboardEvents(deps) {
        const elements = deps.elements || {};
        const handlers = deps.handlers || {};
        const state = deps.state || {};
        const disposers = [];

        function listen(target, type, handler, options) {
            if (!target || typeof target.addEventListener !== "function" || typeof handler !== "function") {
                return;
            }
            target.addEventListener(type, handler, options);
            disposers.push(() => {
                target.removeEventListener(type, handler, options);
            });
        }

        function listenMany(targets, type, handler, options) {
            if (!targets || typeof handler !== "function") {
                return;
            }
            Array.from(targets).forEach((target) => listen(target, type, handler, options));
        }

        listen(elements.newOrderBtn, "click", handlers.openCreateModal);
        listen(elements.cancelOrderBtn, "click", handlers.closeOrderModal);
        listen(elements.deleteOrderBtn, "click", handlers.handleDeleteFromModal);
        listen(elements.generateInvoiceBtn, "click", handlers.handleGenerateInvoiceFromModal);
        listen(elements.openTeamSettingsBtn, "click", (event) => {
            event.preventDefault();
            handlers.openTeamModal();
        });
        listen(elements.openOrdersBtn, "click", (event) => {
            event.preventDefault();
            handlers.openOrdersPage();
        });
        listen(elements.openOwnerPerformanceBtn, "click", (event) => {
            event.preventDefault();
            handlers.openOwnerPerformancePage();
        });
        listen(global, "hashchange", handlers.handleHashChange);
        listen(elements.openChangelogBtn, "click", (event) => {
            event.preventDefault();
            handlers.openChangelogModal();
        });
        listen(elements.notificationBtn, "click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            handlers.toggleNotificationPanel();
        });

        listenMany(elements.closeOrderModalNodes, "click", handlers.closeOrderModal);
        listenMany(elements.closeTeamModalNodes, "click", handlers.closeTeamModal);
        listenMany(elements.closeOrderLinksModalNodes, "click", handlers.closeOrderLinksModal);
        listenMany(elements.closeChangelogModalNodes, "click", handlers.closeChangelogModal);

        listen(document, "keydown", (event) => {
            if (event.key !== "Escape") {
                return;
            }

            if (state.isNotificationPanelOpen && state.isNotificationPanelOpen()) {
                handlers.closeNotificationPanel();
                return;
            }
            if (state.isOrderLinksModalOpen && state.isOrderLinksModalOpen()) {
                handlers.closeOrderLinksModal();
                return;
            }
            if (state.isChangelogModalOpen && state.isChangelogModalOpen()) {
                handlers.closeChangelogModal();
                return;
            }
            if (state.isTeamModalOpen && state.isTeamModalOpen()) {
                handlers.closeTeamModal();
                return;
            }
            if (state.isOrderModalOpen && state.isOrderModalOpen()) {
                handlers.closeOrderModal();
            }
        });

        listen(document, "click", (event) => {
            if (!state.isNotificationPanelOpen || !state.isNotificationPanelOpen()) {
                return;
            }
            const target = event.target;
            if (!elements.notificationPanel || !elements.notificationBtn) {
                return;
            }
            if (elements.notificationPanel.contains(target) || elements.notificationBtn.contains(target)) {
                return;
            }
            handlers.closeNotificationPanel();
        });

        listen(elements.notificationList, "click", (event) => {
            const action = event.target.closest("[data-notification-order-id]");
            if (!action) {
                return;
            }
            const orderId = String(action.dataset.notificationOrderId || "").trim();
            if (!orderId) {
                return;
            }
            handlers.openNotificationOrder(orderId);
        });

        listen(elements.ordersBody, "click", async (event) => {
            await handlers.handleOrderActionEvent(event);
        });
        listen(elements.ordersGrid, "click", async (event) => {
            await handlers.handleOrderActionEvent(event);
        });

        listen(elements.ordersBody, "dblclick", (event) => {
            const ignoredTarget = event.target.closest(".status-toggle, input[type='checkbox'], .action-btn, .col-actions");
            if (ignoredTarget) {
                return;
            }
            const row = event.target.closest("tr[data-order-id]");
            if (!row || !row.dataset.orderId) {
                return;
            }
            handlers.openEditModal(row.dataset.orderId);
        });

        listen(elements.ownerFilterSelect, "change", handlers.handleOwnerFilterChange);
        listen(elements.ordersSearchInput, "input", handlers.handleOrdersSearchInput);
        listen(elements.dateRangeSelect, "change", handlers.handleDateRangeChange);
        listen(elements.ordersViewListBtn, "click", handlers.showListView);
        listen(elements.ordersViewGridBtn, "click", handlers.showGridView);
        listen(elements.ownerPerformancePeriodSelect, "change", handlers.handlePerformancePeriodChange);
        listen(elements.ownerPerformanceMonthInput, "change", handlers.handlePerformanceMonthChange);
        listen(elements.paginationPrevBtn, "click", handlers.goToPreviousPage);
        listen(elements.paginationNextBtn, "click", handlers.goToNextPage);
        listen(elements.paginationPages, "click", handlers.handlePaginationClick);
        listen(elements.orderForm, "input", handlers.handleOrderFormInput);
        listen(elements.orderForm, "change", handlers.handleOrderFormChange);
        listen(elements.addItemLinkBtn, "click", handlers.handleAddItemLink);
        listen(elements.itemLinkInput, "keydown", (event) => {
            if (event.key !== "Enter") {
                return;
            }
            event.preventDefault();
            handlers.handleAddItemLink();
        });
        listen(elements.itemLinksPreview, "click", (event) => {
            const removeButton = event.target.closest("[data-remove-link-index]");
            if (!removeButton) {
                return;
            }
            const index = Number.parseInt(removeButton.dataset.removeLinkIndex || "", 10);
            if (!Number.isInteger(index)) {
                return;
            }
            handlers.removeItemLinkByIndex(index);
        });

        listen(elements.orderForm, "submit", async (event) => {
            event.preventDefault();
            await handlers.submitForm();
        });

        listen(elements.teamAddForm, "submit", async (event) => {
            event.preventDefault();
            await handlers.addTeamMember();
        });

        listen(elements.teamMembersList, "click", async (event) => {
            const actionNode = event.target.closest("[data-team-action]");
            if (!actionNode) {
                return;
            }
            const action = String(actionNode.dataset.teamAction || "").trim();
            const memberId = String(actionNode.dataset.memberId || "").trim();
            if (!action || !memberId) {
                return;
            }
            await handlers.handleTeamListAction({
                action,
                memberId,
                listElement: elements.teamMembersList
            });
        });

        return function unbind() {
            while (disposers.length) {
                const dispose = disposers.pop();
                try {
                    dispose();
                } catch (error) {
                    // Ignore listener cleanup issues.
                }
            }
        };
    }

    const api = {
        bindDashboardEvents
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerDashboardEvents = Object.assign({}, global.shoprunnerDashboardEvents || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
