(function (global) {
    "use strict";

    function normalizeDateRange(value, constants) {
        if (value === constants.DATE_RANGE_THIS_MONTH) {
            return constants.DATE_RANGE_THIS_MONTH;
        }
        if (value === constants.DATE_RANGE_MONTH) {
            return constants.DATE_RANGE_MONTH;
        }
        if (value === constants.DATE_RANGE_ALL) {
            return constants.DATE_RANGE_ALL;
        }
        return constants.DATE_RANGE_LAST_30;
    }

    function applyOwnerFilter(items, selectedOwnerFilter, constants) {
        if (selectedOwnerFilter === constants.OWNER_FILTER_ALL) {
            return items;
        }
        if (selectedOwnerFilter === constants.UNASSIGNED_OWNER_ID) {
            return items.filter((order) => order.ownerId === constants.UNASSIGNED_OWNER_ID);
        }
        return items.filter((order) => order.ownerId === selectedOwnerFilter);
    }

    function applySearchFilter(items, searchQuery) {
        if (!searchQuery) {
            return items;
        }
        const query = String(searchQuery || "").toLowerCase();
        return items.filter((order) => {
            const customer = String(order.customerName || "").toLowerCase();
            const item = String(order.itemName || "").toLowerCase();
            return customer.includes(query) || item.includes(query);
        });
    }

    function applyDateRangeFilter(items, selectedDateRange, selectedMonth, constants, parseIsoDate, normalizeMonthKey) {
        const selectedRange = normalizeDateRange(selectedDateRange, constants);
        if (selectedRange === constants.DATE_RANGE_ALL) {
            return items;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (selectedRange === constants.DATE_RANGE_THIS_MONTH) {
            const currentMonth = today.getMonth();
            const currentYear = today.getFullYear();
            return items.filter((order) => {
                const orderDate = parseIsoDate(order.orderDate);
                return orderDate && orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
            });
        }

        if (selectedRange === constants.DATE_RANGE_MONTH) {
            const monthKey = normalizeMonthKey(selectedMonth);
            const [yearPart, monthPart] = monthKey.split("-");
            const year = Number.parseInt(yearPart, 10);
            const month = Number.parseInt(monthPart, 10);
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            return items.filter((order) => {
                const orderDate = parseIsoDate(order.orderDate);
                return orderDate && orderDate >= startDate && orderDate <= endDate;
            });
        }

        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 29);
        return items.filter((order) => {
            const orderDate = parseIsoDate(order.orderDate);
            return orderDate && orderDate >= startDate && orderDate <= today;
        });
    }

    function getFilteredSortedOrders(items, options) {
        const constants = options.constants;
        const ownerFiltered = applyOwnerFilter(items, options.selectedOwnerFilter, constants);
        const searchFiltered = applySearchFilter(ownerFiltered, options.searchQuery);
        const dateFiltered = applyDateRangeFilter(
            searchFiltered,
            options.selectedDateRange,
            options.selectedMonth,
            constants,
            options.parseIsoDate,
            options.normalizeMonthKey
        );

        return dateFiltered.slice().sort((a, b) => Date.parse(b.createdAt || "") - Date.parse(a.createdAt || ""));
    }

    function getEmptyStateMessage(options) {
        if (options.searchQuery) {
            return "Geen orders gevonden voor deze zoekopdracht.";
        }

        if (options.selectedOwnerFilter !== options.constants.OWNER_FILTER_ALL) {
            return "No orders found for the selected owner.";
        }

        const selectedRange = normalizeDateRange(options.selectedDateRange, options.constants);
        if (selectedRange === options.constants.DATE_RANGE_THIS_MONTH) {
            return "No orders found for this month.";
        }

        if (selectedRange === options.constants.DATE_RANGE_MONTH) {
            return "No orders found for this month.";
        }

        if (selectedRange === options.constants.DATE_RANGE_ALL) {
            return "No orders found.";
        }

        return "No orders found for the past 30 days.";
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

    const api = {
        normalizeDateRange,
        applyOwnerFilter,
        applySearchFilter,
        applyDateRangeFilter,
        getFilteredSortedOrders,
        getEmptyStateMessage,
        paginateItems,
        buildPaginationItems
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerOrdersView = Object.assign({}, global.shoprunnerOrdersView || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
