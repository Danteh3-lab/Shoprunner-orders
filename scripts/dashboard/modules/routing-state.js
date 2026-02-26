(function (global) {
    "use strict";

    function normalizeActivePage(value, pages) {
        return value === pages.PAGE_OWNER_PERFORMANCE ? pages.PAGE_OWNER_PERFORMANCE : pages.PAGE_ORDERS;
    }

    function normalizePerformancePeriod(value, periods) {
        if (value === periods.PERFORMANCE_PERIOD_LAST_30) {
            return periods.PERFORMANCE_PERIOD_LAST_30;
        }
        if (value === periods.PERFORMANCE_PERIOD_MONTH) {
            return periods.PERFORMANCE_PERIOD_MONTH;
        }
        if (value === periods.PERFORMANCE_PERIOD_ALL) {
            return periods.PERFORMANCE_PERIOD_ALL;
        }
        return periods.PERFORMANCE_PERIOD_THIS_MONTH;
    }

    function parseDashboardHash(hashValue, options) {
        const rawHash = String(hashValue || "").trim();
        const pageValues = options.pages;
        const periodValues = options.periods;
        const normalizeMonthKey = options.normalizeMonthKey;
        const defaultMonth = normalizeMonthKey(options.defaultMonth);

        if (!rawHash) {
            return {
                page: pageValues.PAGE_ORDERS,
                period: periodValues.PERFORMANCE_PERIOD_THIS_MONTH,
                month: defaultMonth
            };
        }

        const hashWithoutPrefix = rawHash.replace(/^#/, "");
        const queryIndex = hashWithoutPrefix.indexOf("?");
        const pagePart = queryIndex >= 0 ? hashWithoutPrefix.slice(0, queryIndex) : hashWithoutPrefix;
        const queryPart = queryIndex >= 0 ? hashWithoutPrefix.slice(queryIndex + 1) : "";
        const page = normalizeActivePage(pagePart, pageValues);

        if (page !== pageValues.PAGE_OWNER_PERFORMANCE) {
            return {
                page,
                period: normalizePerformancePeriod(options.currentPeriod, periodValues),
                month: normalizeMonthKey(options.currentMonth)
            };
        }

        const params = new URLSearchParams(queryPart);
        return {
            page,
            period: normalizePerformancePeriod(params.get("period"), periodValues),
            month: normalizeMonthKey(params.get("month"))
        };
    }

    function buildDashboardHash(options) {
        const pageValues = options.pages;
        const periodValues = options.periods;
        const normalizeMonthKey = options.normalizeMonthKey;
        const page = normalizeActivePage(options.page, pageValues);

        if (page !== pageValues.PAGE_OWNER_PERFORMANCE) {
            return `#${pageValues.PAGE_ORDERS}`;
        }

        const params = new URLSearchParams();
        const period = normalizePerformancePeriod(options.period, periodValues);
        params.set("period", period);
        if (period === periodValues.PERFORMANCE_PERIOD_MONTH) {
            params.set("month", normalizeMonthKey(options.month));
        }

        return `#${pageValues.PAGE_OWNER_PERFORMANCE}?${params.toString()}`;
    }

    const api = {
        normalizeActivePage,
        normalizePerformancePeriod,
        parseDashboardHash,
        buildDashboardHash
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerRoutingState = Object.assign({}, global.shoprunnerRoutingState || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
