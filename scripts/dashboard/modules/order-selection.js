(function (global) {
    "use strict";

    function normalizeId(value) {
        return String(value === null || value === undefined ? "" : value).trim();
    }

    function toIdSet(selectedIds) {
        if (selectedIds instanceof Set) {
            return new Set(Array.from(selectedIds).map(normalizeId).filter(Boolean));
        }
        return new Set(Array.from(selectedIds || []).map(normalizeId).filter(Boolean));
    }

    function toggleSelection(selectedIds, orderId, isSelected) {
        const next = toIdSet(selectedIds);
        const normalizedId = normalizeId(orderId);
        if (!normalizedId) {
            return next;
        }
        if (isSelected) {
            next.add(normalizedId);
        } else {
            next.delete(normalizedId);
        }
        return next;
    }

    function togglePageSelection(selectedIds, pageItems, isSelected) {
        const next = toIdSet(selectedIds);
        (pageItems || []).forEach((item) => {
            const normalizedId = normalizeId(item && item.id);
            if (!normalizedId) {
                return;
            }
            if (isSelected) {
                next.add(normalizedId);
            } else {
                next.delete(normalizedId);
            }
        });
        return next;
    }

    function pruneToPage(selectedIds, pageItems) {
        const pageIds = new Set((pageItems || []).map((item) => normalizeId(item && item.id)).filter(Boolean));
        return new Set(Array.from(toIdSet(selectedIds)).filter((id) => pageIds.has(id)));
    }

    function getPageSelectionState(selectedIds, pageItems) {
        const pageIds = (pageItems || []).map((item) => normalizeId(item && item.id)).filter(Boolean);
        const selectedPageCount = pageIds.filter((id) => toIdSet(selectedIds).has(id)).length;
        return {
            pageCount: pageIds.length,
            selectedPageCount,
            allSelected: pageIds.length > 0 && selectedPageCount === pageIds.length,
            someSelected: selectedPageCount > 0 && selectedPageCount < pageIds.length
        };
    }

    const api = {
        normalizeId,
        toggleSelection,
        togglePageSelection,
        pruneToPage,
        getPageSelectionState
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerOrderSelection = Object.assign({}, global.shoprunnerOrderSelection || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
