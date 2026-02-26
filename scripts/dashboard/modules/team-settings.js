(function (global) {
    "use strict";

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
        getTeamEmailValidationError
    };

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
    global.shoprunnerTeamSettings = Object.assign({}, global.shoprunnerTeamSettings || {}, api);
})(typeof window !== "undefined" ? window : globalThis);
