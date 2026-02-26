(function (global) {
    "use strict";

    function parseNumber(value) {
        const numeric = Number.parseFloat(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }

    function roundMoney(value) {
        const numeric = parseNumber(value);
        return Math.round((numeric + Number.EPSILON) * 100) / 100;
    }

    function formatCurrency(value) {
        return `$${roundMoney(value).toFixed(2)}`;
    }

    function parseIsoDate(value) {
        const raw = String(value || "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return null;
        }
        const parts = raw.split("-").map((part) => Number.parseInt(part, 10));
        const [year, month, day] = parts;
        const parsed = new Date(year, month - 1, day);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }

    function formatDateIso(value) {
        if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
            return "";
        }
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function formatDateNl(isoDate) {
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
            return "-";
        }
        const [year, month, day] = String(isoDate).split("-");
        return `${day}-${month}-${year}`;
    }

    function getCurrentMonthKey() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        return `${now.getFullYear()}-${month}`;
    }

    function normalizeMonthKey(value) {
        const raw = String(value || "").trim();
        if (!/^\d{4}-\d{2}$/.test(raw)) {
            return getCurrentMonthKey();
        }

        const [yearPart, monthPart] = raw.split("-");
        const year = Number.parseInt(yearPart, 10);
        const month = Number.parseInt(monthPart, 10);
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
            return getCurrentMonthKey();
        }

        return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    }

    function normalizeEmailInput(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isValidEmailFormat(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
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

    function normalizeHttpUrl(value) {
        const parsed = parseHttpUrl(value);
        return parsed ? parsed.href : "";
    }

    function extractLinkHostLabel(urlValue) {
        try {
            const parsed = new URL(String(urlValue || "").trim());
            return parsed.host || "Link";
        } catch (error) {
            return "Link";
        }
    }

    function formatLinkDisplayLabel(urlValue, maxLength) {
        const limit = Number.isFinite(maxLength) ? Math.max(10, Math.trunc(maxLength)) : 55;
        const parsed = parseHttpUrl(urlValue);
        if (!parsed) {
            return String(urlValue || "").trim();
        }

        const path = parsed.pathname === "/" ? "" : parsed.pathname;
        const suffix = `${path}${parsed.search || ""}`;
        const combined = `${parsed.host}${suffix}`;
        if (combined.length <= limit) {
            return combined;
        }

        return `${combined.slice(0, limit - 3)}...`;
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

    function hexToRgba(hexColor, alpha) {
        const clean = String(hexColor || "").trim().replace("#", "");
        if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
            return `rgba(37, 99, 235, ${alpha})`;
        }
        const red = Number.parseInt(clean.slice(0, 2), 16);
        const green = Number.parseInt(clean.slice(2, 4), 16);
        const blue = Number.parseInt(clean.slice(4, 6), 16);
        return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }

    function toAbsoluteUrl(path, baseHref) {
        const raw = String(path || "").trim();
        if (!raw) {
            return "";
        }
        try {
            const base = String(baseHref || "").trim() || (global.location ? global.location.href : "http://localhost");
            return new URL(raw, base).href;
        } catch (error) {
            return raw;
        }
    }

    const api = {
        parseNumber,
        roundMoney,
        formatCurrency,
        parseIsoDate,
        formatDateIso,
        formatDateNl,
        getCurrentMonthKey,
        normalizeMonthKey,
        normalizeEmailInput,
        isValidEmailFormat,
        parseHttpUrl,
        normalizeHttpUrl,
        extractLinkHostLabel,
        formatLinkDisplayLabel,
        getInitials,
        escapeHtml,
        cssEscape,
        hexToRgba,
        toAbsoluteUrl
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerFormatters = Object.assign({}, global.shoprunnerFormatters || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
