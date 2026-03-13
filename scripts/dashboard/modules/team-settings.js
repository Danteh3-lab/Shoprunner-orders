(function (global) {
    "use strict";

    function normalizeTeamMemberName(value) {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
    }

    function findDuplicateTeamMemberName(nameValue, members, excludeId) {
        const normalizedName = normalizeTeamMemberName(nameValue);
        if (!normalizedName) {
            return null;
        }

        const list = Array.isArray(members) ? members : [];
        const skippedId = String(excludeId || "").trim();

        for (const member of list) {
            if (!member || typeof member !== "object") {
                continue;
            }
            if (skippedId && String(member.id || "").trim() === skippedId) {
                continue;
            }
            if (normalizeTeamMemberName(member.name) === normalizedName) {
                return member;
            }
        }

        return null;
    }

    function getTeamEmailValidationError(emailValue, isValidEmailFormat) {
        if (!emailValue) {
            return "";
        }
        if (!isValidEmailFormat(emailValue)) {
            return "Email must be valid when provided.";
        }
        return "";
    }

    const api = {
        normalizeTeamMemberName,
        findDuplicateTeamMemberName,
        getTeamEmailValidationError
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerTeamSettings = Object.assign({}, global.shoprunnerTeamSettings || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
