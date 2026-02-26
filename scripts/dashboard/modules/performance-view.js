(function (global) {
    "use strict";

    function isProfitEligible(order, options) {
        if (!order || order.paid !== true || order.arrived !== true) {
            return false;
        }
        if (!order.ownerId || order.ownerId === options.unassignedOwnerId) {
            return false;
        }
        return Boolean(options.getOwnerById(order.ownerId));
    }

    function computeOrderProfit(order, roundMoney) {
        return roundMoney(order.salePrice - order.purchasePrice - order.shippingCost);
    }

    function buildDailyDateLabels(startDate, endDate, formatDateIso) {
        const labels = [];
        const cursor = new Date(startDate);
        cursor.setHours(0, 0, 0, 0);

        while (cursor.getTime() <= endDate.getTime()) {
            labels.push(formatDateIso(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        return labels;
    }

    function getPerformanceDateRange(period, eligibleOrders, selectedMonth, options) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = null;
        let endDate = new Date(today);

        if (period === options.periods.PERFORMANCE_PERIOD_THIS_MONTH) {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (period === options.periods.PERFORMANCE_PERIOD_LAST_30) {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29);
        } else if (period === options.periods.PERFORMANCE_PERIOD_MONTH) {
            const monthKey = options.normalizeMonthKey(selectedMonth);
            const [yearPart, monthPart] = monthKey.split("-");
            const year = Number.parseInt(yearPart, 10);
            const month = Number.parseInt(monthPart, 10);
            startDate = new Date(year, month - 1, 1);
            const endOfMonth = new Date(year, month, 0);
            const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
            endDate = isCurrentMonth ? new Date(today) : endOfMonth;
        } else {
            const parsedDates = eligibleOrders
                .map((order) => options.parseIsoDate(order.orderDate))
                .filter((date) => date !== null)
                .sort((a, b) => a.getTime() - b.getTime());

            if (!parsedDates.length) {
                return null;
            }

            startDate = new Date(parsedDates[0]);
            endDate = new Date(parsedDates[parsedDates.length - 1]);
        }

        if (!startDate || startDate.getTime() > endDate.getTime()) {
            return null;
        }

        return {
            startDate,
            endDate,
            labels: buildDailyDateLabels(startDate, endDate, options.formatDateIso)
        };
    }

    function isOrderDateWithinRange(orderDate, startDate, endDate, parseIsoDate) {
        const parsed = parseIsoDate(orderDate);
        if (!parsed) {
            return false;
        }
        return parsed.getTime() >= startDate.getTime() && parsed.getTime() <= endDate.getTime();
    }

    function aggregateOwnerPerformanceByDay(items, dateLabels, options) {
        const labelIndexByDate = new Map(dateLabels.map((label, index) => [label, index]));
        const byOwner = new Map();

        for (const order of items) {
            const owner = options.getOwnerById(order.ownerId);
            if (!owner) {
                continue;
            }

            const dateValue = options.parseIsoDate(order.orderDate);
            const dateKey = options.formatDateIso(dateValue);
            if (!dateKey || !labelIndexByDate.has(dateKey)) {
                continue;
            }

            const ownerKey = owner.id;
            if (!byOwner.has(ownerKey)) {
                byOwner.set(ownerKey, {
                    ownerId: owner.id,
                    ownerName: owner.name,
                    dailyProfits: Array.from({ length: dateLabels.length }, () => 0),
                    totalProfit: 0,
                    orderCount: 0,
                    avgProfit: 0
                });
            }

            const entry = byOwner.get(ownerKey);
            const pointIndex = labelIndexByDate.get(dateKey);
            const profit = computeOrderProfit(order, options.roundMoney);
            entry.dailyProfits[pointIndex] = options.roundMoney(entry.dailyProfits[pointIndex] + profit);
            entry.totalProfit = options.roundMoney(entry.totalProfit + profit);
            entry.orderCount += 1;
            entry.avgProfit = entry.orderCount > 0 ? options.roundMoney(entry.totalProfit / entry.orderCount) : 0;
        }

        return Array.from(byOwner.values()).sort((a, b) => {
            if (b.totalProfit !== a.totalProfit) {
                return b.totalProfit - a.totalProfit;
            }
            return a.ownerName.localeCompare(b.ownerName);
        });
    }

    const api = {
        isProfitEligible,
        computeOrderProfit,
        getPerformanceDateRange,
        isOrderDateWithinRange,
        aggregateOwnerPerformanceByDay
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerPerformanceView = Object.assign({}, global.shoprunnerPerformanceView || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
